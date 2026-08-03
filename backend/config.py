import json
import os
from pathlib import Path

BASE_DIR = Path(__file__).parent
EXAMPLE_DATA_DIR = BASE_DIR / "data"
DATA_DIR = Path(os.getenv("JOBAGENT_DATA_DIR", str(EXAMPLE_DATA_DIR))).expanduser()
SETTINGS_PATH = DATA_DIR / "app_settings.local.json"
PROFILE_PATH = DATA_DIR / "profile.local.json"
SETTINGS_EXAMPLE_PATH = EXAMPLE_DATA_DIR / "app_settings.example.json"
PROFILE_EXAMPLE_PATH = EXAMPLE_DATA_DIR / "profile.example.json"
LEGACY_SETTINGS_PATH = DATA_DIR / "app_settings.json"
LEGACY_PROFILE_PATH = DATA_DIR / "profile.json"


def _load_local_or_example(local_path: Path, example_path: Path, legacy_path: Path) -> dict:
    """Load private local data, migrating a legacy tracked file when present."""
    source = local_path if local_path.exists() else legacy_path if legacy_path.exists() else example_path
    with open(source) as f:
        data = json.load(f)
    if source == legacy_path:
        _save_json(local_path, data)
    return data


def _save_json(path: Path, data: dict):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = path.with_suffix(path.suffix + ".tmp")
    with open(temp_path, "w") as f:
        json.dump(data, f, indent=2)
        f.write("\n")
    temp_path.replace(path)


def load_settings() -> dict:
    return _load_local_or_example(SETTINGS_PATH, SETTINGS_EXAMPLE_PATH, LEGACY_SETTINGS_PATH)


def save_settings(settings: dict):
    _save_json(SETTINGS_PATH, settings)


def load_profile() -> dict:
    return _load_local_or_example(PROFILE_PATH, PROFILE_EXAMPLE_PATH, LEGACY_PROFILE_PATH)


def save_profile(profile: dict):
    _save_json(PROFILE_PATH, profile)


def get_llm_api_key() -> str | None:
    # Env var wins for development; otherwise the locally-stored key.
    env_key = os.environ.get("ANTHROPIC_API_KEY")
    if env_key:
        return env_key
    key = load_settings().get("llm_api_key")
    return key or None


def get_model() -> str:
    return load_settings().get("model", "claude-opus-4-8")


DEFAULT_SEARCH_FILTERS = {
    "remote_only": False,
    "include_keywords": [],
    "exclude_keywords": [],
    "avoid_companies": [],
    "enforce_min_salary": False,
    "employment_type": "any",
}

DEFAULT_DRAFT_STYLE = {
    "tone": "warm",
    "length": "medium",
    "signature": "",
    "auto_draft_replies": False,
}


def get_search_filters() -> dict:
    return {**DEFAULT_SEARCH_FILTERS, **(load_settings().get("search_filters") or {})}


def get_draft_style() -> dict:
    return {**DEFAULT_DRAFT_STYLE, **(load_settings().get("draft_style") or {})}


def get_gmail_paths() -> dict:
    """Resolve Gmail OAuth file paths from settings (expanded, may not exist)."""
    s = load_settings()
    client_secret = s.get("gmail_client_secret_path", "")
    token = s.get("gmail_token_path", str(DATA_DIR / "gmail_token.json"))
    return {
        "client_secret": os.path.expanduser(client_secret) if client_secret else "",
        "token": os.path.expanduser(token) if token else "",
    }
