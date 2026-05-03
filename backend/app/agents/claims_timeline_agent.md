# Claims Timeline Agent Contract

## Purpose

Reconstruct a source-backed chronology that helps claims, underwriting, and venue operators understand what happened and what evidence supports each moment.

## Current Runtime Status

Loaded at runtime by the deterministic underwriting packet agent runtime. Timeline reconstruction currently orders seeded stream events plus the reported incident; no LLM call is made.

## Inputs

- `venue`: venue id and venue operating context.
- `incident`: reported incident facts, including occurrence time and location.
- `retrieved_sources`: cited sources relevant to timing and defensibility.
- `stream_events`: structured events before, during, and after the incident window.
- `policy_context`: evidence retention and claims documentation requirements.
- `prior_packet_outputs`: retrieval output, risk signal, memo, and customer actions when available.

## Outputs

Return JSON-compatible fields:

```json
{
  "events": [
    {
      "at": "ISO-8601 timestamp",
      "label": "string",
      "source_id": "string",
      "confidence": 0.0,
      "event_type": "reported_fact|stream_event|policy_context"
    }
  ],
  "gaps": ["string"],
  "defensibility_notes": ["string"],
  "review_status": "complete|needs_review|blocked"
}
```

## Decision Rules

- Timeline events must be ordered by time when timestamps are available.
- The reported incident must be clearly labeled as a reported fact, not independently verified evidence.
- Stream events should support crowd, staffing, transaction, camera, or response context.
- Include gaps for missing pre-incident, incident-window, or post-incident evidence.
- Use `needs_review` when timing conflicts or key timestamps are missing.

## Citation Requirements

- Each timeline event must include a `source_id`.
- Use `venue:incident-report` or equivalent only for the submitted incident report.
- Do not infer exact times from approximate language unless the source provides a timestamp.

## Failure / Escalation Behavior

- Return `blocked` if no event can be tied to a source id.
- Return `needs_review` if the reported incident time conflicts with stream events.
- Preserve conflicting events in the output rather than dropping them.

## Future Runtime Integration

Use this contract after retrieval and before final memo assembly. Runtime implementation should validate timestamp parseability, source ids, event ordering, and explicit gap handling.

## Evaluation Cases

- Current brawl packet should include door count, POS, camera metadata, and reported incident events.
- Missing incident timestamp should return `needs_review`.
- Stream events with conflicting timestamps should remain visible with review status `needs_review`.
