from pydantic import BaseModel, Field
from typing import List, Optional

class IncidentCreate(BaseModel):
    occurred_at: str
    location: str
    summary: str
    reported_by: str
    injury_observed: bool
    police_called: bool
    ems_called: bool

class Citation(BaseModel):
    source_id: str
    source_type: str
    excerpt: str

class Incident(BaseModel):
    id: str
    venue_id: str
    occurred_at: str
    location: str
    summary: str
    reported_by: str
    injury_observed: bool
    police_called: bool
    ems_called: bool
    status: str = "open"  # open | under_review | closed

class RiskSignal(BaseModel):
    type: str
    severity: str
    confidence: float = Field(ge=0, le=1)
    explanation: str
    review_status: str
    citations: List[Citation]

class ActionItem(BaseModel):
    title: str
    rationale: str
    evidence_needed: List[str]

class TimelineEvent(BaseModel):
    at: str
    label: str
    source: str

class UnderwritingMemo(BaseModel):
    summary: str
    open_questions: List[str]
    review_status: str
    citations: List[Citation]
    provider: Optional[str] = None  # e.g. "gemini/gemini-2.5-flash" or "deterministic/template-v1"
    model: Optional[str] = None
    fallback_reason: Optional[str] = None  # populated when LLM call failed and we fell back

class InfrastructureItem(BaseModel):
    name: str
    status: str
    detail: str
    is_degraded: bool

class ComplianceItem(BaseModel):
    id: str
    title: str
    description: str
    severity: str

class LiveVenueState(BaseModel):
    venue_id: str
    current_capacity: int
    max_capacity: int
    premium_impact: float
    infrastructure: List[InfrastructureItem]
    compliance_queue: List[ComplianceItem]

class IncidentFlowResponse(BaseModel):
    incident: Incident
    risk_signal: RiskSignal
    action_plan: List[ActionItem]
    claims_timeline: List[TimelineEvent]
    underwriting_memo: UnderwritingMemo

class StreamEvent(BaseModel):
    event_id: str
    event_type: str
    timestamp: str
    payload: dict
