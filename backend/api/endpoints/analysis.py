"""
Analysis endpoints - анализ и расчеты
"""
from fastapi import APIRouter, Body, Query, HTTPException

from api.dependencies import DbSessionDep
from schemas import LoadAnalysisParams
from schemas.analysis import (
    SaveAnalysisResultParams,
    SaveAnalysisResultResponse,
    SaveStressInputsParams,
    SaveStressInputsResponse,
    SaveKResultsParams,
    SaveKResultsResponse
)
from services.analysis import AnalysisService
from services import LoadAnalysisService

router = APIRouter(prefix="/api", tags=["analysis"])
analysis_service = AnalysisService()
load_analysis_service = LoadAnalysisService()


@router.post("/save-analysis-result", response_model=SaveAnalysisResultResponse)
async def save_analysis_result(
    db: DbSessionDep,
    params: SaveAnalysisResultParams = Body(...)
):
    """Save analysis result (M1, M2 values)"""
    try:
        result = analysis_service.save_analysis_result(
            db,
            params.ek_id,
            params.spectrum_type,
            params.m1,
            params.m2
        )
        db.commit()
        return SaveAnalysisResultResponse(**result)
    except Exception as e:
        db.rollback()
        print(f"Error saving analysis result: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/save-stress-inputs", response_model=SaveStressInputsResponse)
async def save_stress_inputs(
    db: DbSessionDep,
    params: SaveStressInputsParams = Body(...)
):
    """Save stress inputs"""
    try:
        result = analysis_service.save_stress_inputs(
            db,
            params.ek_id,
            natural_frequency=params.natural_frequency,
            sigma_dop=params.sigma_dop,
            hclpf=params.hclpf,
            sigma_1=params.sigma_1,
            sigma_2=params.sigma_2,
            sigma_1_1_pz=params.sigma_1_1_pz,
            sigma_1_2_pz=params.sigma_1_2_pz,
            sigma_1_s1_pz=params.sigma_1_s1_pz,
            sigma_2_s2_pz=params.sigma_2_s2_pz,
            sigma_1_1_mrz=params.sigma_1_1_mrz,
            sigma_1_2_mrz=params.sigma_1_2_mrz,
            sigma_1_s1_mrz=params.sigma_1_s1_mrz,
            sigma_2_s2_mrz=params.sigma_2_s2_mrz,
        )
        db.commit()
        return SaveStressInputsResponse(**result)
    except Exception as e:
        db.rollback()
        print(f"Error saving stress inputs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/save-k-results", response_model=SaveKResultsResponse)
async def save_k_results(
    db: DbSessionDep,
    params: SaveKResultsParams = Body(...)
):
    """Save K calculation results"""
    try:
        result = analysis_service.save_k_results(
            db,
            params.ek_id,
            k1_pz=params.k1_pz,
            k1_mrz=params.k1_mrz,
            k3_pz=params.k3_pz,
            k3_mrz=params.k3_mrz,
            k2_value=params.k2_value,
            n_pz=params.n_pz,
            n_mrz=params.n_mrz,
        )
        db.commit()
        return SaveKResultsResponse(**result)
    except Exception as e:
        db.rollback()
        print(f"Error saving K results: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/get-k-results/{ek_id}")
async def get_k_results(
    db: DbSessionDep,
    ek_id: int
):
    """Get K calculation results"""
    try:
        return analysis_service.get_k_results(db, ek_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        print(f"Error getting K results: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/get-calculation-results")
async def get_calculation_results(
    db: DbSessionDep,
    ek_id: int = Query(...)
):
    """Get all calculation results for element"""
    try:
        return analysis_service.get_calculation_results(db, ek_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        print(f"Error getting calculation results: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/get-stress-inputs")
async def get_stress_inputs(
    db: DbSessionDep,
    ek_id: int = Query(...)
):
    """Get stress inputs for element"""
    try:
        return analysis_service.get_stress_inputs(db, ek_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        print(f"Error getting stress inputs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/check-calculation-requirements")
async def check_calculation_requirements(
    db: DbSessionDep,
    ek_id: int = Query(...)
):
    """Check if calculation requirements are met"""
    try:
        return analysis_service.check_calculation_requirements(db, ek_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        print(f"Error checking calculation requirements: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/save-load-analysis-params")
async def save_load_analysis_params(
    db: DbSessionDep,
    params: LoadAnalysisParams = Body(...)
):
    """Save load analysis parameters"""
    try:
        result = load_analysis_service.save_load_analysis_params(db, params)
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
    return load_analysis_service.get_load_analysis_params(db, ek_id)

