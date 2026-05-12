# ADR-0003 — Claims v1: Operator-Proposes, Broker-Decides

**Status:** Accepted · shipped 2026-05-12
**Date:** 2026-05-12
**Author:** A. Vidiyala
**Supersedes (partially):** ADR-0002 for v1 implementation; the v2 AI-neutral-drafter design in ADR-0002 is retained as the long-term target.

---

## Context

ADR-0002 designed a three-way separation: operator contributes facts, AI drafts the canonical FNOL, broker approves. The design has real integrity properties — the AI as the only party with no payout incentive eliminates both operator inflation and broker friendly-bias in one move.

Before building that five-table schema and the ClaimDrafterProvider, two things needed to be true:

1. A real broker needed to validate that the friction model (operator can't edit AI draft, only confirm/dispute yes/no questions) is acceptable in production — not just in design.
2. The recommendation surface needed to be live so brokers could calibrate their priors: "when the AI says 'file', does it mean anything in practice?"

Neither was true on 2026-05-11. The right move was to ship the **smallest demoable lifecycle** — one that proves the upstream-intervention thesis without front-loading the architectural complexity of the neutral drafter.

---

## Decision

Ship a single-table `ClaimProposal` state machine with a structured override vocabulary. Operator initiates; broker decides. The AI's role in v1 is *recommendation only*, not drafting.

```
ClaimProposal state machine:

pending_broker_review ──► approved ──► filed_with_carrier ──► paid
                      │              │                      └──► denied
                      └──► rejected_by_broker
```

### What this preserves from ADR-0002

| ADR-0002 property | How v1 honors it |
|---|---|
| Broker overrides are explained | `ClaimProposal.override_reason` required when overriding AI verdict; mirrors `ReviewDecision.override_reason` |
| All contributions attributed | `AuditEvent` rows for `claim.proposed`, `claim.approved`, `claim.rejected` |
| Audit pattern from ADR-0001 | Same pattern: actor + timestamp + entity_id, immutable records |
| `require_broker` / auth deps | Same dependencies gate broker-decision routes |

### What this deliberately defers

| ADR-0002 component | Status | Reason deferred |
|---|---|---|
| `ClaimDraft` (AI-authored FNOL) | v2 | Requires broker validation of operator friction model first |
| `ClaimFactCheck` (yes/no confirmations) | v2 | UI + data model complexity; not needed to demo the thesis |
| `OperatorClaimNote` | v2 | Bundled with ClaimDraft |
| `BrokerClaimReview` with `revise` option | v2 | v1 broker can only approve/reject, not request AI revision |
| Real carrier API integration | Phase 3 | External API; `filed_with_carrier` is a state stub in v1 |

### Override accountability: the v1 anti-inflation mechanism

ADR-0002's inflation defense is the neutral AI drafter. Without it, v1 needs a different mechanism. The solution: **friction proportional to disagreement**.

When the AI recommends "don't file" and the operator wants to propose anyway, they must pick from a structured vocabulary:

```
additional_evidence   "I have evidence the recommender didn't see"
legal_counsel         "Counsel advised filing regardless of EV math"
prior_pattern         "Documented pattern with prior incidents at this venue"
other                 (requires free-text explanation)
```

- Override requires a structured reason
- `other` requires free-text (no silent overrides)
- The override badge is visible to the broker inline in their proposal queue
- Override accuracy is tracked per-venue (see §: Data flywheel)

This is weaker than the full neutral-drafter model — the operator still *proposes*, not just confirms. But it's deployable now without the schema complexity, and it generates labeled signal for the v2 build.

---

## New data model (v1)

```python
class ClaimProposal(SQLModel, table=True):
    id: str = Field(primary_key=True)         # prop-{uuid}
    packet_id: str                             # FK → UnderwritingPacket
    venue_id: str                              # denormalized for portfolio queries
    proposed_by: str                           # user_id
    proposed_at: datetime
    override_recommendation: bool = False
    override_reason: str | None               # one of 4 vocabulary tags
    override_freetext: str | None             # required when reason='other'
    state: str = "pending_broker_review"       # see state machine above
    broker_decided_by: str | None
    broker_decided_at: datetime | None
    broker_notes: str | None
```

One table, additive, no existing tables modified.

---

## Data flywheel: override-accuracy stats

Every decided override becomes labeled training data:

- `override_recommendation=True, state=approved` → operator was right (AI was too conservative)
- `override_recommendation=True, state=rejected_by_broker` → operator was wrong (or gaming)

The `compute_override_stats()` function aggregates these by venue + by override reason, surfacing:

- `override_right_rate` — what fraction of decided overrides the broker approved
- `non_override_right_rate` — baseline (recommender-supported proposals)
- `by_reason` — per-reason breakdown (e.g., "legal_counsel overrides approved 80%, additional_evidence 45%")

This is the concrete answer to "how does the recommender get better over time?" — the rubric calibration loop reads these patterns before each rubric version bump. No labeled examples needed from external sources; the override audit trail *is* the training signal.

---

## New API surface

| Route | Actor | Purpose |
|---|---|---|
| `POST /api/packets/{id}/claim-proposal` | Operator | Initiates proposal; validates override vocab |
| `POST /api/claim-proposals/{id}/broker-decision` | Broker | Approves or rejects; logs audit event |
| `GET /api/claims` | Both | Portfolio list; operator sees own venues only (client-side scope) |
| `GET /api/claims/{packet_id}` | Both | Latest proposal for a packet |
| `GET /api/override-stats` | Broker | Cross-venue calibration aggregates |
| `GET /api/venues/{id}/override-stats` | Both | Single-venue calibration |

---

## Front-end surfaces

| Surface | URL | Audience |
|---|---|---|
| Inline action row + override modal | `/underwriter/[id]` | Operator proposes; broker approves/rejects inline |
| Per-incident claim detail | `/claims/[packetId]` | Both; full EV breakdown, lifecycle, broker action panel |
| Portfolio dashboard | `/claims` | Broker (all); Operator ("My Claims", own venues) |
| Override Calibration card | `/risk-profile/[venueId]` | Both; override accuracy stats per venue |
| Portfolio stats header | `/claims` (broker view) | Broker; cross-venue override % vs baseline % |

---

## Migration path: v1 → v2 (ADR-0002 full design)

When to build the full neutral-drafter:

1. **A real broker has used the v1 proposal flow** and validated that operator friction model is acceptable
2. **Override accuracy data exists** — we need enough labeled overrides to calibrate the ClaimDrafterProvider's filing-probability heuristic
3. **The "which override reasons hold up" pattern is stable** — `by_reason` stats have converged enough that the policy ingestion + coverage-applicability matcher in the full ClaimDraft has meaningful prior

The migration is **additive from v1** — `ClaimProposal` stays as the entry point; `ClaimDraft` is generated after proposal, linked via `proposal_id`. Broker action migrates from `ClaimProposal.state` to `BrokerClaimReview.decision`. No v1 data is destroyed.

---

## Consequences

**Positive:**
- Ships the entire operator→broker lifecycle in one session with one table
- Generates the labeled override-accuracy data the v2 build requires
- Override vocabulary + structured reasons is the v1 fraud-resistance mechanism
- Every audit event from v1 (`claim.proposed`, `claim.approved`, `claim.rejected`) survives into v2; no data migration needed

**Negative:**
- Operator *proposes* the claim (v1 weakness vs ADR-0002's operator-can't-author guarantee)
- No AI-authored FNOL — the claim narrative isn't in the system until carrier integration lands
- `other` + free-text is an escape hatch that a motivated inflator can abuse (mitigated by broker visibility, but not eliminated)

---

## References

- ADR-0001 — Pluggable Memo Provider (audit + provider-abstraction pattern this ADR reuses)
- ADR-0002 — Claims v2 target design (the neutral-drafter architecture, retained as Phase 2)
- `backend/app/claim_proposals.py` — implementation
- `backend/app/claim_recommendation.py` — the deterministic recommender (recommendation only; not drafter)
