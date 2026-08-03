from pydantic import BaseModel


class SettingsIn(BaseModel):
    data: dict


class ProfileIn(BaseModel):
    data: dict


class ApplicationDecisionIn(BaseModel):
    decision: str | None = None


class ApplicationDraftIn(BaseModel):
    cover_letter: str
    notes: str | None = None


class ApplicationStatusIn(BaseModel):
    status: str


class TrackedApplicationIn(BaseModel):
    title: str
    company: str
    location: str | None = None
    url: str | None = None
    source: str = "manual"
    status: str = "draft"
    notes: str | None = None
    submitted_at: str | None = None


class ApplicationImportIn(BaseModel):
    applications: list[TrackedApplicationIn]


class EmailDraftIn(BaseModel):
    draft_text: str
