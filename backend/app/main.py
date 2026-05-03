from app.fastapi_compat import patch_starlette_router_for_fastapi

patch_starlette_router_for_fastapi()

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session
import time

from app.incident_flow import create_brawl_incident_flow
from app.schemas import IncidentCreate, IncidentFlowResponse, StreamEvent
from app.seed_data import VENUES
from app.database import create_db_and_tables, get_session
from app.models import Venue

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    # Seed venues if they don't exist
    with next(get_session()) as session:
        for venue_id, venue_data in VENUES.items():
            if not session.get(Venue, venue_id):
                session.add(Venue(id=venue_id, name=venue_data["name"]))
        session.commit()
    yield

app = FastAPI(title="Third Space Risk OS", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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


@app.post("/api/venues/{venue_id}/incidents", response_model=IncidentFlowResponse, status_code=201)
def create_incident(venue_id: str, payload: IncidentCreate, session: Session = Depends(get_session)) -> IncidentFlowResponse:
    if venue_id not in VENUES:
        raise HTTPException(status_code=404, detail="Venue not found")
    return create_brawl_incident_flow(venue_id, payload, session)


def simulate_event_queue(venue_id: str, events: list[StreamEvent]):
    """
    Simulates asynchronous event processing (e.g., pushing to Kafka).
    This allows the main thread to return a 202 instantly during high traffic.
    """
    time.sleep(0.5)
    print(f"\n[QUEUE WORKER] Asynchronously processed {len(events)} events for venue {venue_id}")
    for event in events:
        print(f"  -> {event.event_type} | {event.event_id} | Payload: {event.payload}")


@app.post("/api/venues/{venue_id}/events/stream", status_code=202)
def ingest_event_stream(venue_id: str, events: list[StreamEvent], background_tasks: BackgroundTasks):
    """
    High-volume ingestion endpoint. 
    Accepts POS transactions, door scans, and camera metadata.
    """
    if venue_id not in VENUES:
        raise HTTPException(status_code=404, detail="Venue not found")
    
    # 1. Instantly accept the payload (Sub-50ms latency).
    # 2. Push the heavy processing to a background queue.
    background_tasks.add_task(simulate_event_queue, venue_id, events)
    
    return {"status": "accepted", "message": f"Queued {len(events)} events for asynchronous processing"}
