# Orchestration Engine & Security Control Room Simulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a Conductor-lite asynchronous orchestration engine and an interactive "Security Control Room" simulator UI.

**Architecture:** A JSON-based workflow engine executes "Agent Workers" as FastAPI background tasks. The frontend polls for status updates to show a live trace of the incident evaluation process.

**Tech Stack:** FastAPI, SQLModel, Next.js, TypeScript

---

### Task 1: Backend Orchestration Models & Registry

**Files:**
- Modify: `backend/app/models.py`
- Create: `backend/app/orchestration/workflows/incident_underwriting.json`

- [ ] **Step 1: Add Workflow models to models.py**

```python
class WorkflowExecution(SQLModel, table=True):
    id: str = Field(primary_key=True)
    workflow_name: str
    status: str = "RUNNING" # RUNNING, COMPLETED, FAILED
    context: str = "{}" # JSON string of current context
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class WorkflowTask(SQLModel, table=True):
    id: str = Field(primary_key=True)
    execution_id: str = Field(foreign_key="workflowexecution.id")
    task_name: str
    status: str = "PENDING" # PENDING, IN_PROGRESS, COMPLETED, FAILED
    output: str | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
```

- [ ] **Step 2: Create the initial workflow definition**

```json
{
  "name": "incident_underwriting_workflow",
  "version": 1,
  "tasks": [
    { "name": "retrieval_agent", "taskReferenceName": "retrieval" },
    { "name": "risk_evaluator_agent", "taskReferenceName": "risk_eval" },
    { "name": "underwriter_memo_agent", "taskReferenceName": "memo_drafting" }
  ]
}
```

### Task 2: The Orchestration Engine & Workers

**Files:**
- Create: `backend/app/orchestration/engine.py`
- Create: `backend/app/orchestration/workers.py`

- [ ] **Step 1: Implement the WorkflowEngine**

Create a class that loads the JSON, iterates tasks, calls workers, and updates the database.

- [ ] **Step 2: Implement Worker Wrappers**

Wrap existing agents from `runtime.py` into a consistent `Worker` interface.

### Task 3: Simulator API Endpoints

**Files:**
- Modify: `backend/app/main.py`
- Modify: `backend/app/schemas.py`

- [ ] **Step 1: Add Workflow schemas**

Define `WorkflowStatusResponse` and `WorkflowStartRequest`.

- [ ] **Step 2: Add API routes**

- `POST /api/orchestration/start`: Starts a workflow as a `BackgroundTasks`.
- `GET /api/orchestration/{id}/status`: Returns the current execution state and task trace.

### Task 4: Security Control Room UI (Simulator)

**Files:**
- Create: `frontend/src/app/simulator/page.tsx`
- Create: `frontend/src/app/simulator/simulator.css` (or add to global styles)

- [ ] **Step 1: Implement the "Command Center" layout**

Dark mode, monospaced fonts, glowing borders.

- [ ] **Step 2: Implement the Scenario Console**

Dropdown for templates (Brawl, Theft) and an "Inject" button.

- [ ] **Step 3: Implement Live Workflow Tracking**

Polling logic to update the stepper and event feed as the backend background task progresses.

### Task 5: End-to-End Verification

- [ ] **Step 1: Test the full flow**
1. Open `/simulator`.
2. Select "Brawl".
3. Click "Inject".
4. Observe the agents working in the stepper.
5. Verify the final underwriting packet appears.
