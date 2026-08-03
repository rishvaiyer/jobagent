"""Dev-only synthetic seed.

Not a product feature. It exists so the full workflow (find jobs, scan inbox,
draft replies/applications, dashboard) can be verified with no API key and no
Gmail connection — e.g. on CI / Linux, and as the basis for the static demo.

Run from the `jobagent` directory:
    python -m backend.dev_seed
"""
from backend.db import SessionLocal, init_db
from backend.models import (
    AgentRun, Application, EmailDraft, EmailThread, Followup, Job, TokenUsageEstimate,
)
from backend.services import gmail_client, job_search
from backend.services.inbox_classifier import classify_thread
from backend.services.profile import get_profile


def reset_and_seed():
    init_db()
    db = SessionLocal()
    try:
        for model in (EmailDraft, Application, Followup, EmailThread, AgentRun,
                      TokenUsageEstimate, Job):
            db.query(model).delete()
        db.commit()

        # Jobs (mock search).
        result = job_search.find_jobs()
        for jd in result["jobs"]:
            db.add(Job(
                title=jd["title"], company=jd["company"], location=jd.get("location"),
                url=jd.get("url"), source=jd.get("source", "mock"),
                description=jd.get("description"), salary=jd.get("salary"),
                apply_method=jd.get("apply_method", "web"), apply_email=jd.get("apply_email"),
                match_score=int(jd.get("match_score", 0)), match_reason=jd.get("match_reason"),
                external_key=job_search.external_key(jd), status="found",
            ))
        db.commit()

        # Inbox (mock Gmail) + classification + follow-ups.
        threads = gmail_client.fetch_threads()
        for t in threads:
            cls = classify_thread(t)
            row = EmailThread(
                gmail_thread_id=t["gmail_thread_id"], subject=t.get("subject"),
                sender=t.get("sender"), snippet=t.get("snippet"), body=t.get("body"),
                category=cls["category"], needs_response=cls["needs_response"],
                urgency=cls.get("urgency"), latest_at=t.get("latest_at"), source="mock",
            )
            db.add(row)
            db.flush()
            if cls.get("followup_text") and cls.get("followup_direction", "none") != "none":
                db.add(Followup(task_text=cls["followup_text"], direction=cls["followup_direction"],
                                related_thread_id=row.id, confidence="mock"))
        db.commit()

        n_jobs = db.query(Job).count()
        n_threads = db.query(EmailThread).count()
        n_follow = db.query(Followup).count()
        print(f"Seeded {n_jobs} jobs, {n_threads} inbox threads, {n_follow} follow-ups "
              f"(profile: {get_profile().get('name','?')}).")
    finally:
        db.close()


if __name__ == "__main__":
    reset_and_seed()
