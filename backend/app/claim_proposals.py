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

from datetime import datetime
from uuid import uuid4

from sqlmodel import Session

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
