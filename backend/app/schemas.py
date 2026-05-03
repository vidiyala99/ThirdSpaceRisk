from pydantic import BaseModel, Field


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


class RiskSignal(BaseModel):
    type: str
    severity: str
    confidence: float = Field(ge=0, le=1)
    explanation: str
    review_status: str
    citations: list[Citation]


class ActionItem(BaseModel):
    title: str
    rationale: str
    evidence_needed: list[str]


class TimelineEvent(BaseModel):
    at: str
    label: str
    source: str


class UnderwritingMemo(BaseModel):
    summary: str
    open_questions: list[str]
    review_status: str
    citations: list[Citation]


class IncidentFlowResponse(BaseModel):
    incident: Incident
    risk_signal: RiskSignal
    action_plan: list[ActionItem]
    claims_timeline: list[TimelineEvent]
    underwriting_memo: UnderwritingMemo


class StreamEvent(BaseModel):
    event_id: str
    event_type: str
    timestamp: str
    payload: dict

