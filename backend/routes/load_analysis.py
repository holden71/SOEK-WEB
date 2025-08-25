from fastapi import APIRouter, Body, HTTPException
from sqlalchemy import text

from db import DbSessionDep
from models import LoadAnalysisParams


def ensure_columns_exist(db):
    """Ensure that required columns exist in the table"""
    try:
        # Check if columns exist
        check_columns_query = text("""
            SELECT COUNT(*)
            FROM user_tab_columns
            WHERE table_name = 'SRTN_EK_SEISM_DATA'
            AND column_name IN ('FIRST_FREQ_ALT_PZ', 'FIRST_FREQ_ALT_MRZ', 'RATION_SIGMA_DOP_PZ', 'RATION_SIGMA_DOP_MRZ', 'SIGMA_ALT_DOP')
        """)
        result = db.execute(check_columns_query)
        columns_count = result.scalar()

        if columns_count < 5:
            # Add missing columns one by one to avoid errors if some already exist
            try:
                db.execute(text("ALTER TABLE SRTN_EK_SEISM_DATA ADD FIRST_FREQ_ALT_PZ NUMBER"))
                db.commit()
            except:
                pass

            try:
                db.execute(text("ALTER TABLE SRTN_EK_SEISM_DATA ADD FIRST_FREQ_ALT_MRZ NUMBER"))
                db.commit()
            except:
                pass

            try:
                db.execute(text("ALTER TABLE SRTN_EK_SEISM_DATA ADD RATION_SIGMA_DOP_PZ NUMBER"))
                db.commit()
            except:
                pass

            try:
                db.execute(text("ALTER TABLE SRTN_EK_SEISM_DATA ADD RATION_SIGMA_DOP_MRZ NUMBER"))
                db.commit()
            except:
                pass

            try:
                db.execute(text("ALTER TABLE SRTN_EK_SEISM_DATA ADD SIGMA_ALT_DOP NUMBER"))
                db.commit()
            except:
                pass
    except Exception as e:
        # Log error but don't fail - columns might already exist
        print(f"Warning: Could not ensure columns exist: {e}")


router = APIRouter(prefix="/api", tags=["load-analysis"])


@router.post("/save-load-analysis-params")
async def save_load_analysis_params(db: DbSessionDep, params: LoadAnalysisParams = Body(...)):
    try:
        # Ensure columns exist before saving
        ensure_columns_exist(db)

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
            "first_freq_alt_pz": "FIRST_FREQ_ALT_PZ",
            "first_freq_alt_mrz": "FIRST_FREQ_ALT_MRZ",
            "ration_sigma_dop_pz": "RATION_SIGMA_DOP_PZ",
            "ration_sigma_dop_mrz": "RATION_SIGMA_DOP_MRZ",
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
        # Ensure columns exist before reading
        ensure_columns_exist(db)

        check_query = text("SELECT COUNT(*) FROM SRTN_EK_SEISM_DATA WHERE EK_ID = :ek_id")
        check_result = db.execute(check_query, {"ek_id": ek_id})
        if check_result.scalar() == 0:
            raise HTTPException(status_code=404, detail=f"Element with EK_ID {ek_id} not found")

        params_query = text(
            """
            SELECT
                MAT_NAME, DOC_1, DOC_2, SIGMA_ALT_DOP,
                P1_PZ, TEMP1_PZ, P2_PZ, TEMP2_PZ, SIGMA_DOP_A_PZ, RATIO_E_PZ,
                P1_MRZ, TEMP1_MRZ, P2_MRZ, TEMP2_MRZ, SIGMA_DOP_A_MRZ, RATIO_E_MRZ,
                DELTA_T_PZ, RATIO_P_PZ, DELTA_T_MRZ, RATIO_P_MRZ,
                FIRST_FREQ_ALT_PZ, FIRST_FREQ_ALT_MRZ,
                RATION_SIGMA_DOP_PZ, RATION_SIGMA_DOP_MRZ
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
            "sigma_alt_dop": row[3],
            "p1_pz": row[4],
            "temp1_pz": row[5],
            "p2_pz": row[6],
            "temp2_pz": row[7],
            "sigma_dop_a_pz": row[8],
            "ratio_e_pz": row[9],
            "p1_mrz": row[10],
            "temp1_mrz": row[11],
            "p2_mrz": row[12],
            "temp2_mrz": row[13],
            "sigma_dop_a_mrz": row[14],
            "ratio_e_mrz": row[15],
            "delta_t_pz": row[16],
            "ratio_p_pz": row[17],
            "delta_t_mrz": row[18],
            "ratio_p_mrz": row[19],
            "first_freq_alt_pz": row[20],
            "first_freq_alt_mrz": row[21],
            "ration_sigma_dop_pz": row[22],
            "ration_sigma_dop_mrz": row[23],
        }
        return {"success": True, "ek_id": ek_id, "load_params": load_params}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving load analysis parameters: {str(e)}")


