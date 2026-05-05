import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict
from sqlmodel import Session, select
from app.database import engine
from app.models import WorkflowExecution, WorkflowTask
from app.orchestration.workers import WORKER_REGISTRY

class WorkflowEngine:
    def __init__(self, workflows_dir: Path | None = None):
        self._workflows_dir = workflows_dir or Path(__file__).parent / "workflows"

    def _load_workflow_def(self, workflow_name: str) -> Dict[str, Any]:
        workflow_path = self._workflows_dir / f"{workflow_name}.json"
        if not workflow_path.exists():
            # Fallback to incident_underwriting if not found
            workflow_path = self._workflows_dir / "incident_underwriting.json"
        
        with open(workflow_path, "r") as f:
            return json.load(f)

    async def start_workflow(self, workflow_name: str, initial_context: Dict[str, Any]) -> str:
        execution_id = str(uuid.uuid4())
        workflow_def = self._load_workflow_def(workflow_name)

        with Session(engine) as session:
            # 1. Create Workflow Execution record
            execution = WorkflowExecution(
                id=execution_id,
                workflow_name=workflow_name,
                status="RUNNING",
                context=initial_context,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            session.add(execution)

            # 2. Create tasks based on definition
            for i, task_def in enumerate(workflow_def["tasks"]):
                task = WorkflowTask(
                    id=f"{execution_id}_{i}",
                    execution_id=execution_id,
                    task_index=i,
                    task_name=task_def["name"],
                    status="PENDING"
                )
                session.add(task)
            
            session.commit()
        
        return execution_id

    async def execute_workflow(self, execution_id: str):
        with Session(engine) as session:
            execution = session.get(WorkflowExecution, execution_id)
            if not execution:
                return

            tasks = session.exec(
                select(WorkflowTask).where(WorkflowTask.execution_id == execution_id).order_by(WorkflowTask.task_index)
            ).all()

            context = execution.context

            for task in tasks:
                # Update task to IN_PROGRESS
                task.status = "IN_PROGRESS"
                task.started_at = datetime.now(timezone.utc)
                session.add(task)
                session.commit()

                try:
                    # Run the worker
                    worker = WORKER_REGISTRY.get(task.task_name)
                    if not worker:
                        raise ValueError(f"Worker {task.task_name} not registered")

                    output = await worker.execute(context)
                    
                    # Update context with task output
                    # Following Conductor pattern: taskReferenceName is used as key in context
                    # But here we just use the task name for simplicity or mapping
                    # Let's check workflow def for reference name
                    workflow_def = self._load_workflow_def(execution.workflow_name)
                    ref_name = next(
                        (t["taskReferenceName"] for t in workflow_def["tasks"] if t["name"] == task.task_name),
                        task.task_name
                    )
                    context[ref_name] = output

                    # Update task to COMPLETED
                    task.status = "COMPLETED"
                    task.output = output
                    task.completed_at = datetime.now(timezone.utc)

                    execution.context = context
                    execution.updated_at = datetime.now(timezone.utc)
                    
                    session.add(task)
                    session.add(execution)
                    session.commit()

                except Exception as e:
                    task.status = "FAILED"
                    task.output = {"error": str(e)}
                    task.completed_at = datetime.now(timezone.utc)

                    execution.status = "FAILED"
                    execution.updated_at = datetime.now(timezone.utc)
                    
                    session.add(task)
                    session.add(execution)
                    session.commit()
                    return # Halt execution on failure

            # Workflow COMPLETED
            execution.status = "COMPLETED"
            execution.updated_at = datetime.now(timezone.utc)
            session.add(execution)
            session.commit()

    def get_workflow_status(self, execution_id: str, session: Session) -> Dict[str, Any]:
        execution = session.get(WorkflowExecution, execution_id)
        if not execution:
            return None

        tasks = session.exec(
            select(WorkflowTask).where(WorkflowTask.execution_id == execution_id).order_by(WorkflowTask.task_index)
        ).all()

        return {
            "execution_id": execution.id,
            "status": execution.status,
            "tasks": [
                {
                    "task_name": t.task_name,
                    "status": t.status,
                    "output": t.output
                }
                for t in tasks
            ],
            "context": execution.context
        }
