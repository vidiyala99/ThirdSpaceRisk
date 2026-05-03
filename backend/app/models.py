from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlalchemy import Column, JSON

class Venue(SQLModel, table=True):
    id: str = Field(primary_key=True)
    name: str

class IncidentRecord(SQLModel, table=True):
    id: str = Field(primary_key=True)
    venue_id: str = Field(foreign_key="venue.id")
    occurred_at: str
    location: str
    summary: str
    reported_by: str
    injury_observed: bool
    police_called: bool
    ems_called: bool
    created_at: datetime = Field(default_factory=datetime.utcnow)

    evaluation: Optional["IncidentEvaluation"] = Relationship(back_populates="incident")

class IncidentEvaluation(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    incident_id: str = Field(foreign_key="incidentrecord.id", unique=True)
    
    # Store complex AI-generated structures as JSON for flexibility in the MVP
    risk_signal: dict = Field(default_factory=dict, sa_column=Column(JSON))
    action_plan: list = Field(default_factory=list, sa_column=Column(JSON))
    underwriting_memo: dict = Field(default_factory=dict, sa_column=Column(JSON))
    claims_timeline: list = Field(default_factory=list, sa_column=Column(JSON))

    incident: IncidentRecord = Relationship(back_populates="evaluation")
