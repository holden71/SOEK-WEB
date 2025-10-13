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


@router.post("/calculate-sigma-alt")
async def calculate_sigma_alt(
    db: DbSessionDep,
    params: dict = Body(...)
):
    """
    Calculate sigma alternative values using formulas:
    - SIGMA_S_ALT_1 = SIGMA_S_1 + SIGMA_S_S1 * (M1 - 1)
    - SIGMA_S_ALT_2 = SIGMA_S_2 + SIGMA_S_S2 * (M1 - 1)
    """
    try:
        ek_id = params.get("ek_id")
        if not ek_id:
            raise HTTPException(status_code=400, detail="ek_id is required")
        
        # Check if element exists
        from sqlalchemy import text
        check_query = text("SELECT COUNT(*) FROM SRTN_EK_SEISM_DATA WHERE EK_ID = :ek_id")
        check_result = db.execute(check_query, {"ek_id": ek_id})
        if check_result.scalar() == 0:
            raise HTTPException(status_code=404, detail=f"Element with EK_ID {ek_id} not found")
        
        # Get required data from database
        data_query = text("""
            SELECT 
                SIGMA_S_1_PZ, SIGMA_S_2_PZ, SIGMA_S_S1_PZ, SIGMA_S_S2_PZ, M1_PZ,
                SIGMA_S_1_MRZ, SIGMA_S_2_MRZ, SIGMA_S_S1_MRZ, SIGMA_S_S2_MRZ, M1_MRZ
            FROM SRTN_EK_SEISM_DATA 
            WHERE EK_ID = :ek_id
        """)
        
        result = db.execute(data_query, {"ek_id": ek_id})
        row = result.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail=f"No data found for EK_ID {ek_id}")
        
        (
            sigma_s_1_pz, sigma_s_2_pz, sigma_s_s1_pz, sigma_s_s2_pz, m1_pz,
            sigma_s_1_mrz, sigma_s_2_mrz, sigma_s_s1_mrz, sigma_s_s2_mrz, m1_mrz
        ) = row
        
        # Calculate sigma_alt values and prepare updates
        update_fields = []
        update_params = {"ek_id": ek_id}
        calculated_values = {}
        
        # Calculate SIGMA_S_ALT_1_PZ
        if all(v is not None for v in [sigma_s_1_pz, sigma_s_s1_pz, m1_pz]):
            sigma_alt_1_pz = sigma_s_1_pz + sigma_s_s1_pz * (m1_pz - 1)
            update_fields.append("SIGMA_S_ALT_1_PZ = :sigma_alt_1_pz")
            update_params["sigma_alt_1_pz"] = sigma_alt_1_pz
            calculated_values["SIGMA_S_ALT_1_PZ"] = sigma_alt_1_pz
        
        # Calculate SIGMA_S_ALT_2_PZ
        if all(v is not None for v in [sigma_s_2_pz, sigma_s_s2_pz, m1_pz]):
            sigma_alt_2_pz = sigma_s_2_pz + sigma_s_s2_pz * (m1_pz - 1)
            update_fields.append("SIGMA_S_ALT_2_PZ = :sigma_alt_2_pz")
            update_params["sigma_alt_2_pz"] = sigma_alt_2_pz
            calculated_values["SIGMA_S_ALT_2_PZ"] = sigma_alt_2_pz
        
        # Calculate SIGMA_S_ALT_1_MRZ
        if all(v is not None for v in [sigma_s_1_mrz, sigma_s_s1_mrz, m1_mrz]):
            sigma_alt_1_mrz = sigma_s_1_mrz + sigma_s_s1_mrz * (m1_mrz - 1)
            update_fields.append("SIGMA_S_ALT_1_MRZ = :sigma_alt_1_mrz")
            update_params["sigma_alt_1_mrz"] = sigma_alt_1_mrz
            calculated_values["SIGMA_S_ALT_1_MRZ"] = sigma_alt_1_mrz
        
        # Calculate SIGMA_S_ALT_2_MRZ
        if all(v is not None for v in [sigma_s_2_mrz, sigma_s_s2_mrz, m1_mrz]):
            sigma_alt_2_mrz = sigma_s_2_mrz + sigma_s_s2_mrz * (m1_mrz - 1)
            update_fields.append("SIGMA_S_ALT_2_MRZ = :sigma_alt_2_mrz")
            update_params["sigma_alt_2_mrz"] = sigma_alt_2_mrz
            calculated_values["SIGMA_S_ALT_2_MRZ"] = sigma_alt_2_mrz
        
        # If no calculations were possible, return success with empty values
        if not update_fields:
            return {
                "success": True,
                "message": "No calculations performed - insufficient data for both PZ and MRZ",
                "calculated_values": {}
            }
        
        # Update database with calculated values
        update_query = text(f"""
            UPDATE SRTN_EK_SEISM_DATA 
            SET {', '.join(update_fields)}
            WHERE EK_ID = :ek_id
        """)
        
        db.execute(update_query, update_params)
        db.commit()
        
        return {
            "success": True,
            "message": f"Successfully calculated {len(calculated_values)} sigma alt value(s)",
            "calculated_values": calculated_values
        }
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"Error calculating sigma alt: {e}")
        raise HTTPException(status_code=500, detail=str(e))

