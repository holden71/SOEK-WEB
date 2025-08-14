from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db import DbSessionManager
from settings import settings

from routes.plants import router as plants_router
from routes.search import router as search_router
from routes.excel import router as excel_router
from routes.locations import router as locations_router
from routes.accel_sets import router as accel_router
from routes.load_analysis import router as load_analysis_router


@asynccontextmanager
async def lifespan(_app: FastAPI):
    DbSessionManager.initialize()
    try:
    yield
    finally:
    DbSessionManager.dispose()


app = FastAPI(lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(plants_router)
app.include_router(search_router)
app.include_router(excel_router)
app.include_router(locations_router)
app.include_router(accel_router)
app.include_router(load_analysis_router)


if __name__ == "__main__":
    import uvicorn
    
    if settings.dev:
        uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
    else:
        uvicorn.run(app, host="0.0.0.0", port=8000)


