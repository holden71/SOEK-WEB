from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core import DbSessionManager, settings
from api.router import api_router




@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Application lifespan - initialization and cleanup"""
    DbSessionManager.initialize()
    try:
        yield
    finally:
        DbSessionManager.dispose()


# Create FastAPI application
app = FastAPI(
    title="SOEK API",
    description="Seismic analysis API for nuclear power plants",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

# Include API router
app.include_router(api_router)



@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "SOEK API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    
    if settings.dev:
        uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
    else:
        uvicorn.run(app, host="0.0.0.0", port=8000)
