from typing import List

from fastapi import APIRouter, Query

from db import DbSessionDep
from models import SearchData
from database_utils import search_ek_seism_data


router = APIRouter(prefix="/api", tags=["search"])


@router.get("/search", response_model=List[SearchData])
async def search_data(
    db: DbSessionDep,
    plant_id: int = Query(..., description="ID of the plant"),
    unit_id: int = Query(..., description="ID of the unit"),
    t_id: int = Query(..., description="Term ID (EKLIST_ID)"),
):
    """Search seismic data using SQLAlchemy ORM with correct model"""
    # Search data using ORM with correct model
    seism_data_list = search_ek_seism_data(
        db=db,
        plant_id=plant_id,
        unit_id=unit_id,
        eklist_id=t_id
    )

    # Convert ORM objects to response format
    search_results = []
    for seism_data in seism_data_list:
        # Convert ORM object to dictionary using all table columns
        row_dict = {}
        for column in seism_data.__table__.columns:
            value = getattr(seism_data, column.name)
            row_dict[column.name] = value
        
        search_results.append(SearchData(data=row_dict))

    return search_results


