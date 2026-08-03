from backend.config import load_profile, save_profile


def get_profile() -> dict:
    try:
        return load_profile()
    except Exception:
        return {}


def update_profile(data: dict) -> dict:
    profile = get_profile()
    profile.update(data or {})
    save_profile(profile)
    return profile


def profile_summary_text(profile: dict | None = None) -> str:
    """Compact, prompt-friendly rendering of the user's profile."""
    p = profile or get_profile()
    parts = [
        f"Name: {p.get('name', 'Candidate')}",
        f"Headline: {p.get('headline', '')}",
        f"Seniority: {p.get('seniority', '')}",
        f"Target roles: {', '.join(p.get('target_roles', []))}",
        f"Target locations: {', '.join(p.get('target_locations', []))}",
        f"Minimum salary: {p.get('min_salary', 'unspecified')}",
        f"Skills: {', '.join(p.get('skills', []))}",
        f"Preferences: {p.get('preferences', '')}",
        f"Summary: {p.get('summary', '')}",
    ]
    return "\n".join(parts)
