from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from uuid import UUID
from app.db import get_db
from app.models.user import User
from app.models.log_entry import (
    LogEntry,
    LogEntryCreate,
    LogEntryUpdate,
    LogEntryWithDetails,
    ClockProgressEntry,
)
from app.routers.auth import get_current_user
from app.services.resource_calc import recalculate_pilot_resources

router = APIRouter()


async def verify_pilot_ownership(
    pilot_id: UUID,
    current_user: User,
    db: Client,
) -> dict | None:
    """Verify that the current user owns the pilot and return pilot data."""
    result = (
        db.table("pilots")
        .select("*")
        .eq("id", str(pilot_id))
        .eq("user_id", str(current_user.id))
        .single()
        .execute()
    )
    return result.data


@router.get("/pilots/{pilot_id}/logs", response_model=list[LogEntry])
async def list_pilot_logs(
    pilot_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """List all log entries for a pilot."""
    if not await verify_pilot_ownership(pilot_id, current_user, db):
        raise HTTPException(status_code=404, detail="Pilot not found")

    result = (
        db.table("log_entries")
        .select("*")
        .eq("pilot_id", str(pilot_id))
        .order("created_at", desc=True)
        .execute()
    )

    return [LogEntry(**log) for log in result.data]


@router.post("/pilots/{pilot_id}/logs", response_model=LogEntry)
async def create_log_entry(
    pilot_id: UUID,
    log_entry: LogEntryCreate,
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """Create a new log entry for a pilot."""
    if not await verify_pilot_ownership(pilot_id, current_user, db):
        raise HTTPException(status_code=404, detail="Pilot not found")

    # Clamp LL clock change to 0-10
    ll_clock_change = max(0, min(25, log_entry.ll_clock_change))

    # Create the log entry
    log_data = {
        "pilot_id": str(pilot_id),
        "log_type": log_entry.log_type.value,
        "description": log_entry.description,
        "manna_change": log_entry.manna_change,
        "downtime_change": log_entry.downtime_change,
        "ll_clock_change": ll_clock_change,
    }

    log_result = db.table("log_entries").insert(log_data).execute()

    if not log_result.data:
        raise HTTPException(status_code=400, detail="Failed to create log entry")

    created_log = log_result.data[0]
    log_id = created_log["id"]

    # Insert clock progress entries (clock state is recalculated below)
    for progress in log_entry.clock_progress:
        # Verify clock belongs to pilot
        clock_result = (
            db.table("clocks")
            .select("id")
            .eq("id", str(progress.clock_id))
            .eq("pilot_id", str(pilot_id))
            .single()
            .execute()
        )

        if clock_result.data:
            db.table("clock_progress").insert({
                "log_entry_id": log_id,
                "clock_id": str(progress.clock_id),
                "ticks_applied": progress.ticks_applied,
            }).execute()

    # Handle gear acquired
    for gear in log_entry.gear_acquired:
        db.table("exotic_gear").insert({
            "pilot_id": str(pilot_id),
            "name": gear.name,
            "description": gear.description,
            "notes": gear.notes,
            "acquired_log_id": log_id,
        }).execute()

    # Handle gear lost
    for gear_lost in log_entry.gear_lost:
        gear_result = (
            db.table("exotic_gear")
            .select("*")
            .eq("id", str(gear_lost.gear_id))
            .eq("pilot_id", str(pilot_id))
            .is_("lost_log_id", "null")
            .single()
            .execute()
        )

        if gear_result.data:
            db.table("exotic_gear").update({
                "lost_log_id": log_id,
            }).eq("id", str(gear_lost.gear_id)).execute()

    # Handle reputation changes
    for rep_change in log_entry.reputation_changes:
        db.table("reputation_changes").insert({
            "log_entry_id": log_id,
            "pilot_id": str(pilot_id),
            "corporation_id": str(rep_change.corporation_id),
            "change_value": rep_change.change_value,
            "notes": rep_change.notes,
        }).execute()

    # Recalculate pilot resources and clock states from all logs
    recalculate_pilot_resources(db, str(pilot_id))

    return LogEntry(**created_log)


@router.get("/logs/{log_id}", response_model=LogEntry)
async def get_log_entry(
    log_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """Get a specific log entry."""
    result = (
        db.table("log_entries")
        .select("*, pilots(user_id)")
        .eq("id", str(log_id))
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Log entry not found")

    if result.data["pilots"]["user_id"] != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    log_data = {k: v for k, v in result.data.items() if k != "pilots"}
    return LogEntry(**log_data)


@router.get("/logs/{log_id}/details")
async def get_log_entry_details(
    log_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """Get a log entry with its clock progress entries."""
    result = (
        db.table("log_entries")
        .select("*, pilots(user_id)")
        .eq("id", str(log_id))
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Log entry not found")

    if result.data["pilots"]["user_id"] != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    log_data = {k: v for k, v in result.data.items() if k != "pilots"}

    # Fetch clock progress for this log
    progress_result = (
        db.table("clock_progress")
        .select("clock_id, ticks_applied")
        .eq("log_entry_id", str(log_id))
        .execute()
    )

    log_data["clock_progress"] = [
        {"clock_id": p["clock_id"], "ticks_applied": p["ticks_applied"]}
        for p in progress_result.data
    ]

    return log_data


@router.put("/logs/{log_id}", response_model=LogEntry)
async def update_log_entry(
    log_id: UUID,
    log_update: LogEntryUpdate,
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """Update a log entry including resources and clock progress."""
    # Get log and verify ownership
    log_result = (
        db.table("log_entries")
        .select("*, pilots(user_id)")
        .eq("id", str(log_id))
        .single()
        .execute()
    )

    if not log_result.data:
        raise HTTPException(status_code=404, detail="Log entry not found")

    if log_result.data["pilots"]["user_id"] != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    pilot_id = log_result.data["pilot_id"]

    # Build update data from provided fields
    update_data = {}
    if log_update.description is not None:
        update_data["description"] = log_update.description
    if log_update.manna_change is not None:
        update_data["manna_change"] = log_update.manna_change
    if log_update.downtime_change is not None:
        update_data["downtime_change"] = log_update.downtime_change
    if log_update.ll_clock_change is not None:
        update_data["ll_clock_change"] = max(0, min(25, log_update.ll_clock_change))

    if update_data:
        result = (
            db.table("log_entries").update(update_data).eq("id", str(log_id)).execute()
        )
        if not result.data:
            raise HTTPException(status_code=400, detail="Failed to update log entry")
        updated_log = result.data[0]
    else:
        updated_log = {k: v for k, v in log_result.data.items() if k != "pilots"}

    # Handle clock progress update if provided
    if log_update.clock_progress is not None:
        # Delete existing clock_progress for this log
        db.table("clock_progress").delete().eq("log_entry_id", str(log_id)).execute()

        # Insert new clock_progress entries
        for progress in log_update.clock_progress:
            # Verify clock belongs to pilot
            clock_result = (
                db.table("clocks")
                .select("id")
                .eq("id", str(progress.clock_id))
                .eq("pilot_id", pilot_id)
                .single()
                .execute()
            )

            if clock_result.data:
                db.table("clock_progress").insert({
                    "log_entry_id": str(log_id),
                    "clock_id": str(progress.clock_id),
                    "ticks_applied": progress.ticks_applied,
                }).execute()

    # Recalculate pilot resources and clock states
    recalculate_pilot_resources(db, pilot_id)

    return LogEntry(**updated_log)


@router.delete("/logs/{log_id}")
async def delete_log_entry(
    log_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """Delete a log entry. Pilot resources and clocks are recalculated after deletion."""
    # Get log and verify ownership
    log_result = (
        db.table("log_entries")
        .select("*, pilots(user_id)")
        .eq("id", str(log_id))
        .single()
        .execute()
    )

    if not log_result.data:
        raise HTTPException(status_code=404, detail="Log entry not found")

    if log_result.data["pilots"]["user_id"] != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    pilot_id = log_result.data["pilot_id"]

    # Delete log (cascade removes clock_progress entries)
    db.table("log_entries").delete().eq("id", str(log_id)).execute()

    # Recalculate pilot resources and clock states
    recalculate_pilot_resources(db, pilot_id)

    return {"message": "Log entry deleted successfully"}
