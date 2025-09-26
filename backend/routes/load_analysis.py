"""
Load Analysis routes using SQLAlchemy ORM
"""
from fastapi import APIRouter, Body, HTTPException

from db import DbSessionDep
from models import LoadAnalysisParams
from database_utils import get_ek_seism_data_by_id, update_ek_seism_data_orm
from database_models import EkSeismData


router = APIRouter(prefix="/api", tags=["load_analysis"])


@router.post("/save-load-analysis-params")
async def save_load_analysis_params(db: DbSessionDep, params: LoadAnalysisParams = Body(...)):
    """Save load analysis parameters using SQLAlchemy ORM"""
    try:
        # Check if EK_ID exists using ORM
        ek_data = get_ek_seism_data_by_id(db, params.element_id)
        if not ek_data:
            raise HTTPException(status_code=404, detail=f"Element with EK_ID {params.element_id} not found")

        # Field mapping for parameters
        field_mapping = {
            "material": "MAT_NAME",
            "doc_code_analytics": "DOC_1", 
            "doc_code_operation": "DOC_2",
            "sigma_alt_dop": "SIGMA_ALT_DOP",
            "p1_pz": "P1_PZ",
            "temp1_pz": "TEMP1_PZ",
            "p2_pz": "P2_PZ", 
            "temp2_pz": "TEMP2_PZ",
            "sigma_dop_a_pz": "SIGMA_DOP_A_PZ",
            "ratio_e_pz": "RATIO_E_PZ",
            "p1_mrz": "P1_MRZ",
            "temp1_mrz": "TEMP1_MRZ",
            "p2_mrz": "P2_MRZ",
            "temp2_mrz": "TEMP2_MRZ", 
            "sigma_dop_a_mrz": "SIGMA_DOP_A_MRZ",
            "ratio_e_mrz": "RATIO_E_MRZ",
            "delta_t_pz": "DELTA_T_PZ",
            "ratio_p_pz": "RATIO_P_PZ",
            "delta_t_mrz": "DELTA_T_MRZ",
            "ratio_p_mrz": "RATIO_P_MRZ",
            "ration_sigma_dop_pz": "RATION_SIGMA_DOP_PZ",
            "ration_sigma_dop_mrz": "RATION_SIGMA_DOP_MRZ",
            "m1_alt_pz": "M1_ALT_PZ",
            "m1_alt_mrz": "M1_ALT_MRZ",
            "k1_alt_pz": "K1_ALT_PZ",
            "k1_alt_mrz": "K1_ALT_MRZ",
        }

        # Prepare update data
        update_data = {}
        updated_fields = {}
        
        for param_name, db_column in field_mapping.items():
            param_value = getattr(params, param_name)
            if param_value is not None:
                update_data[db_column] = param_value
                updated_fields[db_column] = param_value

        if not update_data:
            raise HTTPException(status_code=400, detail="At least one load analysis parameter must be provided")

        # Update using ORM
        update_ek_seism_data_orm(db, params.element_id, **update_data)
        
        # Commit transaction
        db.commit()

        return {
            "success": True,
            "message": f"Successfully saved load analysis parameters for EK_ID {params.element_id}",
            "updated_fields": updated_fields,
        }
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error saving load analysis parameters: {str(e)}")


@router.get("/get-load-analysis-params/{ek_id}")
async def get_load_analysis_params(db: DbSessionDep, ek_id: int):
    """Get load analysis parameters using SQLAlchemy ORM"""
    try:
        # Get data using ORM
        ek_data = get_ek_seism_data_by_id(db, ek_id)
        if not ek_data:
            raise HTTPException(status_code=404, detail=f"Element with EK_ID {ek_id} not found")

        # Convert ORM object to dictionary
        result_data = {}
        for column in ek_data.__table__.columns:
            result_data[column.name] = getattr(ek_data, column.name)

        return {
            "success": True,
            "data": result_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving load analysis parameters: {str(e)}")