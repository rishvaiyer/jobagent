"""Thin Anthropic wrapper shared by the agent services.

Every caller is expected to provide its own deterministic *mock* fallback, so
this module only deals with the real-API path. `is_configured()` lets callers
decide whether to call Claude at all.
"""
import json

from backend.config import get_llm_api_key, get_model
from backend.services.token_estimator import estimate_and_record


def is_configured() -> bool:
    return bool(get_llm_api_key())


def _client():
    import anthropic  # lazy import; optional dependency at runtime
    return anthropic.Anthropic(api_key=get_llm_api_key())


def _first_text(message) -> str:
    for block in message.content:
        if block.type == "text" and block.text:
            return block.text
    return ""


def structured_call(
    operation: str,
    system: str,
    user: str,
    schema: dict,
    max_tokens: int = 1200,
    expected_output_tokens: int = 400,
):
    """Single Claude call constrained to a JSON schema. Returns parsed dict/list."""
    model = get_model()
    estimate_and_record(operation, model, system + user, expected_output_tokens)
    client = _client()
    message = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user}],
        output_config={"format": {"type": "json_schema", "schema": schema}},
    )
    return json.loads(_first_text(message))


def web_search_json(
    operation: str,
    system: str,
    user: str,
    schema: dict,
    max_tokens: int = 4000,
    max_continuations: int = 6,
):
    """Claude call with the server-side web_search tool, constrained to JSON.

    Handles the `pause_turn` stop reason in a bounded loop (the server runs its
    own tool loop and pauses if it hits its iteration cap).
    """
    model = get_model()
    estimate_and_record(operation, model, system + user, 800)
    client = _client()
    messages = [{"role": "user", "content": user}]
    tools = [{"type": "web_search_20260209", "name": "web_search"}]

    message = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        system=system,
        messages=messages,
        tools=tools,
        output_config={"format": {"type": "json_schema", "schema": schema}},
    )
    continuations = 0
    while message.stop_reason == "pause_turn" and continuations < max_continuations:
        messages = [
            {"role": "user", "content": user},
            {"role": "assistant", "content": message.content},
        ]
        message = client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=system,
            messages=messages,
            tools=tools,
            output_config={"format": {"type": "json_schema", "schema": schema}},
        )
        continuations += 1

    return json.loads(_first_text(message))
