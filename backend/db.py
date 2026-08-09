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
    existing_tables = set(inspector.get_table_names())
    quote = db_engine.dialect.identifier_preparer.quote

    with db_engine.begin() as connection:
        for table in Base.metadata.sorted_tables:
            if table.name not in existing_tables:
                continue
            existing_columns = {
                column["name"] for column in inspector.get_columns(table.name)
            }
            for column in table.columns:
                if column.name in existing_columns:
                    continue
                column_type = column.type.compile(dialect=db_engine.dialect)
                connection.execute(text(
                    f"ALTER TABLE {quote(table.name)} ADD COLUMN "
                    f"{quote(column.name)} {column_type}"
                ))
