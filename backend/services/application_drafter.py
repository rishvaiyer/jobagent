"""Draft an application (cover letter + tailoring notes) for a job.

LLM mode: one structured Claude call grounded in the profile + posting.
Mock mode: a template cover letter so the workflow is demoable offline.
Nothing is submitted here — the draft is queued for the user's approval.
"""
from backend.services import llm
from backend.services.profile import get_profile, profile_summary_text

APP_SCHEMA = {
    "type": "object",
    "properties": {
        "cover_letter": {"type": "string"},
        "notes": {"type": "string"},
        "confidence": {"type": "string", "enum": ["high", "medium", "low"]},
    },
    "required": ["cover_letter", "notes", "confidence"],
    "additionalProperties": False,
}


def _mock_application(job: dict, profile: dict) -> dict:
    name = profile.get("name") or "Your Name"
    skills = ", ".join(profile.get("skills", [])[:4]) or "the role's core stack"
    cover = (
        f"Dear Hiring Team at {job.get('company','your company')},\n\n"
        f"I'm excited to apply for the {job.get('title','role')} position. "
        f"{profile.get('summary','I bring relevant experience and a track record of shipping.')}\n\n"
        f"My background lines up well here — particularly {skills} — and I'm drawn to this role "
        f"because it matches what I'm looking for: {profile.get('preferences','impactful, well-scoped work')}.\n\n"
        "I'd welcome the chance to discuss how I can contribute. Thank you for your consideration.\n\n"
        f"Best regards,\n{name}"
    )
    notes = ("Sample cover letter (no API key configured). Tailor the opening to the company's "
             "mission and swap in one concrete, quantified accomplishment before submitting.")
    return {"cover_letter": cover, "notes": notes, "confidence": "low", "mode": "mock"}


def draft_application(job: dict, profile: dict | None = None) -> dict:
    profile = profile or get_profile()
    if not llm.is_configured():
        return _mock_application(job, profile)

    system = (
        "You write tailored, sincere cover letters for a job seeker in their voice — specific, "
        "concise (under 250 words), no clichés or invented facts. Also give a short bullet list "
        "of tailoring notes (what to tweak, what to emphasize). Only use facts from the profile."
    )
    user = (
        f"Candidate:\n{profile_summary_text(profile)}\n\n"
        f"Resume:\n{profile.get('resume_text','')}\n\n"
        f"Job: {job.get('title','')} at {job.get('company','')} ({job.get('location','')})\n"
        f"Description: {job.get('description','')}\n\n"
        "Write the cover letter and notes."
    )
    try:
        result = llm.structured_call("application_draft", system, user, APP_SCHEMA,
                                     max_tokens=900, expected_output_tokens=350)
        return {
            "cover_letter": result["cover_letter"],
            "notes": result.get("notes", ""),
            "confidence": result.get("confidence", "medium"),
            "mode": "llm",
        }
    except Exception:
        return _mock_application(job, profile)
