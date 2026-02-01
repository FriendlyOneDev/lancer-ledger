from pydantic import BaseModel
from datetime import datetime
from uuid import UUID


class ReputationBase(BaseModel):
    """Base corporation reputation model."""

    corporation_id: UUID
    reputation_value: int = 0
    notes: str | None = None


class ReputationCreate(ReputationBase):
    """Model for creating a reputation entry."""

    pass


class ReputationUpdate(BaseModel):
    """Model for updating a reputation entry."""

    reputation_value: int | None = None
    notes: str | None = None


class CorporationReputation(ReputationBase):
    """Full corporation reputation model with all fields."""

    id: UUID
    pilot_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ReputationWithCorp(CorporationReputation):
    """Reputation entry with corporation name included."""

    corporation_name: str
