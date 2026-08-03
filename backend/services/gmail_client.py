"""Gmail integration with a mock fallback.

Real mode (Google OAuth configured): read recent threads, create unsent drafts,
and send a draft *only* when the user explicitly approves it. Scopes are limited
to readonly + compose + send — no modify/delete.

Mock mode (no credentials): return sample threads and store "drafts" locally only.
This keeps the whole app runnable on Linux/CI and powers the static demo.
"""
import base64
import os
from datetime import datetime, timedelta
from email.mime.text import MIMEText

from backend.config import get_gmail_paths

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.compose",
    "https://www.googleapis.com/auth/gmail.send",
]

_NOW = datetime(2026, 6, 28, 9, 0, 0)


def _ago(hours):
    return _NOW - timedelta(hours=hours)


MOCK_THREADS = [
    {
        "gmail_thread_id": "mock-t1",
        "subject": "Senior Engineer role at Brightwave — quick chat?",
        "sender": "Dana Whit <dana@brightwave.example>",
        "snippet": "Hi! I came across your background and think you'd be a great fit...",
        "body": ("Hi,\n\nI'm a recruiter at Brightwave and came across your background — "
                 "really impressive work. We're hiring a Senior Engineer (remote) and I'd love "
                 "to tell you more. Are you open to a quick call this week?\n\nBest,\nDana"),
        "latest_at": _ago(3),
    },
    {
        "gmail_thread_id": "mock-t2",
        "subject": "Interview availability — Aperture Labs",
        "sender": "Aperture Recruiting <hiring@aperture.example>",
        "snippet": "Thanks for applying! We'd like to schedule a first interview...",
        "body": ("Hello,\n\nThanks for applying to the Software Engineer role. We'd like to "
                 "schedule a 45-minute first interview. Could you share a few times that work "
                 "for you next week?\n\nThanks,\nAperture Recruiting"),
        "latest_at": _ago(20),
    },
    {
        "gmail_thread_id": "mock-t3",
        "subject": "Your application to Cedar & Co",
        "sender": "no-reply <jobs@cedar.example>",
        "snippet": "We've received your application and will be in touch...",
        "body": ("Hi,\n\nThis is a confirmation that we received your application. Our team "
                 "reviews applications on a rolling basis and will reach out if there's a fit.\n\n"
                 "— Cedar & Co Talent"),
        "latest_at": _ago(30),
    },
    {
        "gmail_thread_id": "mock-t4",
        "subject": "Update on your application — Northwind",
        "sender": "Talent Team <careers@northwind.example>",
        "snippet": "After careful consideration we won't be moving forward...",
        "body": ("Hi,\n\nThank you for your interest in Northwind. After careful consideration, "
                 "we won't be moving forward with your application at this time. We wish you the "
                 "best in your search.\n\nRegards,\nNorthwind Talent"),
        "latest_at": _ago(48),
    },
]


def _load_service():
    """Return an authenticated Gmail service, or None if not configured/available."""
    paths = get_gmail_paths()
    token_path = paths["token"]
    secret_path = paths["client_secret"]
    if not token_path:
        return None
    try:
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
        from googleapiclient.discovery import build
        import os
        creds = None
        if os.path.exists(token_path):
            creds = Credentials.from_authorized_user_file(token_path, SCOPES)
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
            with open(token_path, "w") as f:
                f.write(creds.to_json())
        if not creds or not creds.valid:
            # First-time auth requires a local browser flow; documented in the README.
            if not secret_path or not os.path.exists(secret_path):
                return None
            from google_auth_oauthlib.flow import InstalledAppFlow
            flow = InstalledAppFlow.from_client_secrets_file(secret_path, SCOPES)
            creds = flow.run_local_server(port=0)
            with open(token_path, "w") as f:
                f.write(creds.to_json())
        return build("gmail", "v1", credentials=creds, cache_discovery=False)
    except Exception:
        return None


def status() -> str:
    if _load_service():
        return "connected"
    return "disconnected" if os.getenv("JOBAGENT_REAL_DATA_ONLY") == "1" else "mock"


def fetch_threads(lookback_days: int = 14, max_threads: int = 25) -> list[dict]:
    service = _load_service()
    if service is None:
        if os.getenv("JOBAGENT_REAL_DATA_ONLY") == "1":
            return []
        return list(MOCK_THREADS)

    try:
        query = f"newer_than:{lookback_days}d category:primary"
        resp = service.users().threads().list(userId="me", q=query, maxResults=max_threads).execute()
        out = []
        for t in resp.get("threads", []):
            full = service.users().threads().get(userId="me", id=t["id"], format="metadata",
                                                 metadataHeaders=["Subject", "From", "Date"]).execute()
            msgs = full.get("messages", [])
            last = msgs[-1] if msgs else {}
            headers = {h["name"]: h["value"] for h in last.get("payload", {}).get("headers", [])}
            out.append({
                "gmail_thread_id": t["id"],
                "subject": headers.get("Subject", "(no subject)"),
                "sender": headers.get("From", ""),
                "snippet": last.get("snippet", ""),
                "body": last.get("snippet", ""),
                "latest_at": _NOW,
            })
        return out
    except Exception:
        if os.getenv("JOBAGENT_REAL_DATA_ONLY") == "1":
            return []
        return list(MOCK_THREADS)


def _to_address(sender: str) -> str:
    if "<" in sender and ">" in sender:
        return sender.split("<", 1)[1].split(">", 1)[0].strip()
    return sender.strip()


def create_draft(thread: dict, body_text: str) -> str | None:
    """Create an unsent Gmail draft replying to the thread. Returns draft id or None (mock)."""
    service = _load_service()
    if service is None:
        return None
    try:
        message = MIMEText(body_text)
        message["To"] = _to_address(thread.get("sender", ""))
        message["Subject"] = "Re: " + (thread.get("subject") or "")
        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
        body = {"message": {"raw": raw}}
        if thread.get("gmail_thread_id"):
            body["message"]["threadId"] = thread["gmail_thread_id"]
        created = service.users().drafts().create(userId="me", body=body).execute()
        return created.get("id")
    except Exception:
        return None


def update_draft(gmail_draft_id: str, thread: dict, body_text: str) -> bool:
    """Replace an existing unsent Gmail draft with the reviewed local text."""
    service = _load_service()
    if service is None or not gmail_draft_id:
        return False
    try:
        message = MIMEText(body_text)
        message["To"] = _to_address(thread.get("sender", ""))
        message["Subject"] = "Re: " + (thread.get("subject") or "")
        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
        body = {"message": {"raw": raw}}
        if thread.get("gmail_thread_id"):
            body["message"]["threadId"] = thread["gmail_thread_id"]
        service.users().drafts().update(
            userId="me", id=gmail_draft_id, body=body
        ).execute()
        return True
    except Exception:
        return False


def send_draft(gmail_draft_id: str) -> bool:
    """Send a previously-created Gmail draft. Only called on explicit user approval."""
    service = _load_service()
    if service is None or not gmail_draft_id:
        return False
    try:
        service.users().drafts().send(userId="me", body={"id": gmail_draft_id}).execute()
        return True
    except Exception:
        return False
