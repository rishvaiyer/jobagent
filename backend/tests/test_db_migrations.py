import unittest

from sqlalchemy import create_engine, inspect, text

from backend.db import _add_legacy_columns


class DatabaseMigrationTest(unittest.TestCase):
    def test_adds_missing_agent_run_mode_without_touching_rows(self):
        engine = create_engine("sqlite://")
        with engine.begin() as connection:
            connection.execute(text(
                "CREATE TABLE agent_runs (id INTEGER PRIMARY KEY, kind VARCHAR(50))"
            ))
            connection.execute(text(
                "INSERT INTO agent_runs (id, kind) VALUES (1, 'legacy')"
            ))
            connection.execute(text(
                "CREATE TABLE jobs (id INTEGER PRIMARY KEY, title VARCHAR(255), "
                "company VARCHAR(255))"
            ))
            connection.execute(text(
                "INSERT INTO jobs (id, title, company) VALUES (2, 'Legacy role', 'Legacy Co')"
            ))

        _add_legacy_columns(engine)

        columns = {column["name"] for column in inspect(engine).get_columns("agent_runs")}
        with engine.connect() as connection:
            row = connection.execute(text("SELECT id, kind, mode FROM agent_runs")).one()
            job = connection.execute(text(
                "SELECT id, title, company, salary, status FROM jobs"
            )).one()
        self.assertIn("mode", columns)
        self.assertEqual((row.id, row.kind, row.mode), (1, "legacy", None))
        self.assertEqual(
            (job.id, job.title, job.company, job.salary, job.status),
            (2, "Legacy role", "Legacy Co", None, None),
        )
        engine.dispose()


if __name__ == "__main__":
    unittest.main()
