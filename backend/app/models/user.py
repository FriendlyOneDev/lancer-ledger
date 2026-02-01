from pydantic import BaseModel
from datetime import datetime
from uuid import UUID


class UserBase(BaseModel):
    """Base user model."""

    discord_id: str | None = None
    discord_username: str | None = None
    display_name: str | None = None
    is_gm: bool = False


class UserCreate(UserBase):
    """Model for creating a user."""

    id: UUID


class UserUpdate(BaseModel):
    """Model for updating a user."""

    display_name: str | None = None
    is_gm: bool | None = None


class User(UserBase):
    """Full user model with all fields."""

    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
