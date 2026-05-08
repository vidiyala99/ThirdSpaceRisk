# Orchestration Engine & Security Control Room Simulator Spec

## Overview
This feature introduces a "Conductor-lite" orchestration engine and an interactive "Security Control Room" simulator. The goal is to move beyond static demo packets and show the live, asynchronous lifecycle of incident evaluation.

## Problem Statement
Current incidents are processed in a synchronous, hardcoded loop. This doesn't demonstrate the scalability or "agentic" nature of the product. We need a way to:
1. Define complex workflows in JSON (Conductor-native).
2. Execute those workflows asynchronously with observability.
3. Allow users to "inject" custom incident scenarios in real-time.

## Proposed Design

### 1. Conductor-lite Orchestration (Backend)
- **Workflow Registry:** A directory `backend/app/orchestration/workflows/` containing JSON files following the Netflix Conductor schema.
- **Engine:** A `WorkflowEngine` class that manages task execution, state transitions (RUNNING, COMPLETED, FAILED), and context passing.
- **Async Execution:** Workflows will run as FastAPI `BackgroundTasks`. We will use `asyncio.sleep` (1-2s) between agent steps to simulate "Agent Thinking" for the demo.
- **Persistence:** Workflow status and task traces will be persisted in a new `WorkflowExecution` table in SQLite.

### 2. Security Control Room Simulator (Frontend)
- **Route:** `/simulator`
- **Theme:** High-contrast "Command Center" aesthetic.
- **Scenario Console:** Pre-configured templates (Brawl, Overcapacity, VIP Incident).
- **Live Ingestion Feed:** A terminal-style scrolling view of the `StreamEvent` payloads being prepared for injection.
- **Workflow Tracker:** A real-time stepper that polls the backend to show the current active task (e.g., "Risk Evaluator is analyzing POS trends...").

### 3. Data Flow
1. **Frontend:** User clicks "INJECT SCENARIO" on `/simulator`.
2. **Backend:** `POST /api/orchestration/start` creates a `WorkflowExecution` and starts a background task.
3. **Engine:** Executes tasks in order, updating the DB after each step.
4. **Frontend:** Polls `GET /api/orchestration/{id}/status` and updates the "Command Center" UI.

## Components

### Backend
- `app/orchestration/engine.py`: Core state machine.
- `app/orchestration/workers.py`: Wrappers for existing Agents (Retrieval, Risk, etc.) to match worker interfaces.
- `app/orchestration/models.py`: SQLModel definitions for workflow tracking.

### Frontend
- `app/simulator/page.tsx`: The main "Control Room" UI.
- `app/simulator/components/EventFeed.tsx`: Monospaced data stream component.
- `app/simulator/components/WorkflowStepper.tsx`: Visual progress indicator.

## Success Criteria
- [ ] User can select a "Brawl" template and see events populated.
- [ ] Clicking "Inject" starts an async workflow.
- [ ] The UI updates in real-time as tasks complete (without full page refresh).
- [ ] Final underwriting packet is visible at the end of the trace.

## Technical Tradeoffs
- **Local SQLite vs Redis:** We will use SQLite for task state to keep the demo zero-dependency, even though a real Conductor setup uses Redis/Postgres.
- **Polling vs WebSockets:** We will use simple 1s polling for state updates to ensure reliability in different network environments (e.g., interview guest Wi-Fi).
