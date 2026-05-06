from app.providers.base import MemoOutput, MemoProvider, ProviderMode


class DeterministicProvider(MemoProvider):
    """
    Template-based memo drafting with no external dependencies.

    Produces consistent, explainable output driven entirely by the structured
    packet findings. All output is traceable back to the rubric and citations.
    """

    @property
    def provider_name(self) -> str:
        return "deterministic-v1"

    @property
    def mode(self) -> ProviderMode:
        return ProviderMode.DETERMINISTIC

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
        severity_context = {
            "low": "Current evidence suggests the exposure is manageable with proper documentation.",
            "medium": "Staffing and capacity controls may mitigate the underwriting impact if evidence is preserved.",
            "high": "Immediate evidence preservation is required to support any claims-defense position.",
            "critical": "This event presents significant liability exposure. Carrier notification may be required.",
        }.get(severity.lower(), "Review is required before a coverage position can be determined.")

        citation_note = (
            f"Supporting evidence includes {len(citation_excerpts)} cited source(s)."
            if citation_excerpts
            else "No supporting evidence was retrieved for this incident."
        )

        summary = (
            f"{incident_summary.rstrip('.')} at {incident_location} requires underwriter review. "
            f"{severity_context} {citation_note}"
        )

        default_questions = [
            "Was service stopped for involved patrons before removal?",
            "Were witness names and contact details collected before close?",
            "Has the relevant security footage been reviewed and preserved?",
        ]

        return MemoOutput(
            summary=summary,
            open_questions=open_questions or default_questions,
            provider=self.provider_name,
            mode=self.mode,
        )
