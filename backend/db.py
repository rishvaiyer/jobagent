import os
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from pathlib import Path

DB_PATH = Path(
    os.getenv("JOBAGENT_DB_PATH", str(Path(__file__).parent / "data" / "jobagent.db"))
).expanduser()
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from backend import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    _add_legacy_columns(engine)


def _add_legacy_columns(db_engine=engine):
    """Apply additive changes to databases created by older JobAgent builds."""
    inspector = inspect(db_engine)
    agent_run_columns = {column["name"] for column in inspector.get_columns("agent_runs")}
    if "mode" not in agent_run_columns:
        with db_engine.begin() as connection:
            connection.execute(text("ALTER TABLE agent_runs ADD COLUMN mode VARCHAR(20)"))
