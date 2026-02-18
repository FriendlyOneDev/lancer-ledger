from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID
from app.services.resource_calc import get_ll_clock_segments


class PilotBase(BaseModel):
    """Base pilot model."""

    name: str
    callsign: str | None = None
    background: str | None = None
    notes: str | None = None
    avatar_url: str | None = None


class PilotCreate(PilotBase):
    """Model for creating a pilot."""

    pass


class PilotUpdate(BaseModel):
    """Model for updating a pilot."""

    name: str | None = None
    callsign: str | None = None
    background: str | None = None
    notes: str | None = None
    avatar_url: str | None = None


class Pilot(PilotBase):
    """Full pilot model with all fields."""

    id: UUID
    user_id: UUID
    license_level: int = Field(default=2, ge=0, le=12)
    ll_clock_progress: int = Field(default=0, ge=0)
    manna: int = 0
    downtime: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PilotWithDetails(Pilot):
    """Pilot with additional computed field for LL clock segments."""

    ll_clock_segments: int

    @classmethod
    def from_pilot(cls, pilot: Pilot) -> "PilotWithDetails":
        """Create PilotWithDetails from a Pilot instance."""
        data = pilot.model_dump()
        data["ll_clock_segments"] = get_ll_clock_segments(pilot.license_level)
        return cls(**data)
