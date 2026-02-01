from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from uuid import UUID
from app.db import get_db
from app.models.user import User
from app.models.corporation import Corporation, CorporationCreate, CorporationUpdate
from app.routers.auth import get_current_user, require_gm

router = APIRouter()


@router.get("", response_model=list[Corporation])
async def list_corporations(
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """List all corporations (for dropdown selection)."""
    result = (
        db.table("corporations")
        .select("*")
        .order("name")
        .execute()
    )

    return [Corporation(**c) for c in result.data]


@router.post("", response_model=Corporation)
async def create_corporation(
    corporation: CorporationCreate,
    current_user: User = Depends(require_gm),
    db: Client = Depends(get_db),
):
    """Create a new corporation (GM only)."""
    data = corporation.model_dump()

    result = db.table("corporations").insert(data).execute()

    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create corporation")

    return Corporation(**result.data[0])


@router.put("/{corporation_id}", response_model=Corporation)
async def update_corporation(
    corporation_id: UUID,
    corporation_update: CorporationUpdate,
    current_user: User = Depends(require_gm),
    db: Client = Depends(get_db),
):
    """Update a corporation (GM only)."""
    # Check existence
    existing = (
        db.table("corporations")
        .select("*")
        .eq("id", str(corporation_id))
        .single()
        .execute()
    )

    if not existing.data:
        raise HTTPException(status_code=404, detail="Corporation not found")

    # Update only provided fields
    update_data = corporation_update.model_dump(exclude_unset=True)
    if not update_data:
        return Corporation(**existing.data)

    result = (
        db.table("corporations")
        .update(update_data)
        .eq("id", str(corporation_id))
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to update corporation")

    return Corporation(**result.data[0])


@router.delete("/{corporation_id}")
async def delete_corporation(
    corporation_id: UUID,
    current_user: User = Depends(require_gm),
    db: Client = Depends(get_db),
):
    """Delete a corporation (GM only)."""
    # Check existence
    existing = (
        db.table("corporations")
        .select("id")
        .eq("id", str(corporation_id))
        .single()
        .execute()
    )

    if not existing.data:
        raise HTTPException(status_code=404, detail="Corporation not found")

    db.table("corporations").delete().eq("id", str(corporation_id)).execute()

    return {"message": "Corporation deleted successfully"}
