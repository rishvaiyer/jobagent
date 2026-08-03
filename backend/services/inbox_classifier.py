"""Classify an inbox email thread in the job-search context.

Returns category / needs_response / urgency and an optional follow-up task.
LLM mode uses a structured Claude call; mock mode uses keyword heuristics.
"""
from backend.services import llm

CLASSIFY_SCHEMA = {
    "type": "object",
    "properties": {
        "category": {
            "type": "string",
            "enum": ["recruiter", "interview", "rejection", "offer", "application_update", "other"],
        },
        "needs_response": {"type": "boolean"},
        "urgency": {"type": "string", "enum": ["high", "medium", "low"]},
        "followup_text": {"type": "string"},
        "followup_direction": {"type": "string", "enum": ["you_owe", "they_owe", "none"]},
    },
    "required": ["category", "needs_response", "urgency"],
    "additionalProperties": False,
}


def _mock_classify(thread: dict) -> dict:
    text = f"{thread.get('subject','')} {thread.get('snippet','')} {thread.get('body','')}".lower()

    def has(*words):
        return any(w in text for w in words)

    if has("unfortunately", "not moving forward", "other candidates", "regret to inform"):
        return {"category": "rejection", "needs_response": False, "urgency": "low",
                "followup_text": None, "followup_direction": "none"}
    if has("offer", "compensation package", "pleased to offer"):
        return {"category": "offer", "needs_response": True, "urgency": "high",
                "followup_text": "Review and respond to job offer", "followup_direction": "you_owe"}
    if has("interview", "schedule a call", "availability", "calendar", "chat with"):
        return {"category": "interview", "needs_response": True, "urgency": "high",
                "followup_text": "Reply with interview availability", "followup_direction": "you_owe"}
    if has("recruiter", "opportunity", "role at", "reaching out", "your background"):
        return {"category": "recruiter", "needs_response": True, "urgency": "medium",
                "followup_text": "Respond to recruiter outreach", "followup_direction": "you_owe"}
    if has("received your application", "application received", "thanks for applying", "under review"):
        return {"category": "application_update", "needs_response": False, "urgency": "low",
                "followup_text": None, "followup_direction": "none"}
    return {"category": "other", "needs_response": "?" in text, "urgency": "low",
            "followup_text": None, "followup_direction": "none"}


def classify_thread(thread: dict) -> dict:
    if not llm.is_configured():
        return {**_mock_classify(thread), "mode": "mock"}

    system = (
        "You triage a job-seeker's email inbox. Classify the thread, decide whether "
        "it needs a reply from the candidate, and rate urgency. If there's a concrete "
        "action the candidate owes, give a short follow-up task."
    )
    user = (
        f"From: {thread.get('sender','')}\n"
        f"Subject: {thread.get('subject','')}\n\n"
        f"{thread.get('body') or thread.get('snippet','')}"
    )
    try:
        result = llm.structured_call("inbox_classify", system, user, CLASSIFY_SCHEMA,
                                     max_tokens=400, expected_output_tokens=120)
        result.setdefault("followup_text", None)
        result.setdefault("followup_direction", "none")
        return {**result, "mode": "llm"}
    except Exception:
        return {**_mock_classify(thread), "mode": "mock"}
