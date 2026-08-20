"""Receipt evidence rules for application state transitions."""

from __future__ import annotations

import hashlib
from datetime import UTC, datetime
from urllib.parse import urlparse

from sqlalchemy.orm import Session

from backend.models import Application, ApplicationEvidence


class EvidenceError(ValueError):
    """Raised when an Applied transition lacks verifiable evidence fields."""


def normalize_receipt(receipt: dict | None) -> dict:
    receipt = receipt or {}
    confirmation_text = str(receipt.get("confirmation_text") or "").strip()
    source_url = str(receipt.get("source_url") or "").strip()
    observed_at = str(receipt.get("observed_at") or "").strip()
    if not confirmation_text:
        raise EvidenceError("confirmation_text is required before submitted")
    parsed_url = urlparse(source_url)
    if parsed_url.scheme not in {"http", "https"} or not parsed_url.netloc:
        raise EvidenceError("source_url must be an HTTP(S) URL")
    try:
        parsed_time = datetime.fromisoformat(observed_at.replace("Z", "+00:00"))
    except ValueError as exc:
        raise EvidenceError("observed_at must be an ISO-8601 timestamp") from exc
    if parsed_time.tzinfo is None:
        raise EvidenceError("observed_at must include a timezone")
    normalized_time = parsed_time.astimezone(UTC).replace(tzinfo=None)
    return {
        "confirmation_text": confirmation_text,
        "source_url": source_url,
        "observed_at": normalized_time,
    }


def receipt_key(receipt: dict) -> str:
    normalized = normalize_receipt(receipt)
    material = "|".join(
        (
            normalized["source_url"],
            normalized["confirmation_text"],
            normalized["observed_at"].isoformat(),
        )
    )
    return hashlib.sha256(material.encode("utf-8")).hexdigest()


def record_receipt(db: Session, application: Application, receipt: dict) -> ApplicationEvidence:
    normalized = normalize_receipt(receipt)
    key = receipt_key(receipt)
    existing = (
        db.query(ApplicationEvidence)
        .filter(
            ApplicationEvidence.application_id == application.id,
            ApplicationEvidence.receipt_key == key,
        )
        .first()
    )
    if existing:
        application.status = "submitted"
        application.submitted_at = existing.observed_at
        return existing
    event = ApplicationEvidence(
        application_id=application.id,
        event_type="receipt_observed",
        receipt_key=key,
        confirmation_text=normalized["confirmation_text"],
        source_url=normalized["source_url"],
        observed_at=normalized["observed_at"],
    )
    db.add(event)
    application.status = "submitted"
    application.submitted_at = normalized["observed_at"]
    return event


def has_receipt(application: Application) -> bool:
    return any(event.event_type == "receipt_observed" for event in application.evidence_events)
