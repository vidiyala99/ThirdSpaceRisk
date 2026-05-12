"""Operator proposes → broker decides. The decision-capture layer.

Sits downstream of `claim_recommendation.py` (which produces the EV-math
verdict) and mirrors the audit shape of `packet_core.record_review_decision`
(the broker's review of a packet) for the parallel decision an operator makes
about the claim recommender's verdict.

Two functions, both pure (session-in / record-out), both emit AuditEvent rows:

    create_proposal(...)         operator initiates; raises on validation gap
    record_broker_decision(...)  broker approves/rejects; raises on bad input

Validation rules:
    - override_recommendation=True requires a structured override_reason
    - override_reason='other' additionally requires override_freetext
    - structured reasons must be one of the 4 vocab tags below
    - broker decisions must be 'approved' or 'rejected'
    - a proposal can only be decided once (state must be pending_broker_review)

The state machine itself lives on `ClaimProposal.state`; this module is the
only writer.
"""

from dataclasses import dataclass, field
from datetime import datetime
from uuid import uuid4

from sqlmodel import Session, select

from app.models import AuditEvent, ClaimProposal, UnderwritingPacket


# Fixed vocabulary for structured override reasons. Keeping this tight (4 tags)
# is intentional — every new reason is a UX decision, not a backend concern.
# `other` is the escape hatch that requires freetext to balance flexibility
# against the friction we want operators to feel when disagreeing with the
# recommender.
ALLOWED_OVERRIDE_REASONS: frozenset[str] = frozenset(
    {"additional_evidence", "legal_counsel", "prior_pattern", "other"}
)

# Broker decision vocabulary. `filed_with_carrier` is a downstream transition
# (post-approval) that the carrier-integration phase will own; it is not a
# valid input here.
ALLOWED_BROKER_DECISIONS: frozenset[str] = frozenset({"approved", "rejected"})


class ClaimProposalValidationError(ValueError):
    """Raised when proposal creation or broker decision fails validation.

    Subclasses ValueError so existing handlers that catch ValueError still work
    if anything upstream re-raises generically.
    """
    pass


def create_proposal(
    *,
    session: Session,
    packet_id: str,
    operator_id: str,
    override_recommendation: bool,
    override_reason: str | None,
    override_freetext: str | None,
) -> ClaimProposal:
    """Persist an operator's claim proposal against a packet.

    Returns the persisted ClaimProposal (state='pending_broker_review'). Raises
    ClaimProposalValidationError on bad input.
    """
    if override_recommendation:
        if not override_reason:
            raise ClaimProposalValidationError(
                "override_reason is required when overriding the recommendation"
            )
        if override_reason not in ALLOWED_OVERRIDE_REASONS:
            raise ClaimProposalValidationError(
                f"override_reason must be one of {sorted(ALLOWED_OVERRIDE_REASONS)}"
            )
        if override_reason == "other" and not (override_freetext and override_freetext.strip()):
            raise ClaimProposalValidationError(
                "override_freetext is required when override_reason is 'other'"
            )

    packet = session.get(UnderwritingPacket, packet_id)
    if packet is None:
        raise ClaimProposalValidationError(f"Packet not found: {packet_id}")

    proposal = ClaimProposal(
        id=f"prop-{uuid4().hex[:12]}",
        packet_id=packet_id,
        venue_id=packet.venue_id,
        proposed_by=operator_id,
        override_recommendation=override_recommendation,
        override_reason=override_reason,
        override_freetext=override_freetext,
        state="pending_broker_review",
    )
    session.add(proposal)
    _add_audit_event(
        session=session,
        actor_id=operator_id,
        actor_type="venue_operator",
        entity_id=proposal.id,
        event_type="claim.proposed",
        event_metadata={
            "packet_id": packet_id,
            "venue_id": packet.venue_id,
            "override_recommendation": override_recommendation,
            "override_reason": override_reason,
        },
    )
    session.commit()
    session.refresh(proposal)
    return proposal


def record_broker_decision(
    *,
    session: Session,
    proposal_id: str,
    broker_id: str,
    decision: str,
    notes: str | None,
) -> ClaimProposal:
    """Apply a broker's approve/reject decision to a pending proposal.

    Raises ClaimProposalValidationError if the decision is unknown, the
    proposal doesn't exist, or it has already been decided.
    """
    normalized = decision.lower()
    if normalized not in ALLOWED_BROKER_DECISIONS:
        raise ClaimProposalValidationError(
            f"decision must be one of {sorted(ALLOWED_BROKER_DECISIONS)}"
        )

    proposal = session.get(ClaimProposal, proposal_id)
    if proposal is None:
        raise ClaimProposalValidationError(f"Proposal not found: {proposal_id}")

    if proposal.state != "pending_broker_review":
        raise ClaimProposalValidationError(
            f"Proposal {proposal_id} already decided (state={proposal.state})"
        )

    proposal.state = "approved" if normalized == "approved" else "rejected_by_broker"
    proposal.broker_decided_by = broker_id
    proposal.broker_decided_at = datetime.utcnow()
    proposal.broker_notes = notes
    session.add(proposal)
    _add_audit_event(
        session=session,
        actor_id=broker_id,
        actor_type="broker",
        entity_id=proposal.id,
        event_type=f"claim.{normalized}",
        event_metadata={
            "packet_id": proposal.packet_id,
            "venue_id": proposal.venue_id,
            "notes": notes,
        },
    )
    session.commit()
    session.refresh(proposal)
    return proposal


def _add_audit_event(
    *,
    session: Session,
    actor_id: str,
    actor_type: str,
    entity_id: str,
    event_type: str,
    event_metadata: dict,
) -> None:
    session.add(
        AuditEvent(
            id=f"aud-{uuid4().hex[:12]}",
            actor_id=actor_id,
            actor_type=actor_type,
            entity_type="claim_proposal",
            entity_id=entity_id,
            event_type=event_type,
            event_metadata=event_metadata,
        )
    )


# Terminal states grouped by what they say about the operator's judgment.
# Anything in APPROVED_STATES means the operator's proposal was accepted by
# the broker (and, eventually, the carrier). Anything in REJECTED_STATES
# means the proposal was killed. PENDING_STATE is in flight.
APPROVED_STATES: frozenset[str] = frozenset(
    {"approved", "filed_with_carrier", "paid"}
)
REJECTED_STATES: frozenset[str] = frozenset({"rejected_by_broker", "denied"})
PENDING_STATE = "pending_broker_review"


@dataclass(frozen=True)
class OverrideStats:
    """Aggregate signal about operator overrides of the AI claim recommender.

    The headline metric is `override_right_rate`: of the override proposals
    that have been decided, what fraction the broker approved. The baseline
    `non_override_right_rate` is the comparison point — if overrides are
    approved at a similar rate to recommender-supported proposals, operators
    are well-calibrated; if much lower, operators are noisy and the override
    path needs more friction.

    `by_reason` is the actionable breakdown: it tells the broker which
    override reasons (legal_counsel, additional_evidence, prior_pattern,
    other) are pulling their weight per venue.
    """
    override_total: int
    override_approved: int
    override_rejected: int
    override_pending: int
    override_right_rate: float | None
    non_override_total: int
    non_override_approved: int
    non_override_rejected: int
    non_override_pending: int
    non_override_right_rate: float | None
    by_reason: dict[str, dict[str, int]] = field(default_factory=dict)


def compute_override_stats(
    *,
    session: Session,
    venue_id: str | None = None,
) -> OverrideStats:
    """Aggregate claim-proposal outcomes into override-accuracy stats.

    Pure function: queries ClaimProposal once (optionally filtered to one
    venue), then folds in Python. No mutation, no commit, no audit events —
    this is a read-only view.

    Args:
        session: open SQLModel Session.
        venue_id: optional venue filter. When None, aggregates across all
            venues (broker portfolio view); when set, scopes to that one
            venue (broker drill-in on /risk-profile/[venueId]).

    Returns:
        OverrideStats. `*_right_rate` is `None` (not 0.0) when nothing has
        been decided yet — distinguishes "no signal" from "0% accuracy".
    """
    statement = select(ClaimProposal)
    if venue_id is not None:
        statement = statement.where(ClaimProposal.venue_id == venue_id)
    proposals = session.exec(statement).all()

    override_approved = override_rejected = override_pending = 0
    non_override_approved = non_override_rejected = non_override_pending = 0
    by_reason: dict[str, dict[str, int]] = {}

    for p in proposals:
        bucket = _classify_state(p.state)
        if p.override_recommendation:
            if bucket == "approved":
                override_approved += 1
            elif bucket == "rejected":
                override_rejected += 1
            else:
                override_pending += 1
            # Per-reason breakdown only meaningful for overrides — non-override
            # proposals don't carry a reason.
            reason = p.override_reason or "unknown"
            slot = by_reason.setdefault(
                reason, {"total": 0, "approved": 0, "rejected": 0, "pending": 0}
            )
            slot["total"] += 1
            slot[bucket] += 1
        else:
            if bucket == "approved":
                non_override_approved += 1
            elif bucket == "rejected":
                non_override_rejected += 1
            else:
                non_override_pending += 1

    return OverrideStats(
        override_total=override_approved + override_rejected + override_pending,
        override_approved=override_approved,
        override_rejected=override_rejected,
        override_pending=override_pending,
        override_right_rate=_safe_rate(override_approved, override_rejected),
        non_override_total=non_override_approved + non_override_rejected + non_override_pending,
        non_override_approved=non_override_approved,
        non_override_rejected=non_override_rejected,
        non_override_pending=non_override_pending,
        non_override_right_rate=_safe_rate(non_override_approved, non_override_rejected),
        by_reason=by_reason,
    )


def stats_to_dict(stats: OverrideStats) -> dict:
    """JSON-serializable view of OverrideStats for the HTTP layer."""
    return {
        "override_total": stats.override_total,
        "override_approved": stats.override_approved,
        "override_rejected": stats.override_rejected,
        "override_pending": stats.override_pending,
        "override_right_rate": stats.override_right_rate,
        "non_override_total": stats.non_override_total,
        "non_override_approved": stats.non_override_approved,
        "non_override_rejected": stats.non_override_rejected,
        "non_override_pending": stats.non_override_pending,
        "non_override_right_rate": stats.non_override_right_rate,
        "by_reason": stats.by_reason,
    }


def _classify_state(state: str) -> str:
    if state in APPROVED_STATES:
        return "approved"
    if state in REJECTED_STATES:
        return "rejected"
    return "pending"


def _safe_rate(approved: int, rejected: int) -> float | None:
    """approved / (approved + rejected), or None when denominator is 0.

    Returning None instead of 0.0 lets the frontend render 'no signal yet'
    distinctly from '0% accuracy' — important because the demo will have
    venues with no decided proposals at all.
    """
    decided = approved + rejected
    if decided == 0:
        return None
    return round(approved / decided, 4)
