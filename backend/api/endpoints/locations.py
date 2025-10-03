"""
Locations API endpoints
"""
from fastapi import APIRouter, Body

from api.dependencies import DbSessionDep
from schemas import LocationCheck, BuildingCheck
from models import EkSeismData

router = APIRouter(prefix="/api", tags=["locations"])


@router.post("/check-location")
async def check_location(db: DbSessionDep, location: LocationCheck = Body(...)):
    """Check if location exists"""
    count = db.query(EkSeismData).filter(
        EkSeismData.PLANT_ID == location.plant_id,
        EkSeismData.UNIT_ID == location.unit_id,
        EkSeismData.BUILDING == location.building,
        EkSeismData.ROOM == location.room
    ).count()
    
    return {"exists": count > 0}


@router.post("/check-building")
async def check_building(db: DbSessionDep, data: BuildingCheck = Body(...)):
    """Check if building exists"""
    count = db.query(EkSeismData).filter(
        EkSeismData.PLANT_ID == data.plant_id,
        EkSeismData.UNIT_ID == data.unit_id,
        EkSeismData.BUILDING == data.building
    ).count()
    
    return {"exists": count > 0}

