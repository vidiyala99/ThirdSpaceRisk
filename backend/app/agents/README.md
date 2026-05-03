# Underwriting Packet Agent Contracts

This directory contains product runtime prompt contracts for the underwriting packet flow. They are not Codex instructions or local development instructions.

## Current Runtime Status

The contracts in this directory are loaded by `backend/app/agents/runtime.py` during the incident packet flow. The current execution mode is deterministic: each agent step runs Python logic over seeded sources and stream events.

No provider, model, prompt executor, or live LLM call has been wired into the request path. The runtime boundary exists so future provider-backed execution can replace or augment deterministic steps once evals exist.

## Shared Principles

- Every factual output must be traceable to reported incident facts or cited sources.
- Citations use `source_id` values from retrieved knowledge sources, stream events, or explicitly named packet inputs.
- Agents must separate venue/customer-facing tasks from underwriter-facing findings.
- Agents must state uncertainty, missing evidence, and open questions instead of inventing facts.
- Review status must be explicit when evidence is incomplete, contradictory, or high impact.
- Outputs should be JSON-compatible so deterministic code, future LLM calls, and eval fixtures can share the same contract.

## Contract Index

- `retrieval_agent.md`: decides source search intent and citation requirements.
- `risk_evaluator_agent.md`: maps incident facts and cited evidence to severity, confidence, and review status.
- `underwriter_memo_agent.md`: drafts underwriter-facing memo content from cited evidence.
- `customer_action_agent.md`: converts underwriting gaps into venue/customer-facing evidence tasks.
- `claims_timeline_agent.md`: reconstructs a source-backed claims defensibility chronology.

## Future Runtime Integration

A future runtime may route each packet step through an LLM, deterministic fallback, or hybrid evaluator. That provider-backed wiring should come after provider setup, regression evals, and failure-mode tests exist for the current brawl scenario.
