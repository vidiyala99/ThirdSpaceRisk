from app.providers.base import MemoOutput, MemoProvider, ProviderMode


SYSTEM_PROMPT = """You are an underwriting memo assistant for Third Space Risk, an AI-powered
insurance broker for nightlife venues. You draft factual, neutral underwriting memos from
structured packet findings.

Rules:
- Ground every claim in the provided citation excerpts. Never invent facts.
- Use neutral, professional language appropriate for carrier review.
- Do not make coverage decisions — flag items for human review instead.
- Keep summaries under 120 words. Open questions should be specific and actionable."""


class AnthropicProvider(MemoProvider):
    """
    LLM-assisted memo drafting via Anthropic Claude.

    Requires ANTHROPIC_API_KEY environment variable. Falls back to raising
    ProviderNotConfiguredError — callers should catch this and fall back to
    DeterministicProvider if needed.

    Output is stored as draft text only. The rubric engine and citation
    validator run independently and are not affected by this provider.
    """

    MODEL = "claude-haiku-4-5-20251001"

    def __init__(self) -> None:
        import os
        self._api_key = os.getenv("ANTHROPIC_API_KEY")
        if not self._api_key:
            raise ProviderNotConfiguredError(
                "ANTHROPIC_API_KEY is not set. Use DeterministicProvider instead."
            )

    @property
    def provider_name(self) -> str:
        return f"anthropic/{self.MODEL}"

    @property
    def mode(self) -> ProviderMode:
        return ProviderMode.LLM

    def draft_memo(
        self,
        *,
        incident_summary: str,
        incident_location: str,
        risk_type: str,
        severity: str,
        confidence: float,
        citation_excerpts: list[str],
        open_questions: list[str] | None = None,
    ) -> MemoOutput:
        import anthropic

        citations_block = "\n".join(f"- {excerpt}" for excerpt in citation_excerpts)
        user_prompt = f"""Draft an underwriting memo for this incident:

Incident: {incident_summary}
Location: {incident_location}
Risk type: {risk_type}
Severity: {severity} (confidence: {confidence:.0%})

Supporting citations:
{citations_block}

Return JSON with keys: summary (string), open_questions (list of strings)."""

        client = anthropic.Anthropic(api_key=self._api_key)
        response = client.messages.create(
            model=self.MODEL,
            max_tokens=512,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
        )

        import json
        raw = response.content[0].text.strip()
        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        parsed = json.loads(raw.strip())

        return MemoOutput(
            summary=parsed["summary"],
            open_questions=parsed.get("open_questions", []),
            provider=self.provider_name,
            mode=self.mode,
            model=self.MODEL,
        )


class ProviderNotConfiguredError(RuntimeError):
    pass
