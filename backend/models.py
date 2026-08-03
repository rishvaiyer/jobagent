from datetime import datetime
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.db import Base


class Job(Base):
    __tablename__ = "jobs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    company: Mapped[str] = mapped_column(String(255))
    location: Mapped[str | None] = mapped_column(String(255))
    url: Mapped[str | None] = mapped_column(Text)
    source: Mapped[str | None] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text)
    salary: Mapped[str | None] = mapped_column(String(120))
    # Apply route: "web" (apply on the listing) or "email" (apply via an address).
    apply_method: Mapped[str] = mapped_column(String(20), default="web")
    apply_email: Mapped[str | None] = mapped_column(String(255))
    match_score: Mapped[int] = mapped_column(Integer, default=0)
    match_reason: Mapped[str | None] = mapped_column(Text)
    # found | saved | dismissed | applied
    status: Mapped[str] = mapped_column(String(20), default="found")
    # External de-dupe key (url, or company+title slug).
    external_key: Mapped[str | None] = mapped_column(String(512), unique=True, index=True)
    discovered_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now())
    applications: Mapped[list["Application"]] = relationship(
        back_populates="job", cascade="all, delete-orphan"
    )
    threads: Mapped[list["EmailThread"]] = relationship(back_populates="job")


class Application(Base):
    __tablename__ = "applications"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id"))
    # draft | submitted | interviewing | rejected | offer
    status: Mapped[str] = mapped_column(String(30), default="draft")
    draft_cover_letter: Mapped[str | None] = mapped_column(Text)
    draft_notes: Mapped[str | None] = mapped_column(Text)
    confidence: Mapped[str | None] = mapped_column(String(20))
    mode: Mapped[str | None] = mapped_column(String(20))
    # For email-apply jobs, the Gmail draft created on approval (never auto-sent).
    gmail_draft_id: Mapped[str | None] = mapped_column(String(255))
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime)
    decision: Mapped[str | None] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now())
    job: Mapped["Job"] = relationship(back_populates="applications")


class EmailThread(Base):
    __tablename__ = "email_threads"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    gmail_thread_id: Mapped[str | None] = mapped_column(String(255), unique=True, index=True)
    subject: Mapped[str | None] = mapped_column(Text)
    sender: Mapped[str | None] = mapped_column(String(255))
    snippet: Mapped[str | None] = mapped_column(Text)
    body: Mapped[str | None] = mapped_column(Text)
    # recruiter | interview | rejection | offer | application_update | other
    category: Mapped[str | None] = mapped_column(String(50))
    needs_response: Mapped[bool] = mapped_column(Boolean, default=False)
    urgency: Mapped[str | None] = mapped_column(String(20))
    latest_at: Mapped[datetime | None] = mapped_column(DateTime)
    related_job_id: Mapped[int | None] = mapped_column(ForeignKey("jobs.id"))
    source: Mapped[str] = mapped_column(String(20), default="gmail")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now())
    job: Mapped["Job | None"] = relationship(back_populates="threads")
    drafts: Mapped[list["EmailDraft"]] = relationship(
        back_populates="thread", cascade="all, delete-orphan"
    )


class EmailDraft(Base):
    __tablename__ = "email_drafts"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    thread_id: Mapped[int] = mapped_column(ForeignKey("email_threads.id"))
    draft_text: Mapped[str] = mapped_column(Text)
    # draft | approved | sent
    status: Mapped[str] = mapped_column(String(20), default="draft")
    gmail_draft_id: Mapped[str | None] = mapped_column(String(255))
    confidence: Mapped[str | None] = mapped_column(String(20))
    reason: Mapped[str | None] = mapped_column(Text)
    mode: Mapped[str | None] = mapped_column(String(20))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now())
    sent_at: Mapped[datetime | None] = mapped_column(DateTime)
    thread: Mapped["EmailThread"] = relationship(back_populates="drafts")


class Followup(Base):
    __tablename__ = "followups"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    task_text: Mapped[str] = mapped_column(Text)
    # you_owe | they_owe
    direction: Mapped[str | None] = mapped_column(String(20))
    due_date: Mapped[str | None] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(20), default="open")
    related_job_id: Mapped[int | None] = mapped_column(ForeignKey("jobs.id"))
    related_thread_id: Mapped[int | None] = mapped_column(ForeignKey("email_threads.id"))
    confidence: Mapped[str | None] = mapped_column(String(20))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now())


class AgentRun(Base):
    __tablename__ = "agent_runs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    kind: Mapped[str] = mapped_column(String(50))
    summary: Mapped[str | None] = mapped_column(Text)
    mode: Mapped[str | None] = mapped_column(String(20))
    items_created: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())


class TokenUsageEstimate(Base):
    __tablename__ = "token_usage_estimates"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    operation_type: Mapped[str] = mapped_column(String(100))
    model_name: Mapped[str | None] = mapped_column(String(100))
    estimated_input_tokens: Mapped[int] = mapped_column(Integer, default=0)
    estimated_output_tokens: Mapped[int] = mapped_column(Integer, default=0)
    estimated_cost: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())


class Setting(Base):
    __tablename__ = "settings"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    key: Mapped[str] = mapped_column(String(255), unique=True)
    value: Mapped[str | None] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now())
