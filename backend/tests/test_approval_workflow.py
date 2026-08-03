import unittest

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.db import Base, get_db
from backend.main import app


class ApprovalWorkflowTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(cls.engine)
        cls.session_factory = sessionmaker(bind=cls.engine)

        def test_db():
            db = cls.session_factory()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = test_db
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        cls.client.close()
        app.dependency_overrides.clear()
        cls.engine.dispose()

    def test_review_and_approval_boundaries(self):
        found = self.client.post("/agent/find-jobs")
        self.assertEqual(found.status_code, 200)
        job = self.client.get("/jobs").json()[0]

        first = self.client.post(f"/jobs/{job['id']}/draft-application")
        duplicate = self.client.post(f"/jobs/{job['id']}/draft-application")
        self.assertEqual(first.status_code, 200)
        self.assertEqual(duplicate.json()["id"], first.json()["id"])

        app_id = first.json()["id"]
        saved = self.client.put(
            f"/applications/{app_id}/draft",
            json={"cover_letter": "Reviewed cover letter", "notes": "Reviewed notes"},
        )
        self.assertEqual(saved.status_code, 200)
        self.assertEqual(saved.json()["draft_cover_letter"], "Reviewed cover letter")

        scanned = self.client.post("/agent/scan-inbox")
        self.assertEqual(scanned.status_code, 200)
        thread = next(t for t in self.client.get("/inbox").json() if t["needs_response"])
        drafted = self.client.post(f"/inbox/{thread['id']}/draft-reply")
        self.assertEqual(drafted.status_code, 200)

        edited = self.client.put(
            f"/inbox/{thread['id']}/draft",
            json={"draft_text": "Reviewed reply"},
        )
        self.assertEqual(edited.status_code, 200)
        self.assertEqual(edited.json()["draft_text"], "Reviewed reply")

        sent = self.client.post(f"/inbox/{thread['id']}/send")
        self.assertEqual(sent.status_code, 200)
        self.assertFalse(sent.json()["sent"])
        self.assertIn("locally", sent.json()["note"])


if __name__ == "__main__":
    unittest.main()
