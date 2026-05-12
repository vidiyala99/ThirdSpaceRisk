"""Tests for the override-accuracy stats computation.

These stats are the data-flywheel narrative for the platform: every operator
override of the AI claim recommender becomes labeled signal about whether the
recommender was wrong. The aggregates here surface that signal back to brokers
and venues — and are the seed data for v2 rubric calibration.

The math is pure: pass a session + optional venue_id, get back counts +
derived rates. No I/O, no LLM, deterministic.
"""

from sqlmodel import Session, SQLModel, create_engine

from app.claim_proposals import (
    OverrideStats,
    compute_override_stats,
    create_proposal,
    record_broker_decision,
)
from app.packet_core import create_packet_snapshot
from app.schemas import Citation, IncidentCreate


DEMO_INCIDENT = IncidentCreate(
    occurred_at="2026-05-02T23:13:00Z",
    location="rear bar",
    summary="Patron required EMS after altercation; police on scene.",
    reported_by="shift-lead",
    injury_observed=True,
    police_called=True,
    ems_called=True,
)


def make_session() -> Session:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    return Session(engine)


def _seed_packet(session: Session, venue_id: str = "elsewhere-brooklyn", incident_id: str | None = None):
    return create_packet_snapshot(
        session=session,
        venue_id=venue_id,
        incident_id=incident_id or f"inc-{venue_id}-{id(session) % 10000}",
        incident=DEMO_INCIDENT,
        risk_signal={"type": "altercation_event", "severity": "high", "review_status": "needs_review"},
        action_plan=[],
        claims_timeline=[],
        underwriting_memo={"summary": "x", "review_status": "draft"},
        # Venue-scoped source id so seeding multiple venues in one test
        # doesn't hit the "source belongs to a different venue" guard in
        # packet_core._validate_citation.
        citations=[Citation(source_id=f"policy-altercation-{venue_id}", source_type="policy", excerpt="Excerpt.")],
        rubric_version="demo-rubric-v1",
    )


def _propose(session: Session, packet_id: str, *, override: bool, reason: str | None = None):
    return create_proposal(
        session=session,
        packet_id=packet_id,
        operator_id="op-1",
        override_recommendation=override,
        override_reason=reason,
        override_freetext=None,
    )


def _decide(session: Session, proposal_id: str, decision: str, notes: str | None = None):
    return record_broker_decision(
        session=session,
        proposal_id=proposal_id,
        broker_id="br-1",
        decision=decision,
        notes=notes,
    )


# ---------- compute_override_stats ----------


def test_stats_on_empty_session_returns_zero_counts_and_none_rates():
    with make_session() as session:
        stats = compute_override_stats(session=session)
        assert isinstance(stats, OverrideStats)
        assert stats.override_total == 0
        assert stats.non_override_total == 0
        assert stats.override_right_rate is None
        assert stats.non_override_right_rate is None


def test_stats_count_overrides_separately_from_non_overrides():
    with make_session() as session:
        p1 = _seed_packet(session, incident_id="inc-a")
        p2 = _seed_packet(session, incident_id="inc-b")
        _propose(session, p1.id, override=True, reason="legal_counsel")
        _propose(session, p2.id, override=False)

        stats = compute_override_stats(session=session)

        assert stats.override_total == 1
        assert stats.non_override_total == 1


def test_stats_right_rate_uses_decided_proposals_only():
    """Pending proposals do not count toward right-rate denominator —
    you can't be right or wrong until the broker has decided."""
    with make_session() as session:
        # 2 overrides: 1 approved, 1 pending → right rate is 1/1 = 1.0 (not 1/2 = 0.5)
        packets = [_seed_packet(session, incident_id=f"inc-{i}") for i in range(2)]
        approved_prop = _propose(session, packets[0].id, override=True, reason="legal_counsel")
        _propose(session, packets[1].id, override=True, reason="legal_counsel")
        _decide(session, approved_prop.id, "approved")

        stats = compute_override_stats(session=session)

        assert stats.override_total == 2
        assert stats.override_approved == 1
        assert stats.override_rejected == 0
        assert stats.override_pending == 1
        assert stats.override_right_rate == 1.0


def test_stats_right_rate_handles_mixed_decisions():
    with make_session() as session:
        # 4 overrides decided: 3 approved, 1 rejected → 0.75
        packets = [_seed_packet(session, incident_id=f"inc-{i}") for i in range(4)]
        props = [_propose(session, p.id, override=True, reason="legal_counsel") for p in packets]
        _decide(session, props[0].id, "approved")
        _decide(session, props[1].id, "approved")
        _decide(session, props[2].id, "approved")
        _decide(session, props[3].id, "rejected", notes="not justified")

        stats = compute_override_stats(session=session)

        assert stats.override_total == 4
        assert stats.override_approved == 3
        assert stats.override_rejected == 1
        assert stats.override_right_rate == 0.75


def test_stats_filter_by_venue_id_excludes_other_venues():
    with make_session() as session:
        p_a = _seed_packet(session, venue_id="venue-a", incident_id="inc-a")
        p_b = _seed_packet(session, venue_id="venue-b", incident_id="inc-b")
        prop_a = _propose(session, p_a.id, override=True, reason="legal_counsel")
        prop_b = _propose(session, p_b.id, override=True, reason="legal_counsel")
        _decide(session, prop_a.id, "approved")
        _decide(session, prop_b.id, "rejected", notes="x")

        stats_a = compute_override_stats(session=session, venue_id="venue-a")
        stats_b = compute_override_stats(session=session, venue_id="venue-b")

        assert stats_a.override_total == 1
        assert stats_a.override_right_rate == 1.0
        assert stats_b.override_total == 1
        assert stats_b.override_right_rate == 0.0


def test_stats_baseline_non_override_right_rate_computes_separately():
    """The headline number is override approval rate, but the comparison
    point is non-override approval rate. They must compute independently."""
    with make_session() as session:
        packets = [_seed_packet(session, incident_id=f"inc-{i}") for i in range(4)]
        # 2 overrides: 1 approved, 1 rejected → 0.5
        ov_approved = _propose(session, packets[0].id, override=True, reason="legal_counsel")
        ov_rejected = _propose(session, packets[1].id, override=True, reason="legal_counsel")
        _decide(session, ov_approved.id, "approved")
        _decide(session, ov_rejected.id, "rejected", notes="x")
        # 2 non-overrides: both approved → 1.0
        nov_a = _propose(session, packets[2].id, override=False)
        nov_b = _propose(session, packets[3].id, override=False)
        _decide(session, nov_a.id, "approved")
        _decide(session, nov_b.id, "approved")

        stats = compute_override_stats(session=session)

        assert stats.override_right_rate == 0.5
        assert stats.non_override_right_rate == 1.0


def test_stats_with_only_pending_proposals_has_no_rate():
    """Right rate is None when nothing has been decided — avoids divide-by-zero
    and avoids displaying a misleading 0% in the UI."""
    with make_session() as session:
        p = _seed_packet(session)
        _propose(session, p.id, override=True, reason="legal_counsel")

        stats = compute_override_stats(session=session)

        assert stats.override_total == 1
        assert stats.override_pending == 1
        assert stats.override_right_rate is None


def test_stats_includes_breakdown_by_override_reason():
    """For the broker, knowing 'legal_counsel overrides get approved 90%
    but additional_evidence overrides get approved 30%' is the actionable
    signal — they can lean into the patterns that work."""
    with make_session() as session:
        packets = [_seed_packet(session, incident_id=f"inc-{i}") for i in range(4)]
        legal_a = _propose(session, packets[0].id, override=True, reason="legal_counsel")
        legal_b = _propose(session, packets[1].id, override=True, reason="legal_counsel")
        ev_a = _propose(session, packets[2].id, override=True, reason="additional_evidence")
        ev_b = _propose(session, packets[3].id, override=True, reason="additional_evidence")
        _decide(session, legal_a.id, "approved")
        _decide(session, legal_b.id, "approved")
        _decide(session, ev_a.id, "approved")
        _decide(session, ev_b.id, "rejected", notes="x")

        stats = compute_override_stats(session=session)

        # by_reason maps reason → (total, approved, rejected)
        assert stats.by_reason["legal_counsel"]["total"] == 2
        assert stats.by_reason["legal_counsel"]["approved"] == 2
        assert stats.by_reason["additional_evidence"]["total"] == 2
        assert stats.by_reason["additional_evidence"]["approved"] == 1
        assert stats.by_reason["additional_evidence"]["rejected"] == 1
