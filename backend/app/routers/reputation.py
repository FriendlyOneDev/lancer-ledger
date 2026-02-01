from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from uuid import UUID
from app.db import get_db
from app.models.user import User
from app.models.reputation import CorporationReputation, ReputationCreate, ReputationUpdate, ReputationWithCorp
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


@router.get("/pilots/{pilot_id}/reputation", response_model=list[ReputationWithCorp])
async def list_pilot_reputation(
    pilot_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """List all corporation reputation entries for a pilot."""
    if not await verify_pilot_ownership(pilot_id, current_user, db):
        raise HTTPException(status_code=404, detail="Pilot not found")

    result = (
        db.table("corporation_reputation")
        .select("*, corporations(name)")
        .eq("pilot_id", str(pilot_id))
        .execute()
    )

    reputation_list = []
    for r in result.data:
        corp_name = r.pop("corporations", {}).get("name", "Unknown")
        rep = ReputationWithCorp(**r, corporation_name=corp_name)
        reputation_list.append(rep)

    return reputation_list


@router.post("/pilots/{pilot_id}/reputation", response_model=CorporationReputation)
async def create_reputation(
    pilot_id: UUID,
    reputation: ReputationCreate,
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """Add a corporation reputation entry for a pilot."""
    if not await verify_pilot_ownership(pilot_id, current_user, db):
        raise HTTPException(status_code=404, detail="Pilot not found")

    # Verify corporation exists
    corp_result = (
        db.table("corporations")
        .select("id")
        .eq("id", str(reputation.corporation_id))
        .single()
        .execute()
    )

    if not corp_result.data:
        raise HTTPException(status_code=404, detail="Corporation not found")

    data = reputation.model_dump()
    data["pilot_id"] = str(pilot_id)
    data["corporation_id"] = str(reputation.corporation_id)

    result = db.table("corporation_reputation").insert(data).execute()

    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create reputation entry")

    return CorporationReputation(**result.data[0])


@router.put("/reputation/{reputation_id}", response_model=CorporationReputation)
async def update_reputation(
    reputation_id: UUID,
    reputation_update: ReputationUpdate,
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """Update a reputation entry."""
    # Get reputation and verify ownership through pilot
    rep_result = (
        db.table("corporation_reputation")
        .select("*, pilots(user_id)")
        .eq("id", str(reputation_id))
        .single()
        .execute()
    )

    if not rep_result.data:
        raise HTTPException(status_code=404, detail="Reputation entry not found")

    if rep_result.data["pilots"]["user_id"] != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Update only provided fields
    update_data = reputation_update.model_dump(exclude_unset=True)
    if not update_data:
        return CorporationReputation(**rep_result.data)

    result = (
        db.table("corporation_reputation")
        .update(update_data)
        .eq("id", str(reputation_id))
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to update reputation entry")

    return CorporationReputation(**result.data[0])


@router.delete("/reputation/{reputation_id}")
async def delete_reputation(
    reputation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """Delete a reputation entry."""
    # Get reputation and verify ownership through pilot
    rep_result = (
        db.table("corporation_reputation")
        .select("*, pilots(user_id)")
        .eq("id", str(reputation_id))
        .single()
        .execute()
    )

    if not rep_result.data:
        raise HTTPException(status_code=404, detail="Reputation entry not found")

    if rep_result.data["pilots"]["user_id"] != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    db.table("corporation_reputation").delete().eq("id", str(reputation_id)).execute()

    return {"message": "Reputation entry deleted successfully"}
