"""Find jobs that match the user's profile.

LLM mode: Claude with the server-side web_search tool returns a structured list
of real postings. Mock mode (no API key): deterministic synthetic postings built
from the profile so the app is fully usable offline.
"""
import hashlib
import os

from backend.config import get_search_filters, load_settings
from backend.services import llm
from backend.services.profile import get_profile, profile_summary_text


def _job_text(job: dict) -> str:
    return " ".join(str(job.get(k, "")) for k in ("title", "company", "location", "description")).lower()


def _passes_filters(job: dict, filters: dict) -> bool:
    text = _job_text(job)
    if filters.get("remote_only") and "remote" not in (job.get("location") or "").lower():
        return False
    for kw in filters.get("exclude_keywords") or []:
        if kw.strip() and kw.strip().lower() in text:
            return False
    for co in filters.get("avoid_companies") or []:
        if co.strip() and co.strip().lower() in (job.get("company") or "").lower():
            return False
    inc = [k.strip().lower() for k in (filters.get("include_keywords") or []) if k.strip()]
    if inc and not all(k in text for k in inc):
        return False
    return True


def apply_filters(jobs: list[dict], filters: dict) -> list[dict]:
    return [j for j in jobs if _passes_filters(j, filters)]


def _filters_prompt(filters: dict) -> str:
    lines = []
    if filters.get("remote_only"):
        lines.append("- Remote roles only.")
    et = filters.get("employment_type", "any")
    if et and et != "any":
        lines.append(f"- Employment type: {et}.")
    if filters.get("include_keywords"):
        lines.append(f"- Must mention all of: {', '.join(filters['include_keywords'])}.")
    if filters.get("exclude_keywords"):
        lines.append(f"- Exclude anything mentioning: {', '.join(filters['exclude_keywords'])}.")
    if filters.get("avoid_companies"):
        lines.append(f"- Do not include these companies: {', '.join(filters['avoid_companies'])}.")
    if filters.get("enforce_min_salary"):
        lines.append("- Respect the candidate's minimum salary strictly; skip roles clearly below it.")
    return ("\nHard filters (must satisfy):\n" + "\n".join(lines)) if lines else ""

JOB_SCHEMA = {
    "type": "object",
    "properties": {
        "jobs": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "company": {"type": "string"},
                    "location": {"type": "string"},
                    "url": {"type": "string"},
                    "source": {"type": "string"},
                    "description": {"type": "string"},
                    "salary": {"type": "string"},
                    "apply_method": {"type": "string", "enum": ["web", "email"]},
                    "apply_email": {"type": "string"},
                    "match_score": {"type": "integer"},
                    "match_reason": {"type": "string"},
                },
                "required": ["title", "company", "match_score", "match_reason"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["jobs"],
    "additionalProperties": False,
}


def external_key(job: dict) -> str:
    raw = (job.get("url") or f"{job.get('company','')}-{job.get('title','')}").strip().lower()
    return hashlib.sha1(raw.encode()).hexdigest()[:24]


def _mock_jobs(profile: dict, limit: int, filters: dict) -> list[dict]:
    roles = profile.get("target_roles") or ["Software Engineer"]
    locations = profile.get("target_locations") or ["Remote"]
    skills = profile.get("skills") or ["Python"]
    companies = [
        ("Aperture Labs", "web", None, "$150k–$185k"),
        ("Northwind Software", "email", "jobs@northwind.example", "$140k–$170k"),
        ("Lumen Health", "web", None, "$135k–$165k"),
        ("Cedar & Co", "web", None, "competitive"),
        ("Brightwave", "email", "careers@brightwave.example", "$160k–$200k"),
        ("Tessellate AI", "web", None, "$170k–$210k"),
    ]
    inc = filters.get("include_keywords") or []
    et = filters.get("employment_type", "any")
    jobs = []
    for i in range(min(limit, len(companies) * len(roles))):
        role = roles[i % len(roles)]
        company, method, email, salary = companies[i % len(companies)]
        # Respect remote_only and avoided companies up front so the demo still returns hits.
        loc = "Remote" if filters.get("remote_only") else locations[i % len(locations)]
        skill = skills[i % len(skills)]
        score = 90 - (i * 4) % 45
        desc = (f"{company} is hiring a {role} ({loc})"
                f"{' · ' + et if et and et != 'any' else ''}. Strong match on {skill}. "
                "This is sample data — add an Anthropic API key to search real listings.")
        if inc:  # embed must-have keywords so filtered mock data still shows results
            desc += " Keywords: " + ", ".join(inc) + "."
        jobs.append({
            "title": role,
            "company": company,
            "location": loc,
            "url": f"https://example.com/jobs/{company.lower().replace(' ', '-').replace('&','and')}/{i}",
            "source": "mock",
            "description": desc,
            "salary": salary,
            "apply_method": method,
            "apply_email": email,
            "match_score": int(score),
            "match_reason": f"Targets your '{role}' goal in {loc}; uses {skill}.",
        })
    return jobs


def find_jobs() -> dict:
    profile = get_profile()
    filters = get_search_filters()
    limit = load_settings().get("max_jobs_per_search", 12)

    if not llm.is_configured():
        if os.getenv("JOBAGENT_REAL_DATA_ONLY") == "1":
            return {
                "mode": "unavailable",
                "jobs": [],
                "error": "Real job search is not connected. No sample jobs were created.",
            }
        return {"mode": "mock", "jobs": apply_filters(_mock_jobs(profile, limit, filters), filters)}

    system = (
        "You are a job-search assistant. Use web search to find current, real job "
        "postings that fit the candidate. Only return postings you actually found "
        "via search, with working URLs. Score each 0-100 for fit and explain why in "
        "one sentence. Never invent listings. Honor every hard filter exactly."
    )
    user = (
        f"Candidate profile:\n{profile_summary_text(profile)}\n"
        f"{_filters_prompt(filters)}\n\n"
        f"Find up to {limit} strong-fit, currently-open roles. Prefer the candidate's "
        "target roles and locations and respect the minimum salary where stated."
    )
    try:
        result = llm.web_search_json("job_search", system, user, JOB_SCHEMA)
        jobs = result.get("jobs", [])
        for j in jobs:
            j.setdefault("apply_method", "web")
            j.setdefault("source", "web")
        # Belt-and-suspenders: enforce filters client-side too.
        jobs = apply_filters(jobs, filters)[:limit]
        return {"mode": "llm", "jobs": jobs}
    except Exception as e:
        if os.getenv("JOBAGENT_REAL_DATA_ONLY") == "1":
            return {
                "mode": "unavailable",
                "jobs": [],
                "error": f"Real job search failed ({e}). No sample jobs were created.",
            }
        out = {"mode": "mock", "jobs": apply_filters(_mock_jobs(profile, limit, filters), filters)}
        out["error"] = f"LLM search failed ({e}); showing sample data."
        return out
