from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from uuid import UUID
from app.db import get_db
from app.models.user import User
from app.models.gear import ExoticGear, GearCreate, GearUpdate
from app.routers.auth import get_current_user

router = APIRouter()


async def verify_pilot_ownership(
    pilot_id: UUID,
    current_user: User,
    db: Client,
) -> bool:
    """Verify that the current user owns the pilot."""
    result = (
        db.table("pilots")
        .select("id")
        .eq("id", str(pilot_id))
        .eq("user_id", str(current_user.id))
        .single()
        .execute()
    )
    return result.data is not None


@router.get("/pilots/{pilot_id}/gear", response_model=list[ExoticGear])
async def list_pilot_gear(
    pilot_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """List all exotic gear for a pilot."""
    if not await verify_pilot_ownership(pilot_id, current_user, db):
        raise HTTPException(status_code=404, detail="Pilot not found")

    result = (
        db.table("exotic_gear")
        .select("*")
        .eq("pilot_id", str(pilot_id))
        .order("acquired_date", desc=True)
        .execute()
    )

    return [ExoticGear(**g) for g in result.data]


@router.post("/pilots/{pilot_id}/gear", response_model=ExoticGear)
async def create_gear(
    pilot_id: UUID,
    gear: GearCreate,
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """Add exotic gear for a pilot."""
    if not await verify_pilot_ownership(pilot_id, current_user, db):
        raise HTTPException(status_code=404, detail="Pilot not found")

    data = gear.model_dump()
    data["pilot_id"] = str(pilot_id)

    result = db.table("exotic_gear").insert(data).execute()

    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create gear entry")

    return ExoticGear(**result.data[0])


@router.put("/gear/{gear_id}", response_model=ExoticGear)
async def update_gear(
    gear_id: UUID,
    gear_update: GearUpdate,
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """Update a gear entry."""
    # Get gear and verify ownership through pilot
    gear_result = (
        db.table("exotic_gear")
        .select("*, pilots(user_id)")
        .eq("id", str(gear_id))
        .single()
        .execute()
    )

    if not gear_result.data:
        raise HTTPException(status_code=404, detail="Gear not found")

    if gear_result.data["pilots"]["user_id"] != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Update only provided fields
    update_data = gear_update.model_dump(exclude_unset=True)
    if not update_data:
        return ExoticGear(**gear_result.data)

    result = (
        db.table("exotic_gear")
        .update(update_data)
        .eq("id", str(gear_id))
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to update gear entry")

    return ExoticGear(**result.data[0])


@router.delete("/gear/{gear_id}")
async def delete_gear(
    gear_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """Delete a gear entry."""
    # Get gear and verify ownership through pilot
    gear_result = (
        db.table("exotic_gear")
        .select("*, pilots(user_id)")
        .eq("id", str(gear_id))
        .single()
        .execute()
    )

    if not gear_result.data:
        raise HTTPException(status_code=404, detail="Gear not found")

    if gear_result.data["pilots"]["user_id"] != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    db.table("exotic_gear").delete().eq("id", str(gear_id)).execute()

    return {"message": "Gear deleted successfully"}
