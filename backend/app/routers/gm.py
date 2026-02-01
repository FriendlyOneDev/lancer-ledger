from fastapi import APIRouter, Depends, Query
from supabase import Client
from uuid import UUID
from app.db import get_db
from app.models.user import User
from app.models.pilot import Pilot, PilotWithDetails
from app.models.log_entry import LogEntry, LogType
from app.routers.auth import require_gm

router = APIRouter()


@router.get("/pilots", response_model=list[PilotWithDetails])
async def list_all_pilots(
    current_user: User = Depends(require_gm),
    db: Client = Depends(get_db),
):
    """List all pilots (GM only)."""
    result = (
        db.table("pilots")
        .select("*, users(discord_username, display_name)")
        .order("created_at", desc=True)
        .execute()
    )

    pilots = []
    for p in result.data:
        # Remove the nested user data before creating Pilot
        user_info = p.pop("users", {})
        pilot = Pilot(**p)
        pilot_with_details = PilotWithDetails.from_pilot(pilot)
        # Add user info as extra attribute for display
        pilot_with_details.owner_name = user_info.get("display_name") or user_info.get(
            "discord_username", "Unknown"
        )
        pilots.append(pilot_with_details)

    return pilots


@router.get("/logs")
async def list_all_logs(
    current_user: User = Depends(require_gm),
    db: Client = Depends(get_db),
    user_discord_id: str | None = Query(None, description="Filter by user Discord ID"),
    pilot_id: UUID | None = Query(None, description="Filter by pilot ID"),
    log_type: LogType | None = Query(None, description="Filter by log type"),
    resource_direction: str | None = Query(
        None, description="Filter by resource change direction: 'increase' or 'decrease'"
    ),
    limit: int = Query(50, ge=1, le=200, description="Number of results to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
):
    """
    List all log entries with filters (GM only).

    Filters:
    - user_discord_id: Filter by the Discord ID of the pilot's owner
    - pilot_id: Filter by specific pilot
    - log_type: Filter by 'game' or 'trade'
    - resource_direction: Filter by 'increase' (positive changes) or 'decrease' (negative changes)
    """
    # Build query with joins to get user info
    query = db.table("log_entries").select(
        "*, pilots(id, name, callsign, user_id, users(discord_id, discord_username, display_name))"
    )

    # Apply pilot filter
    if pilot_id:
        query = query.eq("pilot_id", str(pilot_id))

    # Apply log type filter
    if log_type:
        query = query.eq("log_type", log_type.value)

    # Apply resource direction filter
    if resource_direction == "increase":
        query = query.or_("manna_change.gt.0,downtime_change.gt.0")
    elif resource_direction == "decrease":
        query = query.or_("manna_change.lt.0,downtime_change.lt.0")

    # Order and paginate
    query = query.order("created_at", desc=True).range(offset, offset + limit - 1)

    result = query.execute()

    # Post-filter by user discord ID if specified (need to do this after join)
    logs = []
    for log_data in result.data:
        pilot_info = log_data.pop("pilots", {})
        user_info = pilot_info.pop("users", {}) if pilot_info else {}

        # Filter by discord ID if specified
        if user_discord_id and user_info.get("discord_id") != user_discord_id:
            continue

        log = LogEntry(**log_data)
        # Add additional context
        log_dict = log.model_dump()
        log_dict["pilot_name"] = pilot_info.get("name", "Unknown")
        log_dict["pilot_callsign"] = pilot_info.get("callsign")
        log_dict["owner_discord_id"] = user_info.get("discord_id")
        log_dict["owner_name"] = user_info.get("display_name") or user_info.get(
            "discord_username", "Unknown"
        )

        logs.append(log_dict)

    return {
        "logs": logs,
        "total": len(logs),
        "limit": limit,
        "offset": offset,
    }
