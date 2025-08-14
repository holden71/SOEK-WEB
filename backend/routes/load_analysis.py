from fastapi import APIRouter, Body, HTTPException
from sqlalchemy import text

from db import DbSessionDep
from models import LoadAnalysisParams


router = APIRouter(prefix="/api", tags=["load-analysis"])


@router.post("/save-load-analysis-params")
async def save_load_analysis_params(db: DbSessionDep, params: LoadAnalysisParams = Body(...)):
    try:
        check_query = text("SELECT COUNT(*) FROM SRTN_EK_SEISM_DATA WHERE EK_ID = :ek_id")
        check_result = db.execute(check_query, {"ek_id": params.element_id})
        if check_result.scalar() == 0:
            raise HTTPException(status_code=404, detail=f"Element with EK_ID {params.element_id} not found")

        update_fields = []
        update_params = {"ek_id": params.element_id}
        field_mapping = {
            "material": "MAT_NAME",
            "doc_code_analytics": "DOC_1",
            "doc_code_operation": "DOC_2",
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
        }
        for param_name, db_column in field_mapping.items():
            param_value = getattr(params, param_name)
            update_fields.append(f"{db_column} = :{param_name}")
            update_params[param_name] = param_value

        if not update_fields:
            raise HTTPException(status_code=400, detail="At least one load analysis parameter must be provided")

        update_query = text(
            f"""
            UPDATE SRTN_EK_SEISM_DATA 
            SET {', '.join(update_fields)}
            WHERE EK_ID = :ek_id
            """
        )
        result = db.execute(update_query, update_params)
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail=f"No rows updated for EK_ID {params.element_id}")
        db.commit()
        updated_fields = {}
        for param_name, db_column in field_mapping.items():
            param_value = getattr(params, param_name)
            if param_value is not None:
                updated_fields[db_column] = param_value
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
    try:
        check_query = text("SELECT COUNT(*) FROM SRTN_EK_SEISM_DATA WHERE EK_ID = :ek_id")
        check_result = db.execute(check_query, {"ek_id": ek_id})
        if check_result.scalar() == 0:
            raise HTTPException(status_code=404, detail=f"Element with EK_ID {ek_id} not found")

        params_query = text(
            """
            SELECT 
                MAT_NAME, DOC_1, DOC_2,
                P1_PZ, TEMP1_PZ, P2_PZ, TEMP2_PZ, SIGMA_DOP_A_PZ, RATIO_E_PZ,
                P1_MRZ, TEMP1_MRZ, P2_MRZ, TEMP2_MRZ, SIGMA_DOP_A_MRZ, RATIO_E_MRZ,
                DELTA_T_PZ, RATIO_P_PZ, DELTA_T_MRZ, RATIO_P_MRZ
            FROM SRTN_EK_SEISM_DATA 
            WHERE EK_ID = :ek_id
            """
        )
        result = db.execute(params_query, {"ek_id": ek_id})
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"No data found for EK_ID {ek_id}")
        load_params = {
            "material": row[0],
            "doc_code_analytics": row[1],
            "doc_code_operation": row[2],
            "p1_pz": row[3],
            "temp1_pz": row[4],
            "p2_pz": row[5],
            "temp2_pz": row[6],
            "sigma_dop_a_pz": row[7],
            "ratio_e_pz": row[8],
            "p1_mrz": row[9],
            "temp1_mrz": row[10],
            "p2_mrz": row[11],
            "temp2_mrz": row[12],
            "sigma_dop_a_mrz": row[13],
            "ratio_e_mrz": row[14],
            "delta_t_pz": row[15],
            "ratio_p_pz": row[16],
            "delta_t_mrz": row[17],
            "ratio_p_mrz": row[18],
        }
        return {"success": True, "ek_id": ek_id, "load_params": load_params}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving load analysis parameters: {str(e)}")


