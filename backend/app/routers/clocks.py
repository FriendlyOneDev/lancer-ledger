from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from uuid import UUID
from app.db import get_db
from app.models.user import User
from app.models.clock import Clock, ClockCreate, ClockUpdate, ClockTick
from app.routers.auth import get_current_user
from app.services.resource_calc import recalculate_clock

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


@router.get("/pilots/{pilot_id}/clocks", response_model=list[Clock])
async def list_pilot_clocks(
    pilot_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """List all clocks for a pilot."""
    if not await verify_pilot_ownership(pilot_id, current_user, db):
        raise HTTPException(status_code=404, detail="Pilot not found")

    result = (
        db.table("clocks")
        .select("*")
        .eq("pilot_id", str(pilot_id))
        .order("created_at", desc=True)
        .execute()
    )

    return [Clock(**c) for c in result.data]


@router.post("/pilots/{pilot_id}/clocks", response_model=Clock)
async def create_clock(
    pilot_id: UUID,
    clock: ClockCreate,
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """Create a new personal clock for a pilot."""
    if not await verify_pilot_ownership(pilot_id, current_user, db):
        raise HTTPException(status_code=404, detail="Pilot not found")

    data = clock.model_dump()
    data["pilot_id"] = str(pilot_id)

    result = db.table("clocks").insert(data).execute()

    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create clock")

    return Clock(**result.data[0])


@router.put("/clocks/{clock_id}", response_model=Clock)
async def update_clock(
    clock_id: UUID,
    clock_update: ClockUpdate,
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """Update a clock."""
    # Get clock and verify ownership
    clock_result = (
        db.table("clocks").select("*, pilots(user_id)").eq("id", str(clock_id)).single().execute()
    )

    if not clock_result.data:
        raise HTTPException(status_code=404, detail="Clock not found")

    if clock_result.data["pilots"]["user_id"] != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Update only provided fields
    update_data = clock_update.model_dump(exclude_unset=True)
    if not update_data:
        return Clock(**clock_result.data)

    result = db.table("clocks").update(update_data).eq("id", str(clock_id)).execute()

    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to update clock")

    return Clock(**result.data[0])


@router.post("/clocks/{clock_id}/tick", response_model=Clock)
async def tick_clock(
    clock_id: UUID,
    tick_request: ClockTick,
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """Tick a clock directly (outside of a log entry)."""
    # Get clock and verify ownership
    clock_result = (
        db.table("clocks").select("*, pilots(user_id)").eq("id", str(clock_id)).single().execute()
    )

    if not clock_result.data:
        raise HTTPException(status_code=404, detail="Clock not found")

    if clock_result.data["pilots"]["user_id"] != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Update manual_ticks, then recalculate filled/is_completed
    current_manual = clock_result.data.get("manual_ticks", 0)
    new_manual = current_manual + tick_request.ticks

    db.table("clocks").update({
        "manual_ticks": new_manual,
    }).eq("id", str(clock_id)).execute()

    recalculate_clock(db, str(clock_id))

    # Fetch updated clock
    result = (
        db.table("clocks").select("*").eq("id", str(clock_id)).single().execute()
    )

    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to tick clock")

    return Clock(**result.data)


@router.delete("/clocks/{clock_id}")
async def delete_clock(
    clock_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """Delete a clock."""
    # Get clock and verify ownership
    clock_result = (
        db.table("clocks").select("*, pilots(user_id)").eq("id", str(clock_id)).single().execute()
    )

    if not clock_result.data:
        raise HTTPException(status_code=404, detail="Clock not found")

    if clock_result.data["pilots"]["user_id"] != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    db.table("clocks").delete().eq("id", str(clock_id)).execute()

    return {"message": "Clock deleted successfully"}
