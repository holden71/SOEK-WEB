"""
Search API endpoints
"""
from typing import List
from fastapi import APIRouter, Query

from api.dependencies import DbSessionDep
from schemas import SearchData
from services import SearchService

router = APIRouter(prefix="/api", tags=["search"])
search_service = SearchService()


@router.get("/search", response_model=List[SearchData])
async def search_data(
    db: DbSessionDep,
    plant_id: int = Query(..., description="ID of the plant"),
    unit_id: int = Query(..., description="ID of the unit"),
    t_id: int = Query(..., description="Term ID (EKLIST_ID)"),
):
    """Search seismic data by plant, unit and term"""
    return search_service.search_data(db, plant_id, unit_id, t_id)

