from dataclasses import dataclass
from pathlib import Path

from app.rag_v2 import SemanticKnowledgeBase as VenueKnowledgeBase
from app.providers import MemoProvider, get_default_provider
from app.schemas import ActionItem, Citation, IncidentCreate, RiskSignal, TimelineEvent, UnderwritingMemo


CONTRACT_VERSION = "2026-05-03"
REQUIRED_CONTRACTS = {
    "retrieval_agent": "retrieval_agent.md",
    "risk_evaluator_agent": "risk_evaluator_agent.md",
    "customer_action_agent": "customer_action_agent.md",
    "claims_timeline_agent": "claims_timeline_agent.md",
    "underwriter_memo_agent": "underwriter_memo_agent.md",
}


class AgentContractError(RuntimeError):
    """Raised when runtime agent contracts cannot be loaded."""


@dataclass(frozen=True)
class AgentExecutionStep:
    agent_name: str
    contract_version: str
    contract_path: str
    execution_mode: str = "deterministic"


@dataclass(frozen=True)
class UnderwritingPacketAgentResult:
    citations: list[Citation]
    risk_signal: RiskSignal
    action_plan: list[ActionItem]
    claims_timeline: list[TimelineEvent]
    underwriting_memo: UnderwritingMemo
    execution_trace: list[AgentExecutionStep]


class UnderwritingPacketAgentRuntime:
    def __init__(
        self,
        contracts_dir: Path | None = None,
        memo_provider: MemoProvider | None = None,
    ):
        self._contracts_dir = contracts_dir or Path(__file__).resolve().parent
        self._memo_provider = memo_provider or get_default_provider()

    def execute(
        self,
        *,
        venue_id: str,
        venue: dict,
        incident: IncidentCreate,
        knowledge_sources: list[dict],
        stream_events: list[dict],
        policy_context: dict | None = None,
        prior_packet_outputs: dict | None = None,
    ) -> UnderwritingPacketAgentResult:
        contracts = self._load_contracts()
        trace: list[AgentExecutionStep] = []

        citations = self._run_retrieval_agent(
            venue_id=venue_id,
            incident=incident,
            knowledge_sources=knowledge_sources,
            stream_events=stream_events,
        )
        trace.append(self._trace_step("retrieval_agent", contracts))

        risk_signal = self._run_risk_evaluator_agent(citations=citations)
        trace.append(self._trace_step("risk_evaluator_agent", contracts))

        action_plan = self._run_customer_action_agent()
        trace.append(self._trace_step("customer_action_agent", contracts))

        claims_timeline = self._run_claims_timeline_agent(
            venue_id=venue_id,
            incident=incident,
            stream_events=stream_events,
        )
        trace.append(self._trace_step("claims_timeline_agent", contracts))

        underwriting_memo = self._run_underwriter_memo_agent(
            incident=incident, risk_signal=risk_signal, citations=citations
        )
        trace.append(self._trace_step("underwriter_memo_agent", contracts))

        return UnderwritingPacketAgentResult(
            citations=citations,
            risk_signal=risk_signal,
            action_plan=action_plan,
            claims_timeline=claims_timeline,
            underwriting_memo=underwriting_memo,
            execution_trace=trace,
        )

    def _load_contracts(self) -> dict[str, Path]:
        contracts: dict[str, Path] = {}
        for agent_name, file_name in REQUIRED_CONTRACTS.items():
            contract_path = self._contracts_dir / file_name
            if not contract_path.exists():
                raise AgentContractError(f"Missing required agent contract: {contract_path}")
            contract_text = contract_path.read_text(encoding="utf-8")
            if "## Current Runtime Status" not in contract_text:
                raise AgentContractError(f"Agent contract lacks runtime status section: {contract_path}")
            contracts[agent_name] = contract_path
        return contracts

    def _trace_step(self, agent_name: str, contracts: dict[str, Path]) -> AgentExecutionStep:
        return AgentExecutionStep(
            agent_name=agent_name,
            contract_version=CONTRACT_VERSION,
            contract_path=str(contracts[agent_name]),
        )

    def _run_retrieval_agent(
        self,
        *,
        venue_id: str,
        incident: IncidentCreate,
        knowledge_sources: list[dict],
        stream_events: list[dict],
    ) -> list[Citation]:
        knowledge_base = VenueKnowledgeBase(knowledge_sources, stream_events)
        query = f"{incident.summary} {incident.location} brawl altercation security incident policy camera evidence"
        return knowledge_base.retrieve(venue_id, query)

    def _run_risk_evaluator_agent(self, *, citations: list[Citation]) -> RiskSignal:
        return RiskSignal(
            type="altercation_event",
            severity="medium",
            confidence=0.78,
            explanation=(
                "A brawl creates liquor-liability and claims-defense exposure, but available "
                "streaming context indicates the venue was under capacity and had security staffed."
            ),
            review_status="needs_review",
            citations=citations,
        )

    def _run_customer_action_agent(self) -> list[ActionItem]:
        return [
            ActionItem(
                title="Preserve incident evidence",
                rationale="A clean evidence package makes the event defensible if a claim appears later.",
                evidence_needed=[
                    "Reviewed rear-bar clip from 23:10-23:18",
                    "Completed witness/contact section",
                    "Security lead narrative",
                ],
            ),
            ActionItem(
                title="Complete same-night manager follow-up",
                rationale="Underwriters value contemporaneous records over reconstructed notes.",
                evidence_needed=["Manager sign-off", "Police/EMS confirmation fields", "Removal/trespass outcome"],
            ),
        ]

    def _run_claims_timeline_agent(
        self,
        *,
        venue_id: str,
        incident: IncidentCreate,
        stream_events: list[dict],
    ) -> list[TimelineEvent]:
        claims_timeline = [
            TimelineEvent(at=event["at"], label=event["label"], source=event["source_id"])
            for event in stream_events
            if event["venue_id"] == venue_id
        ]
        claims_timeline.append(
            TimelineEvent(
                at=incident.occurred_at,
                label=f"Incident logged by {incident.reported_by}: {incident.summary}",
                source="venue:incident-report",
            )
        )
        return claims_timeline

    def _run_underwriter_memo_agent(
        self,
        *,
        incident: IncidentCreate,
        risk_signal: RiskSignal,
        citations: list[Citation],
    ) -> UnderwritingMemo:
        memo_output = self._memo_provider.draft_memo(
            incident_summary=incident.summary,
            incident_location=incident.location,
            risk_type=risk_signal.type,
            severity=risk_signal.severity,
            confidence=risk_signal.confidence,
            citation_excerpts=[c.excerpt for c in citations],
        )
        return UnderwritingMemo(
            summary=memo_output.summary,
            open_questions=memo_output.open_questions,
            review_status="draft",
            citations=citations,
        )


def execute_underwriting_packet_agents(
    *,
    venue_id: str,
    venue: dict,
    incident: IncidentCreate,
    knowledge_sources: list[dict],
    stream_events: list[dict],
    policy_context: dict | None = None,
    prior_packet_outputs: dict | None = None,
) -> UnderwritingPacketAgentResult:
    runtime = UnderwritingPacketAgentRuntime()
    return runtime.execute(
        venue_id=venue_id,
        venue=venue,
        incident=incident,
        knowledge_sources=knowledge_sources,
        stream_events=stream_events,
        policy_context=policy_context,
        prior_packet_outputs=prior_packet_outputs,
    )
