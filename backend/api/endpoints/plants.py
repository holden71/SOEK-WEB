"""
Plants API endpoints
"""
from typing import List
from fastapi import APIRouter, Query

from api.dependencies import DbSessionDep
from schemas import Plant, Unit, Term
from services import PlantService

router = APIRouter(prefix="/api", tags=["plants"])
plant_service = PlantService()


@router.get("/plants", response_model=List[Plant])
async def get_plants(db: DbSessionDep):
    """Get all plants"""
    return plant_service.get_all_plants(db)


@router.get("/units", response_model=List[Unit])
async def get_units(
    db: DbSessionDep,
    plant_id: int = Query(..., description="ID of the plant to get units for"),
):
    """Get units by plant"""
    return plant_service.get_units_by_plant(db, plant_id)


@router.get("/terms", response_model=List[Term])
async def get_terms(
    db: DbSessionDep,
    plant_id: int = Query(..., description="ID of the plant"),
    unit_id: int = Query(..., description="ID of the unit"),
):
    """Get terms by plant and unit"""
    return plant_service.get_terms_by_plant_unit(db, plant_id, unit_id)

