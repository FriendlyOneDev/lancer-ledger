from fastapi import APIRouter, Depends, HTTPException, Header
from supabase import Client
from app.db import get_db
from app.models.user import User

router = APIRouter()


async def get_current_user(
    authorization: str = Header(...),
    db: Client = Depends(get_db),
) -> User:
    """Get the current authenticated user from the JWT token."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.replace("Bearer ", "")

    try:
        # Verify the JWT and get user info
        user_response = db.auth.get_user(token)
        if not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid token")

        auth_user = user_response.user

        # Get user profile from our users table
        result = db.table("users").select("*").eq("id", auth_user.id).single().execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="User profile not found")

        return User(**result.data)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")


async def require_gm(current_user: User = Depends(get_current_user)) -> User:
    """Require the current user to be a GM."""
    if not current_user.is_gm:
        raise HTTPException(status_code=403, detail="GM access required")
    return current_user


@router.get("/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get the current user's profile."""
    return current_user
