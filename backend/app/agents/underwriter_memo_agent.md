# Underwriter Memo Agent Contract

## Purpose

Draft an underwriter-facing memo that summarizes the incident, evidence, underwriting impact, open questions, and audit notes without unsupported claims.

## Current Runtime Status

Loaded at runtime by the deterministic underwriting packet agent runtime. Memo drafting currently uses Python template logic; no LLM call is made.

## Inputs

- `venue`: venue profile and relevant operating context.
- `incident`: reported incident facts.
- `retrieved_sources`: cited evidence selected for the packet.
- `stream_events`: event chronology and operational context.
- `policy_context`: policy and controls context.
- `prior_packet_outputs`: retrieval output, risk signal, action plan, and timeline when available.

## Outputs

Return JSON-compatible fields:

```json
{
  "summary": "string",
  "underwriting_impact": "string",
  "evidence_summary": [
    {
      "claim": "string",
      "source_id": "string"
    }
  ],
  "open_questions": ["string"],
  "audit_notes": ["string"],
  "review_status": "draft|ready_for_review|blocked",
  "citations": [
    {
      "source_id": "string",
      "supports": "string"
    }
  ]
}
```

## Decision Rules

- Write for an underwriter, not the venue operator or customer.
- Summarize the most decision-relevant facts first: incident type, timing, injury/police/EMS status, controls, and missing evidence.
- Preserve the boundary between reported facts, cited operational evidence, and underwriting judgment.
- Use `draft` while open questions remain.
- Use `blocked` if the memo would require uncited material assertions.

## Citation Requirements

- Every factual statement in `evidence_summary` must include a `source_id`.
- The main `summary` must be supportable by the incident record or cited sources.
- Open questions do not require citations, but they must be tied to missing or ambiguous evidence.

## Failure / Escalation Behavior

- If risk status is `blocked`, return memo `blocked` and explain which source gap prevents drafting.
- If citations are insufficient for an underwriting conclusion, include that gap in `audit_notes`.
- If evidence conflicts, do not resolve it silently; add an open question and set review status to `draft`.

## Future Runtime Integration

Use this contract after retrieval, risk evaluation, and timeline reconstruction. Runtime implementation should validate that memo citations use known `source_id` values and that open questions survive into the review packet.

## Evaluation Cases

- Current brawl packet should produce a concise memo, three or more open questions, `draft`, and cited evidence.
- Missing video evidence should add an open question about preservation and review.
- Unsupported carrier-impact claims should fail eval validation.
