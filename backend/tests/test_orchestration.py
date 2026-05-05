import asyncio
from pathlib import Path

from sqlmodel import Session, SQLModel, create_engine

import app.orchestration.engine as orchestration_engine
import app.orchestration.workers as orchestration_workers
from app.schemas import IncidentCreate


DEMO_INCIDENT = IncidentCreate(
    occurred_at="2026-05-02T23:13:00Z",
    location="rear bar",
    summary="Two patrons began fighting near the rear bar during a sold-out DJ event.",
    reported_by="shift-lead",
    injury_observed=False,
    police_called=False,
    ems_called=False,
)


def test_workflow_engine_runs_tasks_in_order(monkeypatch):
    db_root = Path(__file__).resolve().parents[1] / ".test-temp" / "workflow"
    db_root.mkdir(parents=True, exist_ok=True)
    db_path = db_root / "workflow.db"
    test_engine = create_engine(
        f"sqlite:///{db_path}",
        connect_args={"check_same_thread": False},
    )
    SQLModel.metadata.create_all(test_engine)

    async def fast_sleep(*args, **kwargs):
        return None

    monkeypatch.setattr(orchestration_engine, "engine", test_engine)
    monkeypatch.setattr(orchestration_workers.asyncio, "sleep", fast_sleep)

    runtime = orchestration_engine.WorkflowEngine(
        workflows_dir=Path(__file__).resolve().parents[1] / "app" / "orchestration" / "workflows",
    )

    execution_id = asyncio.run(
        runtime.start_workflow(
            "incident_underwriting",
            {
                "venue_id": "elsewhere-brooklyn",
                "incident_payload": DEMO_INCIDENT.model_dump(),
            },
        )
    )

    with Session(test_engine) as session:
        initial_status = runtime.get_workflow_status(execution_id, session)

    assert initial_status is not None
    assert initial_status["status"] == "RUNNING"
    assert [task["task_name"] for task in initial_status["tasks"]] == [
        "retrieval_agent",
        "risk_evaluator_agent",
        "underwriter_memo_agent",
    ]

    asyncio.run(runtime.execute_workflow(execution_id))

    with Session(test_engine) as session:
        final_status = runtime.get_workflow_status(execution_id, session)

    assert final_status is not None
    assert final_status["status"] == "COMPLETED"
    assert [task["status"] for task in final_status["tasks"]] == [
        "COMPLETED",
        "COMPLETED",
        "COMPLETED",
    ]
    assert final_status["context"]["retrieval"]["citations"]
    assert final_status["context"]["risk_eval"]["risk_signal"]["severity"] == "medium"
    assert final_status["context"]["memo_drafting"]["underwriting_memo"]["review_status"] == "draft"
