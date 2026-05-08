import asyncio
from typing import Any, Dict
from app.agents.runtime import UnderwritingPacketAgentRuntime
from app.schemas import IncidentCreate, Citation
from app.seed_data import KNOWLEDGE_SOURCES, STREAM_EVENTS, VENUES

class BaseWorker:
    def __init__(self, name: str):
        self.name = name

    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        # Simulate thinking time
        await asyncio.sleep(1.5)
        return await self._run(context)

    async def _run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError()

class RetrievalWorker(BaseWorker):
    def __init__(self):
        super().__init__("retrieval_agent")

    async def _run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        runtime = UnderwritingPacketAgentRuntime()
        # Incident and context data should be in the workflow context
        incident_data = context.get("incident_payload")
        incident = IncidentCreate(**incident_data)
        venue_id = context.get("venue_id")
        
        # Load seeded sources for retrieval if the workflow context did not provide them.
        knowledge_sources = context.get("knowledge_sources") or [
            source for source in KNOWLEDGE_SOURCES if source["venue_id"] == venue_id
        ]
        stream_events = context.get("stream_events") or [
            event for event in STREAM_EVENTS if event["venue_id"] == venue_id
        ]
        
        citations = runtime._run_retrieval_agent(
            venue_id=venue_id,
            incident=incident,
            knowledge_sources=knowledge_sources,
            stream_events=stream_events,
        )
        
        # Convert citations to dict for JSON serialization
        return {"citations": [c.model_dump() for c in citations]}

class RiskEvaluatorWorker(BaseWorker):
    def __init__(self):
        super().__init__("risk_evaluator_agent")

    async def _run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        runtime = UnderwritingPacketAgentRuntime()
        incident_data = context.get("incident_payload")
        incident = IncidentCreate(**incident_data) if incident_data else None
        citations_data = context.get("retrieval", {}).get("citations", [])
        citations = [Citation(**c) for c in citations_data]

        risk_signal = runtime._run_risk_evaluator_agent(citations=citations, incident=incident)
        return {"risk_signal": risk_signal.model_dump()}

class UnderwriterMemoWorker(BaseWorker):
    def __init__(self):
        super().__init__("underwriter_memo_agent")

    async def _run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        from app.schemas import RiskSignal
        runtime = UnderwritingPacketAgentRuntime()
        incident_data = context.get("incident_payload")
        incident = IncidentCreate(**incident_data)
        citations_data = context.get("retrieval", {}).get("citations", [])
        citations = [Citation(**c) for c in citations_data]
        risk_signal_data = context.get("risk_eval", {}).get("risk_signal", {})
        risk_signal = RiskSignal(**risk_signal_data) if risk_signal_data else runtime._run_risk_evaluator_agent(citations=citations, incident=incident)

        memo = runtime._run_underwriter_memo_agent(incident=incident, risk_signal=risk_signal, citations=citations)
        return {"underwriting_memo": memo.model_dump()}

WORKER_REGISTRY = {
    "retrieval_agent": RetrievalWorker(),
    "risk_evaluator_agent": RiskEvaluatorWorker(),
    "underwriter_memo_agent": UnderwriterMemoWorker(),
}
