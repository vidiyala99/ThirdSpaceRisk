from app.fastapi_compat import patch_starlette_router_for_fastapi

patch_starlette_router_for_fastapi()

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlmodel import Session, select, text, func
import time

from app.incident_flow import create_brawl_incident_flow
from app.schemas import Incident, IncidentCreate, IncidentFlowResponse, LiveVenueState, StreamEvent
from app.seed_data import VENUES
from app.database import create_db_and_tables, get_session
from app.live_state import live_state_manager
from app.models import AuditEvent, IncidentRecord, ReviewDecision, SourceRecord, UnderwritingPacket, Venue
from app.packet_core import record_review_decision, record_packet_opened
from app.underwriting import get_premium_quote, get_risk_score


class ReviewDecisionCreate(BaseModel):
    reviewer_id: str
    decision: str
    override_reason: str | None = None
    notes: str | None = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    with next(get_session()) as session:
        # Add status column to existing DBs that predate this field
        try:
            session.exec(text("ALTER TABLE incidentrecord ADD COLUMN status TEXT NOT NULL DEFAULT 'open'"))
            session.commit()
        except Exception:
            pass  # Column already exists
        # Seed venues
        for venue_id, venue_data in VENUES.items():
            if not session.get(Venue, venue_id):
                session.add(Venue(id=venue_id, name=venue_data["name"]))
        session.commit()
    yield

app = FastAPI(title="Third Space Risk OS", lifespan=lifespan)

from app.auth import router as auth_router
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])

from app.api.v1.ingestion import router as ingestion_router
app.include_router(ingestion_router, prefix="/api/v1", tags=["ingestion"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://172.20.5.179:3000"],
    allow_origin_regex=r"exp://.*",  # Expo Go tunnel origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/venues")
def list_venues() -> list[dict]:
    return [{"id": venue_id, **venue} for venue_id, venue in VENUES.items()]


@app.get("/api/venues/count")
def venue_count() -> dict:
    return {"count": len(VENUES)}


@app.get("/api/portfolio")
def get_portfolio(session: Session = Depends(get_session)) -> list[dict]:
    """Single endpoint for broker portfolio view — all venues with scores + live state."""
    result = []
    for venue_id, venue_data in VENUES.items():
        risk = get_risk_score(venue_id, VENUES)
        live = live_state_manager.get_state(venue_id, venue_data["capacity"], venue_data)
        open_count = session.exec(
            select(func.count(IncidentRecord.id))
            .where(IncidentRecord.venue_id == venue_id)
            .where(IncidentRecord.status == "open")
        ).one()
        result.append({
            "id": venue_id,
            "name": venue_data["name"],
            "venue_type": venue_data.get("venue_type", ""),
            "address": venue_data.get("address", ""),
            "capacity": venue_data["capacity"],
            "current_capacity": live.current_capacity,
            "renewal_date": venue_data.get("renewal_date", ""),
            "current_carrier": venue_data.get("current_carrier", ""),
            "tier": risk["tier"],
            "total_score": risk["total_score"],
            "open_incidents": open_count,
            "compliance_actions": len(live.compliance_queue),
            "has_degraded_infra": any(item.is_degraded for item in live.infrastructure),
        })
    return result


@app.get("/api/venues/{venue_id}/incidents", response_model=list[Incident])
def list_incidents(
    venue_id: str,
    status: str | None = Query(default=None, description="Filter by status: open | under_review | closed"),
    session: Session = Depends(get_session),
) -> list[Incident]:
    if venue_id not in VENUES:
        raise HTTPException(status_code=404, detail="Venue not found")

    query = select(IncidentRecord).where(IncidentRecord.venue_id == venue_id)
    if status:
        query = query.where(IncidentRecord.status == status)
    query = query.order_by(IncidentRecord.created_at.desc())

    records = session.exec(query).all()
    return [
        Incident(
            id=record.id,
            venue_id=record.venue_id,
            occurred_at=record.occurred_at,
            location=record.location,
            summary=record.summary,
            reported_by=record.reported_by,
            injury_observed=record.injury_observed,
            police_called=record.police_called,
            ems_called=record.ems_called,
            status=record.status,
        )
        for record in records
    ]


@app.patch("/api/incidents/{incident_id}/status", status_code=200)
def update_incident_status(
    incident_id: str,
    body: dict,
    session: Session = Depends(get_session),
) -> dict:
    record = session.get(IncidentRecord, incident_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    new_status = body.get("status")
    if new_status not in ("open", "under_review", "closed"):
        raise HTTPException(status_code=400, detail="status must be open | under_review | closed")
    record.status = new_status
    session.add(record)
    session.commit()
    return {"id": incident_id, "status": record.status}


@app.post("/api/venues/{venue_id}/incidents", response_model=IncidentFlowResponse, status_code=201)
def create_incident(venue_id: str, payload: IncidentCreate, session: Session = Depends(get_session)) -> IncidentFlowResponse:
    if venue_id not in VENUES:
        raise HTTPException(status_code=404, detail="Venue not found")
    return create_brawl_incident_flow(venue_id, payload, session)


@app.get("/api/incidents/{incident_id}/packets")
def list_incident_packets(incident_id: str, session: Session = Depends(get_session)) -> list[dict]:
    packets = session.exec(
        select(UnderwritingPacket)
        .where(UnderwritingPacket.incident_id == incident_id)
        .order_by(UnderwritingPacket.generated_at.desc())
    ).all()
    return [_packet_to_dict(packet) for packet in packets]


@app.get("/api/packets/{packet_id}")
def get_packet(
    packet_id: str,
    reviewer_id: str | None = None,
    session: Session = Depends(get_session),
) -> dict:
    packet = session.get(UnderwritingPacket, packet_id)
    if packet is None:
        raise HTTPException(status_code=404, detail="Packet not found")
    if reviewer_id:
        record_packet_opened(session=session, packet_id=packet_id, reviewer_id=reviewer_id)
    return _packet_to_dict(packet)


@app.get("/api/venues/{venue_id}/sources")
def list_venue_sources(venue_id: str, session: Session = Depends(get_session)) -> list[dict]:
    """Source registry — all evidence sources for a venue."""
    if venue_id not in VENUES:
        raise HTTPException(status_code=404, detail="Venue not found")
    sources = session.exec(
        select(SourceRecord)
        .where(SourceRecord.venue_id == venue_id)
        .order_by(SourceRecord.created_at.desc())
    ).all()
    return [
        {
            "id": s.id,
            "source_type": s.source_type,
            "excerpt": s.excerpt,
            "incident_id": s.incident_id,
            "content_hash": s.content_hash,
            "created_at": s.created_at.isoformat(),
        }
        for s in sources
    ]


@app.post("/api/packets/{packet_id}/review-decisions", status_code=201)
def create_review_decision(
    packet_id: str,
    payload: ReviewDecisionCreate,
    session: Session = Depends(get_session),
) -> dict:
    try:
        decision = record_review_decision(
            session=session,
            packet_id=packet_id,
            reviewer_id=payload.reviewer_id,
            decision=payload.decision,
            override_reason=payload.override_reason,
            notes=payload.notes,
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    return _review_decision_to_dict(decision)


@app.get("/api/packets/{packet_id}/audit-events")
def list_packet_audit_events(packet_id: str, session: Session = Depends(get_session)) -> list[dict]:
    packet = session.get(UnderwritingPacket, packet_id)
    if packet is None:
        raise HTTPException(status_code=404, detail="Packet not found")
    events = session.exec(
        select(AuditEvent)
        .where(AuditEvent.entity_id == packet_id)
        .order_by(AuditEvent.created_at)
    ).all()
    return [_audit_event_to_dict(event) for event in events]


def simulate_event_queue(venue_id: str, events: list[StreamEvent]):
    time.sleep(0.5)
    live_state_manager.process_events(venue_id, events)
    print(f"[QUEUE WORKER] Processed {len(events)} events for venue {venue_id}")


@app.post("/api/venues/{venue_id}/events/stream", status_code=202)
def ingest_event_stream(venue_id: str, events: list[StreamEvent], background_tasks: BackgroundTasks):
    """High-volume ingestion — accepts immediately, processes asynchronously."""
    if venue_id not in VENUES:
        raise HTTPException(status_code=404, detail="Venue not found")
    background_tasks.add_task(simulate_event_queue, venue_id, events)
    return {"status": "accepted", "message": f"Queued {len(events)} events for asynchronous processing"}


@app.post("/api/venues/{venue_id}/events/inject")
def inject_event_sync(venue_id: str, events: list[StreamEvent]):
    """Demo endpoint — synchronously processes events so the UI can refresh immediately."""
    if venue_id not in VENUES:
        raise HTTPException(status_code=404, detail="Venue not found")
    live_state_manager.process_events(venue_id, events)
    live = live_state_manager.get_state(venue_id, VENUES[venue_id]["capacity"], VENUES[venue_id])
    return {
        "status": "processed",
        "events_count": len(events),
        "compliance_queue_length": len(live.compliance_queue),
    }


def _packet_to_dict(packet: UnderwritingPacket) -> dict:
    return {
        "id": packet.id,
        "venue_id": packet.venue_id,
        "incident_id": packet.incident_id,
        "rubric_version_id": packet.rubric_version_id,
        "status": packet.status,
        "risk_signals": packet.risk_signals,
        "action_plan": packet.action_plan,
        "claims_timeline": packet.claims_timeline,
        "memo": packet.memo,
        "citation_ids": packet.citation_ids,
        "validation": packet.validation,
        "snapshot_hash": packet.snapshot_hash,
        "generated_at": packet.generated_at.isoformat(),
    }


def _review_decision_to_dict(decision: ReviewDecision) -> dict:
    return {
        "id": decision.id,
        "packet_id": decision.packet_id,
        "reviewer_id": decision.reviewer_id,
        "decision": decision.decision,
        "override_reason": decision.override_reason,
        "notes": decision.notes,
        "decided_at": decision.decided_at.isoformat(),
    }


def _audit_event_to_dict(event: AuditEvent) -> dict:
    return {
        "id": event.id,
        "actor_id": event.actor_id,
        "actor_type": event.actor_type,
        "entity_type": event.entity_type,
        "entity_id": event.entity_id,
        "event_type": event.event_type,
        "metadata": event.event_metadata,
        "created_at": event.created_at.isoformat(),
    }


@app.get("/api/venues/{venue_id}/live", response_model=LiveVenueState)
def get_live_state(venue_id: str) -> LiveVenueState:
    if venue_id not in VENUES:
        raise HTTPException(status_code=404, detail="Venue not found")

    return live_state_manager.get_state(venue_id, VENUES[venue_id]["capacity"], VENUES[venue_id])


@app.get("/api/venues/{venue_id}/risk-score")
def get_venue_risk_score(venue_id: str) -> dict:
    if venue_id not in VENUES:
        raise HTTPException(status_code=404, detail="Venue not found")

    return get_risk_score(venue_id, VENUES)


@app.get("/api/venues/{venue_id}/quote")
def get_venue_quote(venue_id: str) -> dict:
    if venue_id not in VENUES:
        raise HTTPException(status_code=404, detail="Venue not found")

    return get_premium_quote(venue_id, VENUES)


@app.post("/api/venues/{venue_id}/compliance/{item_id}/upload")
async def upload_compliance_evidence(venue_id: str, item_id: str, file: UploadFile = File(...)) -> dict:
    if venue_id not in VENUES:
        raise HTTPException(status_code=404, detail="Venue not found")

    live_state_manager.resolve_compliance_item(venue_id, item_id)
    return {
        "status": "accepted",
        "item_id": item_id,
        "filename": file.filename,
    }
