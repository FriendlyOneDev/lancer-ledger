from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from enum import Enum


class LogType(str, Enum):
    """Type of log entry."""

    GAME = "game"
    TRADE = "trade"


class ClockProgressEntry(BaseModel):
    """Model for clock progress within a log entry."""

    clock_id: UUID
    ticks_applied: int = 1


class LogEntryBase(BaseModel):
    """Base log entry model."""

    log_type: LogType
    description: str | None = None
    manna_change: int = 0
    downtime_change: int = 0


class LogEntryCreate(LogEntryBase):
    """Model for creating a log entry."""

    clock_progress: list[ClockProgressEntry] = []
    tick_ll_clock: bool = True  # For game logs, auto-tick LL clock


class LogEntryUpdate(BaseModel):
    """Model for updating a log entry."""

    description: str | None = None
    manna_change: int | None = None
    downtime_change: int | None = None


class LogEntry(LogEntryBase):
    """Full log entry model with all fields."""

    id: UUID
    pilot_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LogEntryWithProgress(LogEntry):
    """Log entry with associated clock progress."""

    clock_progress: list[ClockProgressEntry] = []
