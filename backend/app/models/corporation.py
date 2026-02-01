from pydantic import BaseModel
from datetime import datetime
from uuid import UUID


class CorporationBase(BaseModel):
    """Base corporation model."""

    name: str
    description: str | None = None


class CorporationCreate(CorporationBase):
    """Model for creating a corporation."""

    pass


class CorporationUpdate(BaseModel):
    """Model for updating a corporation."""

    name: str | None = None
    description: str | None = None


class Corporation(CorporationBase):
    """Full corporation model with all fields."""

    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
