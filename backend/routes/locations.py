from fastapi import APIRouter, Body

from db import DbSessionDep
from models import BuildingCheck, LocationCheck
from database_models import EkSeismData


router = APIRouter(prefix="/api", tags=["locations"])


@router.post("/check-location")
async def check_location(db: DbSessionDep, location: LocationCheck = Body(...)):
    """Check if location exists using SQLAlchemy ORM"""
    count = db.query(EkSeismData).filter(
        EkSeismData.PLANT_ID == location.plant_id,
        EkSeismData.UNIT_ID == location.unit_id,
        EkSeismData.BUILDING == location.building,
        EkSeismData.ROOM == location.room
    ).count()
    
    return {"exists": count > 0}


@router.post("/check-building")
async def check_building(db: DbSessionDep, data: BuildingCheck = Body(...)):
    """Check if building exists using SQLAlchemy ORM"""
    count = db.query(EkSeismData).filter(
        EkSeismData.PLANT_ID == data.plant_id,
        EkSeismData.UNIT_ID == data.unit_id,
        EkSeismData.BUILDING == data.building
    ).count()
    
    return {"exists": count > 0}


