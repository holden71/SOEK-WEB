"""
Seismic Analysis endpoints - анализ изменения сейсмических требований
"""
from fastapi import APIRouter, Body, Query, HTTPException

from api.dependencies import DbSessionDep
from schemas.analysis import (
    SaveAnalysisResultParams,
    SaveAnalysisResultResponse,
    SaveStressInputsParams,
    SaveStressInputsResponse,
    SaveKResultsParams,
    SaveKResultsResponse
)
from services import SeismicAnalysisService

router = APIRouter(prefix="/api", tags=["seismic-analysis"])
seismic_service = SeismicAnalysisService()


@router.post("/save-analysis-result", response_model=SaveAnalysisResultResponse)
async def save_analysis_result(
    db: DbSessionDep,
    params: SaveAnalysisResultParams = Body(...)
):
    """Save analysis result (M1, M2 values)"""
    try:
        result = seismic_service.save_analysis_result(
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
    """Save stress inputs - only update fields that were explicitly provided in the request"""
    try:
        # Use model_dump(exclude_unset=True) to get only fields that were explicitly set in the request
        # This way we don't overwrite fields that weren't included in the request
        params_dict = params.model_dump(exclude_unset=True)
        
        # Remove ek_id from params_dict as it's passed separately
        ek_id = params_dict.pop('ek_id')
        
        result = seismic_service.save_stress_inputs(
            db,
            ek_id,
            **params_dict  # Pass only the fields that were explicitly provided
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
        result = seismic_service.save_k_results(
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
        return seismic_service.get_k_results(db, ek_id)
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
        return seismic_service.get_calculation_results(db, ek_id)
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
        return seismic_service.get_stress_inputs(db, ek_id)
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
        return seismic_service.check_calculation_requirements(db, ek_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        print(f"Error checking calculation requirements: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# TODO: УБРАТЬ ЭТУ ЗАГЛУШКУ - временная заглушка для тестирования
@router.post("/calculate-sigma-alt")
async def calculate_sigma_alt(
    db: DbSessionDep,
    params: dict = Body(...)
):
    """
    ВРЕМЕННАЯ ЗАГЛУШКА! УДАЛИТЬ ПОСЛЕ РЕАЛИЗАЦИИ НАСТОЯЩЕЙ ЛОГИКИ!
    Calculate sigma alternative values
    """
    try:
        ek_id = params.get("ek_id")
        if not ek_id:
            raise HTTPException(status_code=400, detail="ek_id is required")
        
        # ЗАГЛУШКА: возвращаем тестовые значения
        return {
            "success": True,
            "calculated_values": {
                "SIGMA_S_ALT_1_PZ": 125.5,  # Тестовое значение
                "SIGMA_S_ALT_2_PZ": 98.3,   # Тестовое значение
                "SIGMA_S_ALT_1_MRZ": 145.7, # Тестовое значение
                "SIGMA_S_ALT_2_MRZ": 112.4  # Тестовое значение
            },
            "message": "ВНИМАНИЕ: Это тестовые данные из заглушки!"
        }
    except Exception as e:
        print(f"Error in calculate-sigma-alt stub: {e}")
        raise HTTPException(status_code=500, detail=str(e))

