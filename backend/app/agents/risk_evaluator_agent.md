# Risk Evaluator Agent Contract

## Purpose

Map reported incident facts and cited evidence to an underwriting risk signal with severity, confidence, explanation, and human review status.

## Current Runtime Status

Loaded at runtime by the deterministic underwriting packet agent runtime. Risk evaluation currently uses Python template logic; no LLM call is made.

## Inputs

- `venue`: venue id, venue name, and operating context.
- `incident`: reported incident facts.
- `retrieved_sources`: citations selected for the packet.
- `stream_events`: operational signals near the incident time.
- `policy_context`: policy terms, controls, exclusions, and carrier requirements.
- `prior_packet_outputs`: optional retrieval output or prior risk signal.

## Outputs

Return JSON-compatible fields:

```json
{
  "type": "altercation_event",
  "severity": "low|medium|high|critical",
  "confidence": 0.0,
  "explanation": "string",
  "risk_factors": ["string"],
  "mitigating_factors": ["string"],
  "review_status": "approved|needs_review|blocked",
  "citations": [
    {
      "source_id": "string",
      "supports": "string"
    }
  ],
  "open_questions": ["string"]
}
```

## Decision Rules

- Severity must reflect incident type, injury status, police/EMS involvement, crowd context, staffing, and available evidence.
- Confidence must decrease when key facts are missing, sources conflict, or the packet lacks contemporaneous evidence.
- `needs_review` is required for altercations, injuries, police/EMS involvement, missing video, or unclear removal outcome.
- Mitigating factors must be evidence-backed, not assumed from normal venue operations.
- Do not downgrade severity based only on absence of reported injury unless evidence supports no injury observed.

## Citation Requirements

- The explanation must be supported by at least one cited `source_id`.
- Each risk factor and mitigating factor should map to a cited source or the reported incident.
- Do not cite a source for claims it does not directly support.

## Failure / Escalation Behavior

- Return `blocked` if no citation supports the incident type or event timing.
- Return `needs_review` if severity cannot be assigned from available evidence.
- Include open questions for all missing facts that could materially change severity.

## Future Runtime Integration

Use this contract after retrieval and before memo/action generation. Runtime implementation should validate severity labels, confidence bounds, citation ids, and review status against schema and eval cases.

## Evaluation Cases

- Brawl, no injury observed, police/EMS not called, staffed event, under capacity: `medium`, confidence below 0.9, `needs_review`.
- Brawl with reported injury or EMS called: at least `high`, `needs_review`.
- Incident with no supporting citations: `blocked`.
