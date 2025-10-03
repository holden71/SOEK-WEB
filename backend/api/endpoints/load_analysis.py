"""
Load Analysis endpoints - анализ изменения нагрузок
"""
from fastapi import APIRouter, Body, HTTPException

from api.dependencies import DbSessionDep
from schemas import LoadAnalysisParams
from services import LoadAnalysisService

router = APIRouter(prefix="/api", tags=["load-analysis"])
load_service = LoadAnalysisService()


@router.post("/save-load-analysis-params")
async def save_load_analysis_params(
    db: DbSessionDep,
    params: LoadAnalysisParams = Body(...)
):
    """Save load analysis parameters"""
    try:
        result = load_service.save_load_analysis_params(db, params)
        db.commit()
        return result
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/get-load-analysis-params/{ek_id}")
async def get_load_analysis_params(
    db: DbSessionDep,
    ek_id: int
):
    """Get load analysis parameters"""
    return load_service.get_load_analysis_params(db, ek_id)

