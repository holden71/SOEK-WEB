"""
Load Analysis API endpoints
"""
from fastapi import APIRouter, Body

from api.dependencies import DbSessionDep
from schemas import LoadAnalysisParams
from services import LoadAnalysisService

router = APIRouter(prefix="/api", tags=["load_analysis"])
load_analysis_service = LoadAnalysisService()


@router.post("/save-load-analysis-params")
async def save_load_analysis_params(db: DbSessionDep, params: LoadAnalysisParams = Body(...)):
    """Save load analysis parameters"""
    try:
        result = load_analysis_service.save_load_analysis_params(db, params)
        db.commit()
        return result
    except Exception as e:
        db.rollback()
        raise


@router.get("/get-load-analysis-params/{ek_id}")
async def get_load_analysis_params(db: DbSessionDep, ek_id: int):
    """Get load analysis parameters"""
    return load_analysis_service.get_load_analysis_params(db, ek_id)

