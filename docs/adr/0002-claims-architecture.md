# ADR-0002 — Claims Architecture: AI-Drafted, Broker-Approved

**Status:** Retained as v2 target design · v1 implementation shipped via ADR-0003 (2026-05-12)
**Date:** 2026-05-11 · Status updated 2026-05-12
**Author:** A. Vidiyala

> **Note:** The full ClaimDraft / neutral-drafter architecture described here is the v2 target.
> The v1 implementation shipped a simpler `ClaimProposal` state machine (operator-proposes,
> broker-decides) with structured override accountability — see **ADR-0003** for rationale
> and the migration path back to this design.

## Context

The product needs a Claims surface to complete the underwriting OS story: incident → packet → claim → carrier resolution → premium feedback. Without it, the system stops at "we generated a defensible packet" and never reaches "we helped the broker move money."

Three real-world parties have *misaligned incentives* on claims:

| Party | Wants | Risk to truth |
|---|---|---|
| Operator | Maximize payout | **Inflates** — exaggerates injuries, claims more damage |
| Broker | Commission paid either way + retain client | **Friendly bias** — too willing to file weak claims |
| Carrier | Minimize payout | **Under-pays** — denies, lowballs, drags |

A naive "operator drafts → broker submits" workflow has no defense against operator inflation. A naive "broker drafts alone" workflow inherits the commission bias. **The AI is the only party with no payout incentive**, so it can be the neutral drafter.

## Decision

Claims are produced via a **three-way separation**: operator contributes facts, AI drafts the canonical record, broker approves. All contributions are immutable + attributed in the audit log. The carrier remains *outside* the system — they receive a finalized package and decide coverage on their own infrastructure.

```
┌────────────────────────────────────────────────────────────┐
│ OPERATOR LAYER                                             │
│  Source of evidence + factual confirmations                │
│  ✓ Marks evidence files authentic                          │
│  ✓ Answers yes/no fact-check questions                     │
│  ✓ Adds OperatorNotes (separate, attributed)               │
│  ✗ CANNOT edit AI narrative, quantum, or coverage citation │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│ AI LAYER (immutable canonical draft)                       │
│  Inputs: incident packet, evidence + corroboration, policy │
│  clauses (Master Policy ingestion), venue claim history   │
│  Outputs: structured FNOL with three confidence scores:   │
│   1. Coverage applicability  (which clauses apply)         │
│   2. Quantum estimate        (median + range)              │
│   3. Documentation completeness (missing evidence list)    │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│ BROKER LAYER (approver, advocate)                          │
│  ✓ Approve · request AI revision · reject (reason required)│
│  ✗ Cannot silently edit AI output — overrides logged      │
│  → On approve: ClaimRecord locked, FNOL bundle ready       │
└────────────────────────────────────────────────────────────┘
                          ↓
                External: Carrier portal/API
              (carrier owns coverage decision)
```

## Integrity properties enforced by the data model

| Property | Mechanism |
|---|---|
| AI draft can't be silently modified | `ClaimDraft` row is immutable post-write; broker requests trigger a *new* draft, parent linked |
| Operator additions are attributed | Separate `OperatorClaimNote` rows; never merged into draft text |
| Broker overrides are explained | `BrokerClaimReview` requires `override_reason` when status diverges from AI recommendation |
| Full chain reconstructable | `AuditEvent` rows tie every state change with actor + timestamp |
| Snapshot hash survives review | Same pattern as ADR-0001's packet v1/v2 — broker action creates v2 record, never mutates v1 |

## Data model (additive — no existing tables modified)

```python
class ClaimDraft(SQLModel, table=True):
    id: str                            # claim-draft-<hash>
    incident_id: str                   # FK
    packet_id: str                     # FK (the packet this draft was generated from)
    coverage_cited: list[str]          # SourceRecord IDs of applicable policy clauses
    quantum_low_usd: int
    quantum_median_usd: int
    quantum_high_usd: int
    coverage_confidence: float
    quantum_confidence: float
    documentation_completeness: float
    required_evidence: list[str]       # checklist for the broker
    drafted_at: datetime
    drafter_version: str               # claim-drafter-v1
    parent_draft_id: str | None        # for revision chains

class ClaimFactCheck(SQLModel, table=True):
    id: str
    draft_id: str                      # FK
    question: str                      # AI-generated, structured
    operator_answer: Literal["yes", "no", "unknown", "disputed"]
    answered_by: str                   # user_id
    answered_at: datetime

class OperatorClaimNote(SQLModel, table=True):
    id: str
    draft_id: str                      # FK
    note: str                          # free-text operator context
    submitted_by: str
    submitted_at: datetime

class BrokerClaimReview(SQLModel, table=True):
    id: str
    draft_id: str                      # FK
    decision: Literal["approve", "revise", "reject"]
    override_reason: str | None        # required when decision diverges from AI rec
    decided_by: str
    decided_at: datetime

class ClaimRecord(SQLModel, table=True):
    id: str
    incident_id: str                   # FK
    final_draft_id: str                # FK — the approved draft
    carrier_name: str
    carrier_claim_number: str | None
    status: Literal["filed", "investigating", "paid", "denied", "partial", "withdrawn"]
    filed_at: datetime
    reserve_amount_usd: int | None
    paid_amount_usd: int | None
    notes: str | None
```

## What's already built that this leverages

| Existing system | How Claims uses it |
|---|---|
| Packet v1/v2 audit integrity (ADR-0001 pattern) | Same immutability pattern applied to ClaimDraft |
| `SourceRecord` with `origin_system="policy_ingestion"` | Coverage applicability matcher reads ingested policy clauses |
| `EvidenceFile` + `EvidenceAnalysis` (vision corroboration) | Documentation completeness check + claim quantum support |
| `RiskClassifierProvider` (deterministic + Gemini) | Drives initial filing-probability heuristic |
| `MemoProvider` abstraction | Same shape for `ClaimDrafterProvider` — Gemini-first, deterministic fallback |
| `AuditEvent` with arbitrary metadata | Every state transition emits an event |
| `require_broker` / `require_non_broker` auth dependencies | Operator endpoints vs. broker endpoints cleanly separated |

## What's shipped today (the visible surface)

`POST /api/packets/{id}` returns a `claim_recommendation` field containing:
- `should_file` (bool)
- `probability` (claim-paid probability)
- `expected_payout` (low / median / high)
- `expected_premium_impact` (annual delta × duration × cumulative)
- `net_expected_value_usd`
- `reasons` (human-readable rationale list)
- `confidence`

Frontend: an **AI Claim Recommendation card** lives on the underwriter packet view, above the Review Decision controls. It reads the recommendation field and renders the expected-value math + reasons + a `details` disclosure.

The recommendation is currently a **deterministic rule-based recommender** (`app/claim_recommendation.py`), tested across 9 scenarios. It uses the same per-type/severity matrix the rest of the underwriting logic uses, so its outputs are stable and explainable.

This is the smallest *demoable* slice of the Claims architecture: it surfaces the AI's recommendation without requiring the full data model, the carrier integration, or the broker review workflow.

## Build cost from current state

| Phase | Effort | Why it's deferred |
|---|---|---|
| `ClaimDrafterProvider` interface + Gemini implementation | ~1 hour | Mirrors existing provider pattern; no new architecture |
| `ClaimDraft` + `OperatorClaimNote` + `BrokerClaimReview` tables | ~1 hour | DDL + minimal seeders |
| Operator fact-check view (yes/no questions, no free-text) | ~1.5 hours | Frontend + state management |
| Broker review surface (approve / revise / reject) | ~1.5 hours | Frontend + audit event wiring |
| `ClaimRecord` table + carrier-side status tracking | ~1 hour | Status state machine + audit events |
| **Total** | **~6 hours** | Single focused session post-customer-validation |

**Why we haven't shipped the full lifecycle:** the full Claims feature has real product decisions baked in (carrier as entity? reserves over time? multi-claim incidents? subrogation tracking?). Getting these wrong now costs more to undo than building right. Today we ship the visible recommendation surface so the AI-decision story is demoable; the full lifecycle waits for a real broker in front of it.

## Consequences

**Positive:**
- Adversarial-incentive-aware design — defensible against the "operator inflated, broker rubber-stamped" failure mode that plagues incumbent insurance tech.
- Architecturally additive — no existing tables change, no existing tests break.
- Mirrors the audit pattern from ADR-0001, so the codebase has *one* defensibility story, not two.
- The recommendation surface alone demos meaningfully without requiring the full schema.

**Negative:**
- Operator workflow is more constrained than competitors (fact-check vs free-edit). Acceptable cost for integrity; risks adoption friction if operators expect spreadsheet-style control.
- AI drafter quality is bounded by the policy ingestion + evidence corroboration upstream. Garbage-in scenarios produce confidently-wrong drafts. Mitigated by the broker-approval gate, but not eliminated.
- Carrier remains outside the system. We capture none of the post-submission decision data unless the broker manually logs it. API integration with major carriers is a separate, much larger effort.

## Anti-pattern explicitly rejected

A "claim wizard" that walks the operator through filling out the FNOL fields directly. This is the dominant pattern in incumbent insurance tech (Applied Epic, Vertafore AMS360, etc.) and is exactly the inflation vector this ADR is designed to prevent. The fact-check + AI-drafter pattern looks similar from the operator's UI but is structurally different: the operator never authors claim content, only confirms or disputes AI-derived facts.

## References

- ADR-0001 (Pluggable Memo Provider) — same provider-abstraction pattern reused for ClaimDrafterProvider
- `backend/app/claim_recommendation.py` — deterministic recommender shipped today
- `backend/app/providers/__init__.py` — provider factory pattern this ADR extends
- `backend/app/packet_core.py` — v1/v2 audit-integrity pattern this ADR mirrors
