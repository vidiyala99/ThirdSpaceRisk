# Third Space Risk Requirements and Design

Last updated: 2026-05-03

## Purpose

This document is the living source of truth for the current Third Space Risk demo. It serves two audiences:

- Interview briefing: a concise explanation of the product thesis, demo flow, and technical choices.
- Engineering handoff: a requirements/design record for what exists today, how it works, what is still mocked, and what should come next.

## Product Thesis

Third Space Risk is an underwriting and claims-defensibility operating system for venues. The core idea is that music venues, bars, and other "third spaces" generate operational signals every night, but those signals are usually disconnected from insurance workflows.

The demo shows how a venue incident can become a structured underwriting packet:

- incident details from venue staff
- relevant operational context from door count, POS, staffing, policy, and camera metadata
- a risk signal for underwriter review
- an evidence checklist for claims defensibility
- an underwriting memo with open questions
- a reconstructed timeline with cited sources

The current scope is intentionally narrow: one venue, one brawl incident, one underwriting review packet.

## Current Demo Scope

The implemented demo centers on Elsewhere Brooklyn as a synthetic venue profile.

Primary user path:

1. User opens the underwriter console at `/underwriter`.
2. The page displays a fallback preview packet so the experience is useful before the backend is called.
3. User clicks `RUN BRAWL FLOW`.
4. Frontend posts a fixed demo incident to the backend.
5. Backend builds a cited incident review packet from seeded knowledge sources and stream events.
6. Frontend replaces the fallback preview with the live API response.

Secondary path:

1. Backend exposes a high-volume event ingestion endpoint.
2. Event payloads are accepted immediately with `202`.
3. Processing is simulated through a FastAPI background task.

## What Exists Today

### Backend

Location: `backend/`

Implemented with FastAPI, SQLModel, SQLite, and Pydantic.

Current endpoints:

- `GET /api/health`
  - Returns service health.
- `GET /api/venues`
  - Returns seeded venue data.
- `POST /api/venues/{venue_id}/incidents`
  - Creates a brawl incident review packet for a known venue.
  - Persists the incident and evaluation to SQLite.
  - Returns an `IncidentFlowResponse`.
- `POST /api/venues/{venue_id}/events/stream`
  - Accepts a list of stream events.
  - Simulates async queue processing through a background task.

Important backend files:

- `backend/app/main.py`
  - FastAPI app, startup seeding, CORS, routes.
- `backend/app/incident_flow.py`
  - Core brawl incident workflow.
- `backend/app/schemas.py`
  - API request/response models.
- `backend/app/models.py`
  - SQLModel persistence models.
- `backend/app/rag.py`
  - Simple keyword-based retrieval over seeded documents and stream events.
- `backend/app/agents/`
  - Product runtime Markdown contracts for future underwriting packet agents.
  - Contracts exist for retrieval, risk evaluation, underwriter memo drafting, customer actions, and claims timeline reconstruction.
  - These contracts are loaded at runtime by a deterministic orchestration layer.
- `backend/app/agents/runtime.py`
  - Deterministic agent workflow/orchestration layer for the underwriting packet flow.
  - Loads required Markdown contracts, records step metadata internally, and executes retrieval, risk evaluation, customer actions, timeline reconstruction, and memo drafting without live LLM calls.
- `backend/app/seed_data.py`
  - Synthetic venue, knowledge sources, and stream events.
- `backend/app/database.py`
  - SQLite engine and session provider.
- `backend/app/fastapi_compat.py`
  - Compatibility patch for FastAPI/Starlette mismatch in this local environment.

### Frontend

Location: `frontend/`

Implemented with Next.js, React, and plain CSS.

Current routes:

- `/`
  - Venue-style dashboard with industrial visual treatment.
  - Currently static.
- `/underwriter`
  - Editorial underwriter dossier UI.
  - Calls the backend incident flow.
  - Shows incident details, risk signal, memo, RAG evidence, and timeline.

Important frontend files:

- `frontend/src/app/underwriter/page.tsx`
  - Main interactive underwriter console.
- `frontend/src/app/page.tsx`
  - Static venue portal/dashboard view.
- `frontend/src/app/styles.css`
  - Global styling, venue theme, editorial theme, responsive rules.
- `frontend/src/lib/incidentView.mjs`
  - Small helper for summarizing evidence.
- `frontend/src/lib/incidentView.test.mjs`
  - Node assertion test for evidence summary behavior.

### Tests and Verification

Backend:

- `backend/tests/test_brawl_incident_flow.py`
  - Verifies the incident endpoint creates a cited review packet.
  - Verifies the same demo incident can be submitted more than once without primary-key collision.
- `backend/pytest.ini`
  - Restricts test collection to `tests/` so generated pytest cache temp directories do not break test discovery.

Frontend:

- `npm run test`
  - Runs `node src/lib/incidentView.test.mjs`.
- `npm run build`
  - Verifies Next.js production build and TypeScript compilation.

Latest verified commands:

```powershell
cd backend
pytest -q

cd ..\frontend
npm run test
npm run build
```

## Architecture

### Request Flow

```text
Browser /underwriter
  -> POST /api/venues/elsewhere-brooklyn/incidents
    -> validate venue id
    -> create incident object
    -> retrieve seeded citations
    -> create risk signal
    -> create action plan
    -> build claims timeline
    -> create underwriting memo
    -> persist incident and evaluation
    -> return IncidentFlowResponse
  -> render dossier sections from response
```

### Data Flow

Input:

- Hard-coded demo incident in `frontend/src/app/underwriter/page.tsx`.

Context sources:

- Policy text.
- Staffing log.
- Controls questionnaire.
- Door count event.
- POS event.
- Camera metadata event.

Processing:

- `create_brawl_incident_flow()` creates the incident record and delegates packet assembly to the deterministic agent runtime.
- `backend/app/agents/runtime.py` loads the Markdown contracts and executes named agent steps.
- The retrieval step uses `VenueKnowledgeBase.retrieve()` to score seeded documents using query terms.
- Risk evaluation, customer actions, timeline reconstruction, and memo drafting are deterministic Python implementations behind the agent boundary.
- No LLM, provider integration, or prompt executor is called by the backend.

Output:

- Incident packet containing incident details, risk signal, action plan, claims timeline, underwriting memo, and citations.

### Agent Contracts Roadmap

The project now has product-facing Markdown contracts and deterministic runtime orchestration for the underwriting packet flow:

- Retrieval agent
  - Defines search intent, required source types, citation standards, missing evidence, and retrieval review status.
- Risk evaluator agent
  - Maps incident facts and cited evidence to risk type, severity, confidence, explanation, mitigating factors, and review status.
- Underwriter memo agent
  - Drafts underwriter-facing summary, evidence summary, open questions, audit notes, and cited underwriting impact.
- Customer action agent
  - Converts packet gaps into venue/customer-facing evidence tasks while avoiding unsupported liability language.
- Claims timeline agent
  - Reconstructs event chronology with source ids, confidence, gaps, and defensibility notes.

Contracts-first and deterministic orchestration were chosen deliberately:

- Explainability: the demo can show how agent responsibilities are separated before model behavior is introduced.
- Testability: expected inputs, outputs, citations, review flags, and failure modes can become eval fixtures.
- Demo integrity: the current system stays deterministic instead of introducing unvalidated LLM behavior into the interview flow.

Provider-backed runtime integration should come later, after provider setup and evals exist. A future implementation may route each packet step through an LLM, a deterministic fallback, or a hybrid path. The current request path already uses the agent orchestration boundary, but each step still executes deterministic Python logic.

### Persistence

SQLite is used for MVP persistence.

Tables:

- `Venue`
  - `id`
  - `name`
- `IncidentRecord`
  - incident metadata and reported facts
  - one-to-one relationship to evaluation
- `IncidentEvaluation`
  - JSON fields for risk signal, action plan, underwriting memo, and claims timeline

Incident IDs use a UUID suffix so repeated demo submissions do not collide.

## API Contract

### IncidentCreate

```json
{
  "occurred_at": "2026-05-02T23:13:00Z",
  "location": "rear bar",
  "summary": "Two patrons began fighting near the rear bar during a sold-out DJ event.",
  "reported_by": "shift-lead",
  "injury_observed": false,
  "police_called": false,
  "ems_called": false
}
```

### IncidentFlowResponse

Top-level fields:

- `incident`
- `risk_signal`
- `action_plan`
- `claims_timeline`
- `underwriting_memo`

The frontend currently depends on this response shape directly.

## Local Development

Backend:

```powershell
cd backend
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Frontend:

```powershell
cd frontend
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Open:

- Frontend: `http://localhost:3000/underwriter`
- Backend health: `http://localhost:8000/api/health`

Important CORS note:

- Backend currently allows `http://localhost:3000`.
- Use `localhost` in the browser unless CORS is expanded.

## Requirements Captured So Far

### Product Requirements

- Show how operational venue data can support underwriting and claims workflows.
- Keep the demo focused on one strong scenario instead of a broad unfinished platform.
- Make evidence visible and cited, not hidden behind generic AI output.
- Preserve a clear distinction between:
  - observed incident facts
  - retrieved source evidence
  - generated risk/memo/action outputs
- Provide a local demo that can be run and explained quickly.

### Functional Requirements

- User can open an underwriter dossier UI.
- User can trigger the brawl incident flow.
- Backend returns a structured review packet.
- Review packet includes citations and timeline reconstruction.
- Incident submissions are persisted.
- Repeated demo submissions do not fail.
- Backend exposes health and venue endpoints.
- Event stream endpoint accepts high-volume event payloads asynchronously.

### Non-Functional Requirements

- Local setup should be simple enough to run before an interview.
- Build and tests should pass without manual cleanup of generated pytest temp directories.
- Frontend should render on desktop and mobile widths.
- The demo should make mocked/synthetic data obvious enough for engineering clarity while still feeling credible as a product prototype.

## Known Limitations

- Only one synthetic venue exists.
- Only one incident type is implemented.
- Incident creation uses a hard-coded frontend payload.
- Retrieval is keyword-based, not vector search or a production RAG system.
- The underwriting memo is deterministic template logic, not LLM-generated output.
- Product-facing agent contracts are loaded by deterministic runtime orchestration, but no LLM provider or prompt runner is wired into the packet flow.
- No model eval suite or provider-backed fallback router exists yet.
- Event stream ingestion logs simulated async processing instead of using a real queue.
- SQLite database path is local and minimal.
- No authentication or tenant isolation exists.
- No API client abstraction exists on the frontend.
- No frontend integration tests or browser visual regression tests exist.
- The root `/` venue dashboard is static and disconnected from the backend.
- Existing local logs, PID files, `.next`, `node_modules`, SQLite DB, and pytest temp files are runtime artifacts rather than product source.

## Open Questions

Product:

- Who is the primary first user: underwriter, broker, venue operator, or internal Third Space team?
- Should the strongest demo flow be underwriting review, claims defensibility, or venue risk operations?
- What real venue systems matter most for ingestion: POS, ticketing, door counters, security logs, cameras, incident forms, staffing, or insurance documents?
- What should be automated versus explicitly marked for human review?
- What output would a carrier or broker actually trust enough to use?

Technical:

- Should RAG move to ChromaDB or stay deterministic until real source data exists?
- Should generated evaluations be stored as immutable snapshots or recalculated on demand?
- Should incident IDs be server-generated UUIDs only, or should there also be human-readable incident numbers?
- Should frontend types be generated from backend schemas?
- Should the app use a real API client and loading/error state pattern before more routes are added?

Demo:

- Which route should be the primary interview demo: `/underwriter` or `/`?
- Should the static venue dashboard become a venue-operator workflow or remain a visual concept?
- What is the shortest story that explains why this is not just a generic incident tracker?

## Recommended Next Milestone

Milestone: make the underwriter demo feel like a coherent product slice.

Suggested requirements:

1. Add a source-of-truth demo scenario document.
2. Replace hard-coded frontend packet fallback duplication with shared fixtures or an API-backed initial state.
3. Add a simple incident intake form or scenario selector.
4. Add a persisted incident list endpoint and UI.
5. Make citations clickable or expandable so evidence review is explicit.
6. Add basic frontend API client helpers and response typing.
7. Add one browser smoke test for `/underwriter`.
8. Clean runtime artifacts into ignored/generated paths if this becomes a Git repo.

## Interview Talking Points

- "I scoped the prototype around one credible workflow: a brawl at a live venue becoming an underwriting review packet."
- "The important product idea is not incident logging by itself. It is connecting operational signals to insurance decisions with citations."
- "I kept the first backend deterministic so the demo is explainable and testable. The RAG layer is intentionally simple right now."
- "The architecture separates reported facts, source evidence, risk signal, action plan, timeline, and underwriting memo."
- "The current limitations are clear: one venue, one scenario, mocked data, no auth, and simulated async ingestion. The next milestone is turning this from a demo packet into a small but coherent workflow."
- "I added tests around the incident flow, including a regression for repeated submissions, because demo flows should not break after one click."

## Maintenance Notes

When changing the project, update this document if the change affects:

- supported user flows
- API response shape
- data model
- local run commands
- known limitations
- next milestone scope
- interview explanation
