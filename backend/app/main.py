from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.routers import auth, pilots, clocks, logs, corporations, reputation, gear, gm

settings = get_settings()

app = FastAPI(
    title="TTRPG Ledger API",
    description="Backend API for Lancer Campaign Tracker",
    version="0.1.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(pilots.router, prefix="/pilots", tags=["pilots"])
app.include_router(clocks.router, tags=["clocks"])
app.include_router(logs.router, tags=["logs"])
app.include_router(corporations.router, prefix="/corporations", tags=["corporations"])
app.include_router(reputation.router, tags=["reputation"])
app.include_router(gear.router, tags=["gear"])
app.include_router(gm.router, prefix="/gm", tags=["gm"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "TTRPG Ledger API", "version": "0.1.0"}


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
