# Retrieval Agent Contract

## Purpose

Decide what evidence should be retrieved for an underwriting packet and define the citation standard that downstream packet steps must satisfy.

## Current Runtime Status

Loaded at runtime by the deterministic underwriting packet agent runtime. Retrieval currently uses keyword matching in `VenueKnowledgeBase.retrieve()`; no LLM call is made.

## Inputs

- `venue`: venue id, venue name, and known operating context.
- `incident`: reported facts including time, location, summary, reporter, injury status, police status, and EMS status.
- `retrieved_sources`: any sources already returned by deterministic retrieval.
- `stream_events`: structured operational events such as door count, POS, staffing, or camera metadata.
- `policy_context`: policy documents, controls questionnaires, carrier requirements, and coverage constraints.
- `prior_packet_outputs`: optional earlier risk signal, memo, action plan, or timeline fields when retrieval is being refined.

## Outputs

Return JSON-compatible fields:

```json
{
  "search_intent": "string",
  "required_source_types": ["policy", "staffing", "camera", "incident_report"],
  "query_terms": ["string"],
  "minimum_citation_count": 3,
  "candidate_citations": [
    {
      "source_id": "string",
      "reason": "string",
      "supports": ["incident_fact", "risk_factor", "timeline_event"]
    }
  ],
  "missing_evidence": ["string"],
  "review_status": "complete|needs_review|blocked"
}
```

## Decision Rules

- Prioritize source types that can support liability, control, timing, and defensibility conclusions.
- Prefer contemporaneous operational data over reconstructed narrative.
- Include policy or controls context whenever the packet makes an underwriting conclusion.
- Flag retrieval as `needs_review` when fewer than three relevant source ids are available.
- Flag retrieval as `blocked` when no source can support the core incident fact.

## Citation Requirements

- Every candidate citation must include a `source_id`.
- Do not treat unstructured memo text as evidence unless it points back to a cited source.
- When a source is relevant only by absence, explain the absence as `missing_evidence` rather than a citation.

## Failure / Escalation Behavior

- If incident facts and retrieved evidence conflict, return `needs_review` and identify the conflicting `source_id` values.
- If a requested source type is unavailable, list it in `missing_evidence`.
- If source ids are malformed or missing, return `blocked`.

## Future Runtime Integration

Use this contract before risk evaluation, memo generation, customer actions, and timeline reconstruction. Runtime integration should pass the returned `candidate_citations` into downstream steps and compare them against deterministic retrieval results during evals.

## Evaluation Cases

- Brawl incident with policy, staffing, camera, POS, and door count sources should return at least three citations and `complete`.
- Brawl incident with no camera metadata should return `needs_review` with missing camera evidence.
- Incident summary with no matching source ids should return `blocked`.
