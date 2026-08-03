import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

os.environ.setdefault("JOBAGENT_REAL_DATA_ONLY", "1")

from backend.db import init_db
from backend.db import SessionLocal
from backend.main import app as api_app
from backend.models import AgentRun, EmailThread, Followup, Job


app = FastAPI(title="JobAgent")


@app.on_event("startup")
def startup():
    init_db()
    db = SessionLocal()
    try:
        mock_thread_ids = [
            row.id for row in db.query(EmailThread.id).filter(EmailThread.source == "mock")
        ]
        if mock_thread_ids:
            db.query(Followup).filter(Followup.related_thread_id.in_(mock_thread_ids)).delete(
                synchronize_session=False
            )
        db.query(EmailThread).filter(EmailThread.source == "mock").delete(
            synchronize_session=False
        )
        db.query(AgentRun).filter(AgentRun.mode == "mock").delete(
            synchronize_session=False
        )
        db.query(Job).filter(Job.source == "mock").delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()


@app.get("/healthz")
def healthz():
    return {"status": "ok"}


app.mount("/api", api_app)

frontend_dir = Path(__file__).resolve().parents[1] / "frontend" / "dist"
app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
