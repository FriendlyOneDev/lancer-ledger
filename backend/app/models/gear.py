from pydantic import BaseModel
from datetime import datetime
from uuid import UUID


class GearBase(BaseModel):
    """Base exotic gear model."""

    name: str
    description: str | None = None
    notes: str | None = None


class GearCreate(GearBase):
    """Model for creating an exotic gear entry."""

    pass


class GearUpdate(BaseModel):
    """Model for updating an exotic gear entry."""

    name: str | None = None
    description: str | None = None
    notes: str | None = None


class ExoticGear(GearBase):
    """Full exotic gear model with all fields."""

    id: UUID
    pilot_id: UUID
    acquired_date: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
