from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID


class ClockBase(BaseModel):
    """Base clock model."""

    name: str
    segments: int = Field(ge=1)
    tick_amount: int = Field(default=1, ge=1)


class ClockCreate(ClockBase):
    """Model for creating a clock."""

    pass


class ClockUpdate(BaseModel):
    """Model for updating a clock metadata (not progress)."""

    name: str | None = None
    segments: int | None = Field(default=None, ge=1)
    tick_amount: int | None = Field(default=None, ge=1)


class Clock(ClockBase):
    """Full clock model with all fields."""

    id: UUID
    pilot_id: UUID | None = None
    filled: int = Field(default=0, ge=0)
    manual_ticks: int = 0
    is_completed: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ClockTick(BaseModel):
    """Model for ticking a clock (positive or negative)."""

    ticks: int = Field(default=1)
