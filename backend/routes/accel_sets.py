from typing import Dict, List

from fastapi import APIRouter, Body, HTTPException
from sqlalchemy import inspect, text

from db import DbSessionDep
from models import (
    AccelData,
    ClearAccelSetParams,
    ClearAccelSetResult,
    FindReqAccelSetParams,
    FindReqAccelSetResult,
    SaveKResultsParams,
    SaveKResultsResponse,
    SaveStressInputsParams,
    SaveStressInputsResponse,
    SaveAnalysisResultParams,
    SaveAnalysisResultResponse,
    SpectralDataResult,
    SetAccelProcedureParams,
    SetAccelProcedureResult,
)


router = APIRouter(prefix="/api", tags=["accel"])


@router.post("/save-accel-data")
async def save_accel_data(
    db: DbSessionDep,
    data: AccelData = Body(...),
):
    try:
        inspector = inspect(db.get_bind())
        columns = inspector.get_columns('SRTN_ACCEL_SET')
        column_names = [col['name'] for col in columns]
        pga_column = None
        for col in column_names:
            if col.upper() == 'PGA' or col.upper().startswith('PGA_'):
                pga_column = col
                break

        plant_result = db.execute(
            text("SELECT NAME FROM UNS_PLANTS WHERE PLANT_ID = :plant_id"),
            {"plant_id": data.plant_id},
        )
        plant_name = plant_result.scalar()

        unit_result = db.execute(
            text("SELECT NAME FROM UNS_UNITS WHERE UNIT_ID = :unit_id"),
            {"unit_id": data.unit_id},
        )
        unit_name = unit_result.scalar()

        if not plant_name or not unit_name:
            raise HTTPException(status_code=400, detail="Invalid plant or unit ID")

        created_records: Dict[str, List[int] | int | None] = {
            "sets": [],
            "plots": [],
            "points": 0,
            "mrz_set_id": None,
            "pz_set_id": None,
        }

        for sheet_name, sheet_data in data.sheets.items():
            dempf = sheet_data.dempf
            sheet_columns = sheet_data.data

            freq_column = None
            for col_name in sheet_columns.keys():
                if col_name.lower() in [
                    "частота",
                    "частота, гц",
                    "частота,гц",
                    "частота гц",
                    "част",
                    "frequency",
                    "freq",
                    "hz",
                ]:
                    freq_column = col_name
                    break

            if not freq_column:
                columns_local = list(sheet_columns.keys())
                if columns_local:
                    freq_column = columns_local[0]
                else:
                    continue

            valid_spectrum_types = ["МРЗ", "ПЗ"]
            valid_axes = ["x", "y", "z"]
            relevant_columns = [freq_column]

            for column_name in sheet_columns.keys():
                if "_" in column_name:
                    parts = column_name.split("_")
                    if len(parts) == 2 and parts[0] in valid_spectrum_types and parts[1].lower() in valid_axes:
                        relevant_columns.append(column_name)

            spectrum_types = set()
            for column_name in relevant_columns:
                if "_" in column_name:
                    spectrum_type = column_name.split("_")[0]
                    if spectrum_type in valid_spectrum_types:
                        spectrum_types.add(spectrum_type)

            for spectrum_type in spectrum_types:
                lev = data.lev
                set_params = {
                    "set_type": data.set_type,
                    "building": data.building,
                    "room": data.room,
                    "lev": lev,
                    "lev1": data.lev1,
                    "lev2": data.lev2,
                    "dempf": dempf,
                    "plant_id": data.plant_id,
                    "plant_name": plant_name,
                    "unit_id": data.unit_id,
                    "unit_name": unit_name,
                    "spectr_type": spectrum_type,
                    "calc_type": data.calc_type,
                }

                db.execute(
                    text(
                        """
                        INSERT INTO SRTN_ACCEL_SET(SET_TYPE, BUILDING, ROOM, LEV, LEV1, LEV2, DEMPF, 
                        PLANT_ID, PLANT_NAME, UNIT_ID, UNIT_NAME, SPECTR_EARTHQ_TYPE, CALC_TYPE) 
                        VALUES(:set_type, :building, :room, :lev, :lev1, :lev2, :dempf, :plant_id, 
                        :plant_name, :unit_id, :unit_name, :spectr_type, :calc_type)
                        """
                    ),
                    set_params,
                )

                id_query = text(
                    """
                    SELECT ACCEL_SET_ID FROM (
                        SELECT ACCEL_SET_ID FROM SRTN_ACCEL_SET 
                        WHERE PLANT_ID = :plant_id 
                        AND UNIT_ID = :unit_id 
                        AND BUILDING = :building
                        AND ((:dempf IS NULL AND DEMPF IS NULL) OR DEMPF = :dempf)
                        AND SPECTR_EARTHQ_TYPE = :spectr_type
                        ORDER BY ACCEL_SET_ID DESC
                    ) WHERE ROWNUM = 1
                    """
                )

                id_result = db.execute(
                    id_query,
                    {
                        "plant_id": data.plant_id,
                        "unit_id": data.unit_id,
                        "building": data.building,
                        "dempf": dempf,
                        "spectr_type": spectrum_type,
                    },
                )

                set_id = id_result.scalar()
                created_records["sets"].append(set_id)

                if spectrum_type == "МРЗ":
                    created_records["mrz_set_id"] = set_id
                elif spectrum_type == "ПЗ":
                    created_records["pz_set_id"] = set_id

                if data.pga is not None:
                    try:
                        if pga_column:
                            update_pga_query = text(
                                f"""
                                UPDATE SRTN_ACCEL_SET
                                SET {pga_column} = :pga_value
                                WHERE ACCEL_SET_ID = :set_id
                                """
                            )
                            db.execute(update_pga_query, {"pga_value": data.pga, "set_id": set_id})
                        else:
                            try_columns = ['FGA', 'PGA']
                            for col_name in try_columns:
                                try:
                                    update_query = text(
                                        f"""
                                        UPDATE SRTN_ACCEL_SET
                                        SET {col_name} = :pga_value
                                        WHERE ACCEL_SET_ID = :set_id
                                        """
                                    )
                                    db.execute(update_query, {"pga_value": data.pga, "set_id": set_id})
                                    break
                                except Exception:
                                    continue
                    except Exception:
                        pass

                plot_ids: Dict[str, int] = {}
                for axis in ["x", "y", "z"]:
                    column_name = f"{spectrum_type}_{axis}"
                    if column_name not in sheet_columns:
                        continue

                    db.execute(
                        text(
                            """
                            INSERT INTO SRTN_ACCEL_PLOT (AXIS, NAME)
                            VALUES (:axis, :name)
                            """
                        ),
                        {"axis": axis.upper(), "name": column_name},
                    )

                    plot_id_query = text(
                        """
                        SELECT PLOT_ID FROM (
                            SELECT PLOT_ID FROM SRTN_ACCEL_PLOT 
                            WHERE AXIS = :axis AND NAME = :name
                            ORDER BY PLOT_ID DESC
                        ) WHERE ROWNUM = 1
                        """
                    )
                    plot_id_result = db.execute(plot_id_query, {"axis": axis.upper(), "name": column_name})
                    plot_id = plot_id_result.scalar()
                    plot_ids[axis] = plot_id
                    created_records["plots"].append(plot_id)

                update_set_query = text(
                    """
                    UPDATE SRTN_ACCEL_SET
                    SET X_PLOT_ID = :x_plot_id, Y_PLOT_ID = :y_plot_id, Z_PLOT_ID = :z_plot_id
                    WHERE ACCEL_SET_ID = :set_id
                    """
                )
                db.execute(
                    update_set_query,
                    {
                        "x_plot_id": plot_ids.get("x"),
                        "y_plot_id": plot_ids.get("y"),
                        "z_plot_id": plot_ids.get("z"),
                        "set_id": set_id,
                    },
                )

                for axis in ["x", "y", "z"]:
                    column_name = f"{spectrum_type}_{axis}"
                    if column_name not in sheet_columns or axis not in plot_ids:
                        continue
                    plot_id = plot_ids[axis]
                    frequencies = sheet_columns.get(freq_column, [])
                    accelerations = sheet_columns.get(column_name, [])
                    num_points = min(len(frequencies), len(accelerations))
                    for i in range(num_points):
                        try:
                            freq = float(frequencies[i])
                            accel = float(accelerations[i])
                            point_query = text(
                                """
                                INSERT INTO SRTN_ACCEL_POINT (FREQ, ACCEL, PLOT_ID)
                                VALUES (:freq, :accel, :plot_id)
                                """
                            )
                            db.execute(point_query, {"freq": freq, "accel": accel, "plot_id": plot_id})
                            created_records["points"] = int(created_records["points"]) + 1
                        except (ValueError, TypeError):
                            continue

        db.commit()

        return {
            "success": True,
            "message": "Data saved successfully",
            "created": created_records,
            "mrz_set_id": created_records.get("mrz_set_id"),
            "pz_set_id": created_records.get("pz_set_id"),
        }
    except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Error saving acceleration data: {str(e)}")


@router.post("/execute-set-all-ek-accel-set", response_model=SetAccelProcedureResult)
async def execute_set_all_ek_accel_set(
    db: DbSessionDep,
    params: SetAccelProcedureParams = Body(...),
):
    try:
        conn = db.connection().connection
        cursor = conn.cursor()

        done_for_id_mrz = cursor.var(int)
        done_for_id_pz = cursor.var(int)
        done_for_all_mrz = cursor.var(int)
        done_for_all_pz = cursor.var(int)
        total_ek = cursor.var(int)
        processed_mrz = cursor.var(int)
        processed_pz = cursor.var(int)

        cursor.callproc(
            'SET_ALL_EK_ACCEL_SET',
            [
                params.ek_id,
                params.set_mrz,
                params.set_pz,
                params.can_overwrite,
                params.do_for_all,
                params.clear_sets,
                done_for_id_mrz,
                done_for_id_pz,
                done_for_all_mrz,
                done_for_all_pz,
                total_ek,
                processed_mrz,
                processed_pz,
            ],
        )

        db.commit()
        return SetAccelProcedureResult(
            done_for_id_mrz=done_for_id_mrz.getvalue(),
            done_for_id_pz=done_for_id_pz.getvalue(),
            done_for_all_mrz=done_for_all_mrz.getvalue() if params.do_for_all else None,
            done_for_all_pz=done_for_all_pz.getvalue() if params.do_for_all else None,
            total_ek=total_ek.getvalue(),
            processed_mrz=processed_mrz.getvalue(),
            processed_pz=processed_pz.getvalue(),
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error executing SET_ALL_EK_ACCEL_SET procedure: {str(e)}")


@router.post("/find-req-accel-set", response_model=FindReqAccelSetResult)
async def find_req_accel_set(
    db: DbSessionDep,
    params: FindReqAccelSetParams = Body(...),
):
    try:
        conn = db.connection().connection
        cursor = conn.cursor()

        set_id_out = cursor.var(int)
        found_ek_out = cursor.var(int)

        cursor.callproc(
            'FIND_REQ_ACCEL_SET',
            [
                params.plant_id,
                params.unit_id,
                params.building,
                params.room,
                params.lev1,
                params.lev2,
                params.earthq_type,
                params.calc_type,
                params.set_type,
                params.dempf,
                set_id_out,
                found_ek_out,
            ],
        )

        return FindReqAccelSetResult(set_id=set_id_out.getvalue(), found_ek=found_ek_out.getvalue())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error executing FIND_REQ_ACCEL_SET procedure: {str(e)}")


@router.post("/clear-accel-set-arrays", response_model=ClearAccelSetResult)
async def clear_accel_set_arrays(
    db: DbSessionDep,
    params: ClearAccelSetParams = Body(...),
):
    try:
        conn = db.connection().connection
        cursor = conn.cursor()

        clear_result_out = cursor.var(str)
        cursor.callproc('CLEAR_ACCEL_CET_ARRAYS', [params.set_id, clear_result_out])
        db.commit()
        return ClearAccelSetResult(clear_result=clear_result_out.getvalue())
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error executing CLEAR_ACCEL_CET_ARRAYS procedure: {str(e)}")


@router.get("/spectral-data", response_model=SpectralDataResult)
async def get_spectral_data(
    db: DbSessionDep,
    ek_id: int,
    calc_type: str,
    spectrum_type: str,
):
    try:
        element_query = text(
            """
            SELECT BUILDING, ROOM, LEV, PLANT_ID, UNIT_ID
            FROM SRTN_EK_SEISM_DATA 
            WHERE EK_ID = :ek_id
            """
        )
        element_result = db.execute(element_query, {"ek_id": ek_id})
        element_row = element_result.fetchone()
        if not element_row:
            raise HTTPException(status_code=404, detail=f"Element with EK_ID {ek_id} not found")

        building, room, lev, plant_id, unit_id = element_row

        set_query = text(
            """
            SELECT ACCEL_SET_ID, X_PLOT_ID, Y_PLOT_ID, Z_PLOT_ID
            FROM SRTN_ACCEL_SET
            WHERE PLANT_ID = :plant_id
            AND UNIT_ID = :unit_id
            AND BUILDING = :building
            AND (ROOM = :room OR (ROOM IS NULL AND :room IS NULL))
            AND (LEV = :lev OR (LEV IS NULL AND :lev IS NULL))
            AND SPECTR_EARTHQ_TYPE = :spectrum_type
            AND CALC_TYPE = :calc_type
            AND SET_TYPE = 'ХАРАКТЕРИСТИКИ'
            ORDER BY ACCEL_SET_ID DESC
            """
        )
        set_result = db.execute(
            set_query,
            {
                "plant_id": plant_id,
                "unit_id": unit_id,
                "building": building,
                "room": room,
                "lev": lev,
                "spectrum_type": spectrum_type,
                "calc_type": calc_type,
            },
        )
        set_row = set_result.fetchone()
        if not set_row:
            return SpectralDataResult(frequency=[])

        _, x_plot_id, y_plot_id, z_plot_id = set_row

        def get_plot_data(plot_id):
            if not plot_id:
                return [], []
            point_query = text(
                """
                SELECT FREQ, ACCEL
                FROM SRTN_ACCEL_POINT
                WHERE PLOT_ID = :plot_id
                ORDER BY FREQ
                """
            )
            point_result = db.execute(point_query, {"plot_id": plot_id})
            points = point_result.fetchall()
            frequencies = []
            accelerations = []
            for point in points:
                freq = float(point[0]) if point[0] is not None else 0.0
                accel = float(point[1]) if point[1] is not None else 0.0
                frequencies.append(freq)
                accelerations.append(accel)
            return frequencies, accelerations

        x_freq, x_accel = get_plot_data(x_plot_id)
        y_freq, y_accel = get_plot_data(y_plot_id)
        z_freq, z_accel = get_plot_data(z_plot_id)
        all_frequencies = [x_freq, y_freq, z_freq]
        base_freq = max(all_frequencies, key=len) if any(all_frequencies) else []

        response_data = {"frequency": base_freq}
        if spectrum_type == "МРЗ":
            response_data["mrz_x"] = x_accel if x_accel else None
            response_data["mrz_y"] = y_accel if y_accel else None
            response_data["mrz_z"] = z_accel if z_accel else None
        elif spectrum_type == "ПЗ":
            response_data["pz_x"] = x_accel if x_accel else None
            response_data["pz_y"] = y_accel if y_accel else None
            response_data["pz_z"] = z_accel if z_accel else None

        return SpectralDataResult(**response_data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving spectral data: {str(e)}")


@router.get("/seism-requirements", response_model=SpectralDataResult)
async def get_seism_requirements(
    db: DbSessionDep,
    ek_id: int,
    dempf: float,
    spectr_earthq_type: str = "МРЗ",
    calc_type: str = "ДЕТЕРМІНІСТИЧНИЙ",
):
    try:
        conn = db.connection().connection
        cursor = conn.cursor()
        set_id_out = cursor.var(int)
        cursor.callproc('GET_SEISM_REQUIREMENTS', [ek_id, dempf, spectr_earthq_type, calc_type, set_id_out])
        set_id = set_id_out.getvalue()
        if not set_id:
            return SpectralDataResult(frequency=[])
        set_query = text(
            """
            SELECT ACCEL_SET_ID, X_PLOT_ID, Y_PLOT_ID, Z_PLOT_ID
            FROM SRTN_ACCEL_SET
            WHERE ACCEL_SET_ID = :set_id
            """
        )
        set_result = db.execute(set_query, {"set_id": set_id})
        set_row = set_result.fetchone()
        if not set_row:
            return SpectralDataResult(frequency=[])
        x_plot_id = set_row[1]
        y_plot_id = set_row[2]
        z_plot_id = set_row[3]

        def get_plot_data(plot_id):
            if not plot_id:
                return [], []
            point_query = text(
                """
                SELECT FREQ, ACCEL
                FROM SRTN_ACCEL_POINT
                WHERE PLOT_ID = :plot_id
                ORDER BY FREQ
                """
            )
            point_result = db.execute(point_query, {"plot_id": plot_id})
            points = point_result.fetchall()
            frequencies = []
            accelerations = []
            for point in points:
                freq = float(point[0]) if point[0] is not None else 0.0
                accel = float(point[1]) if point[1] is not None else 0.0
                frequencies.append(freq)
                accelerations.append(accel)
            return frequencies, accelerations

        x_freq, x_accel = get_plot_data(x_plot_id)
        y_freq, y_accel = get_plot_data(y_plot_id)
        z_freq, z_accel = get_plot_data(z_plot_id)
        all_frequencies = [x_freq, y_freq, z_freq]
        base_freq = max(all_frequencies, key=len) if any(all_frequencies) else []
        response_data = {"frequency": base_freq}
        if spectr_earthq_type == "МРЗ":
            response_data["mrz_x"] = x_accel if x_accel else None
            response_data["mrz_y"] = y_accel if y_accel else None
            response_data["mrz_z"] = z_accel if z_accel else None
        elif spectr_earthq_type == "ПЗ":
            response_data["pz_x"] = x_accel if x_accel else None
            response_data["pz_y"] = y_accel if y_accel else None
            response_data["pz_z"] = z_accel if z_accel else None
        return SpectralDataResult(**response_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving seism requirements: {str(e)}")


@router.post("/save-analysis-result", response_model=SaveAnalysisResultResponse)
async def save_analysis_result(
    db: DbSessionDep,
    params: SaveAnalysisResultParams = Body(...),
):
    try:
        if params.spectrum_type not in ["МРЗ", "ПЗ"]:
            raise HTTPException(status_code=400, detail="Invalid spectrum type. Must be МРЗ or ПЗ")
        if params.spectrum_type == "МРЗ":
            m1_column = "M1_MRZ"
            m2_column = "M2_MRZ"
        else:
            m1_column = "M1_PZ"
            m2_column = "M2_PZ"

        update_fields = []
        update_params = {"ek_id": params.ek_id}
        if params.m1 is not None:
            update_fields.append(f"{m1_column} = :m1")
            update_params["m1"] = params.m1
        if params.m2 is not None:
            update_fields.append(f"{m2_column} = :m2")
            update_params["m2"] = params.m2
        if not update_fields:
            raise HTTPException(status_code=400, detail="At least one of m1 or m2 must be provided")

        check_query = text("SELECT COUNT(*) FROM SRTN_EK_SEISM_DATA WHERE EK_ID = :ek_id")
        check_result = db.execute(check_query, {"ek_id": params.ek_id})
        if check_result.scalar() == 0:
            raise HTTPException(status_code=404, detail=f"Element with EK_ID {params.ek_id} not found")

        update_query = text(
            f"""
            UPDATE SRTN_EK_SEISM_DATA 
            SET {', '.join(update_fields)}
            WHERE EK_ID = :ek_id
            """
        )
        result = db.execute(update_query, update_params)
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail=f"No rows updated for EK_ID {params.ek_id}")
        db.commit()
        updated_fields = {}
        if params.m1 is not None:
            updated_fields[m1_column] = params.m1
        if params.m2 is not None:
            updated_fields[m2_column] = params.m2
        return SaveAnalysisResultResponse(
            success=True,
            message=f"Successfully updated analysis results for EK_ID {params.ek_id} ({params.spectrum_type})",
            updated_fields=updated_fields,
        )
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error saving analysis result: {str(e)}")


@router.post("/save-stress-inputs", response_model=SaveStressInputsResponse)
async def save_stress_inputs(
    db: DbSessionDep,
    params: SaveStressInputsParams = Body(...),
):
    try:
        update_fields = []
        update_params = {"ek_id": params.ek_id}
        field_mapping = {
            "natural_frequency": "FIRST_NAT_FREQ",
            "sigma_dop": "SIGMA_DOP",
            "hclpf": "HCLPF",
            "sigma_1": "SIGMA_1",
            "sigma_2": "SIGMA_2",
            "sigma_1_1_pz": "SIGMA_S_1_PZ",
            "sigma_1_2_pz": "SIGMA_S_2_PZ",
            "sigma_1_s1_pz": "SIGMA_S_S1_PZ",
            "sigma_2_s2_pz": "SIGMA_S_S2_PZ",
            "sigma_1_1_mrz": "SIGMA_S_1_MRZ",
            "sigma_1_2_mrz": "SIGMA_S_2_MRZ",
            "sigma_1_s1_mrz": "SIGMA_S_S1_MRZ",
            "sigma_2_s2_mrz": "SIGMA_S_S2_MRZ",
        }
        for param_name, db_column in field_mapping.items():
            param_value = getattr(params, param_name)
            update_fields.append(f"{db_column} = :{param_name}")
            update_params[param_name] = param_value
        update_fields.extend([
            "SIGMA_S_ALT_1_PZ = NULL",
            "SIGMA_S_ALT_2_PZ = NULL",
            "SIGMA_S_ALT_1_MRZ = NULL",
            "SIGMA_S_ALT_2_MRZ = NULL",
        ])
        if not update_fields:
            raise HTTPException(status_code=400, detail="At least one stress input value must be provided")
        check_query = text("SELECT COUNT(*) FROM SRTN_EK_SEISM_DATA WHERE EK_ID = :ek_id")
        check_result = db.execute(check_query, {"ek_id": params.ek_id})
        if check_result.scalar() == 0:
            raise HTTPException(status_code=404, detail=f"Element with EK_ID {params.ek_id} not found")
        update_query = text(
            f"""
            UPDATE SRTN_EK_SEISM_DATA 
            SET {', '.join(update_fields)}
            WHERE EK_ID = :ek_id
            """
        )
        result = db.execute(update_query, update_params)
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail=f"No rows updated for EK_ID {params.ek_id}")
        db.commit()
        updated_fields = {}
        for param_name, db_column in field_mapping.items():
            param_value = getattr(params, param_name)
            if param_value is not None:
                updated_fields[db_column] = param_value
        return SaveStressInputsResponse(
            success=True,
            message=f"Successfully updated stress inputs for EK_ID {params.ek_id}",
            updated_fields=updated_fields,
        )
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error saving stress inputs: {str(e)}")


@router.get("/get-stress-inputs")
async def get_stress_inputs(db: DbSessionDep, ek_id: int):
    try:
        check_query = text("SELECT COUNT(*) FROM SRTN_EK_SEISM_DATA WHERE EK_ID = :ek_id")
        check_result = db.execute(check_query, {"ek_id": ek_id})
        if check_result.scalar() == 0:
            raise HTTPException(status_code=404, detail=f"Element with EK_ID {ek_id} not found")
        stress_query = text(
            """
            SELECT FIRST_NAT_FREQ, SIGMA_DOP, HCLPF, SIGMA_1, SIGMA_2, 
                   SIGMA_S_1_PZ, SIGMA_S_2_PZ, SIGMA_S_S1_PZ, SIGMA_S_S2_PZ,
                   SIGMA_S_1_MRZ, SIGMA_S_2_MRZ, SIGMA_S_S1_MRZ, SIGMA_S_S2_MRZ
            FROM SRTN_EK_SEISM_DATA 
            WHERE EK_ID = :ek_id
            """
        )
        result = db.execute(stress_query, {"ek_id": ek_id})
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"No data found for EK_ID {ek_id}")
        stress_values = {
            "FIRST_NAT_FREQ": row[0],
            "SIGMA_DOP": row[1],
            "HCLPF": row[2],
            "SIGMA_1": row[3],
            "SIGMA_2": row[4],
            "SIGMA_S_1_PZ": row[5],
            "SIGMA_S_2_PZ": row[6],
            "SIGMA_S_S1_PZ": row[7],
            "SIGMA_S_S2_PZ": row[8],
            "SIGMA_S_1_MRZ": row[9],
            "SIGMA_S_2_MRZ": row[10],
            "SIGMA_S_S1_MRZ": row[11],
            "SIGMA_S_S2_MRZ": row[12],
        }
        return {"success": True, "ek_id": ek_id, "stress_values": stress_values}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving stress inputs: {str(e)}")


@router.get("/get-analysis-results")
async def get_analysis_results(db: DbSessionDep, ek_id: int):
    try:
        check_query = text("SELECT COUNT(*) FROM SRTN_EK_SEISM_DATA WHERE EK_ID = :ek_id")
        check_result = db.execute(check_query, {"ek_id": ek_id})
        if check_result.scalar() == 0:
            raise HTTPException(status_code=404, detail=f"Element with EK_ID {ek_id} not found")
        results_query = text(
            """
            SELECT M1_PZ, M2_PZ, M1_MRZ, M2_MRZ
            FROM SRTN_EK_SEISM_DATA 
            WHERE EK_ID = :ek_id
            """
        )
        result = db.execute(results_query, {"ek_id": ek_id})
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"No data found for EK_ID {ek_id}")
        analysis_values = {}
        if row[0] is not None:
            analysis_values["M1_PZ"] = row[0]
        if row[1] is not None:
            analysis_values["M2_PZ"] = row[1]
        if row[2] is not None:
            analysis_values["M1_MRZ"] = row[2]
        if row[3] is not None:
            analysis_values["M2_MRZ"] = row[3]
        return {"success": True, "ek_id": ek_id, "analysis_values": analysis_values}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving analysis results: {str(e)}")


@router.get("/get-calculation-results")
async def get_calculation_results(db: DbSessionDep, ek_id: int):
    try:
        check_query = text("SELECT COUNT(*) FROM SRTN_EK_SEISM_DATA WHERE EK_ID = :ek_id")
        check_result = db.execute(check_query, {"ek_id": ek_id})
        if check_result.scalar() == 0:
            raise HTTPException(status_code=404, detail=f"Element with EK_ID {ek_id} not found")
        results_query = text(
            """
            SELECT SIGMA_S_ALT_1_PZ, SIGMA_S_ALT_2_PZ, SIGMA_S_ALT_1_MRZ, SIGMA_S_ALT_2_MRZ
            FROM SRTN_EK_SEISM_DATA 
            WHERE EK_ID = :ek_id
            """
        )
        result = db.execute(results_query, {"ek_id": ek_id})
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"No data found for EK_ID {ek_id}")
        calculated_values = {}
        if row[0] is not None:
            calculated_values["SIGMA_S_ALT_1_PZ"] = row[0]
        if row[1] is not None:
            calculated_values["SIGMA_S_ALT_2_PZ"] = row[1]
        if row[2] is not None:
            calculated_values["SIGMA_S_ALT_1_MRZ"] = row[2]
        if row[3] is not None:
            calculated_values["SIGMA_S_ALT_2_MRZ"] = row[3]
        return {"success": True, "ek_id": ek_id, "calculated_values": calculated_values}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving calculation results: {str(e)}")


@router.get("/check-calculation-requirements")
async def check_calculation_requirements(db: DbSessionDep, ek_id: int):
    try:
        data_query = text(
            """
            SELECT 
                -- PZ data
                SIGMA_S_1_PZ, SIGMA_S_2_PZ, SIGMA_S_S1_PZ, SIGMA_S_S2_PZ, M1_PZ,
                -- MRZ data  
                SIGMA_S_1_MRZ, SIGMA_S_2_MRZ, SIGMA_S_S1_MRZ, SIGMA_S_S2_MRZ, M1_MRZ
            FROM SRTN_EK_SEISM_DATA 
            WHERE EK_ID = :ek_id
            """
        )
        result = db.execute(data_query, {"ek_id": ek_id})
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"No data found for EK_ID {ek_id}")
        (
            sigma_s_1_pz,
            sigma_s_2_pz,
            sigma_s_s1_pz,
            sigma_s_s2_pz,
            m1_pz,
            sigma_s_1_mrz,
            sigma_s_2_mrz,
            sigma_s_s1_mrz,
            sigma_s_s2_mrz,
            m1_mrz,
        ) = row
        requirements = {
            "pz": {
                "sigma_alt_1": {"can_calculate": all(v is not None for v in [sigma_s_1_pz, sigma_s_s1_pz, m1_pz]), "missing_fields": []},
                "sigma_alt_2": {"can_calculate": all(v is not None for v in [sigma_s_2_pz, sigma_s_s2_pz, m1_pz]), "missing_fields": []},
            },
            "mrz": {
                "sigma_alt_1": {"can_calculate": all(v is not None for v in [sigma_s_1_mrz, sigma_s_s1_mrz, m1_mrz]), "missing_fields": []},
                "sigma_alt_2": {"can_calculate": all(v is not None for v in [sigma_s_2_mrz, sigma_s_s2_mrz, m1_mrz]), "missing_fields": []},
            },
        }
        if sigma_s_1_pz is None:
            requirements["pz"]["sigma_alt_1"]["missing_fields"].append("(σ₁)₁")
        if sigma_s_s1_pz is None:
            requirements["pz"]["sigma_alt_1"]["missing_fields"].append("(σ₁)s₁")
        if m1_pz is None:
            requirements["pz"]["sigma_alt_1"]["missing_fields"].append("M₁")
        if sigma_s_2_pz is None:
            requirements["pz"]["sigma_alt_2"]["missing_fields"].append("(σ₂)₂")
        if sigma_s_s2_pz is None:
            requirements["pz"]["sigma_alt_2"]["missing_fields"].append("(σ₂)s₂")
        if m1_pz is None:
            requirements["pz"]["sigma_alt_2"]["missing_fields"].append("M₁")
        if sigma_s_1_mrz is None:
            requirements["mrz"]["sigma_alt_1"]["missing_fields"].append("(σ₁)₁")
        if sigma_s_s1_mrz is None:
            requirements["mrz"]["sigma_alt_1"]["missing_fields"].append("(σ₁)s₁")
        if m1_mrz is None:
            requirements["mrz"]["sigma_alt_1"]["missing_fields"].append("M₁")
        if sigma_s_2_mrz is None:
            requirements["mrz"]["sigma_alt_2"]["missing_fields"].append("(σ₂)₂")
        if sigma_s_s2_mrz is None:
            requirements["mrz"]["sigma_alt_2"]["missing_fields"].append("(σ₂)s₂")
        if m1_mrz is None:
            requirements["mrz"]["sigma_alt_2"]["missing_fields"].append("M₁")
        return {"success": True, "ek_id": ek_id, "requirements": requirements}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking requirements: {str(e)}")


@router.post("/calculate-sigma-alt")
async def calculate_sigma_alt(db: DbSessionDep, ek_id: int = Body(..., embed=True)):
    try:
        check_query = text("SELECT COUNT(*) FROM SRTN_EK_SEISM_DATA WHERE EK_ID = :ek_id")
        check_result = db.execute(check_query, {"ek_id": ek_id})
        if check_result.scalar() == 0:
            raise HTTPException(status_code=404, detail=f"Element with EK_ID {ek_id} not found")
        data_query = text(
            """
            SELECT 
                -- PZ data
                SIGMA_S_1_PZ, SIGMA_S_2_PZ, SIGMA_S_S1_PZ, SIGMA_S_S2_PZ,
                M1_PZ,
                -- MRZ data  
                SIGMA_S_1_MRZ, SIGMA_S_2_MRZ, SIGMA_S_S1_MRZ, SIGMA_S_S2_MRZ,
                M1_MRZ,
                -- Also get alt values to see if they exist
                SIGMA_S_ALT_1_PZ, SIGMA_S_ALT_2_PZ, SIGMA_S_ALT_1_MRZ, SIGMA_S_ALT_2_MRZ
            FROM SRTN_EK_SEISM_DATA 
            WHERE EK_ID = :ek_id
            """
        )
        result = db.execute(data_query, {"ek_id": ek_id})
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"No data found for EK_ID {ek_id}")
        (
            sigma_s_1_pz,
            sigma_s_2_pz,
            sigma_s_s1_pz,
            sigma_s_s2_pz,
            m1_pz,
            sigma_s_1_mrz,
            sigma_s_2_mrz,
            sigma_s_s1_mrz,
            sigma_s_s2_mrz,
            m1_mrz,
            existing_alt_1_pz,
            existing_alt_2_pz,
            existing_alt_1_mrz,
            existing_alt_2_mrz,
        ) = row
        update_fields = []
        update_params = {"ek_id": ek_id}
        calculated_values = {}
        if all(v is not None for v in [sigma_s_1_pz, sigma_s_s1_pz, m1_pz]):
            sigma_alt_1_pz = sigma_s_1_pz + sigma_s_s1_pz * (m1_pz - 1)
            update_fields.append("SIGMA_S_ALT_1_PZ = :sigma_alt_1_pz")
            update_params["sigma_alt_1_pz"] = sigma_alt_1_pz
            calculated_values["SIGMA_S_ALT_1_PZ"] = sigma_alt_1_pz
        if all(v is not None for v in [sigma_s_2_pz, sigma_s_s2_pz, m1_pz]):
            sigma_alt_2_pz = sigma_s_2_pz + sigma_s_s2_pz * (m1_pz - 1)
            update_fields.append("SIGMA_S_ALT_2_PZ = :sigma_alt_2_pz")
            update_params["sigma_alt_2_pz"] = sigma_alt_2_pz
            calculated_values["SIGMA_S_ALT_2_PZ"] = sigma_alt_2_pz
        if all(v is not None for v in [sigma_s_1_mrz, sigma_s_s1_mrz, m1_mrz]):
            sigma_alt_1_mrz = sigma_s_1_mrz + sigma_s_s1_mrz * (m1_mrz - 1)
            update_fields.append("SIGMA_S_ALT_1_MRZ = :sigma_alt_1_mrz")
            update_params["sigma_alt_1_mrz"] = sigma_alt_1_mrz
            calculated_values["SIGMA_S_ALT_1_MRZ"] = sigma_alt_1_mrz
        if all(v is not None for v in [sigma_s_2_mrz, sigma_s_s2_mrz, m1_mrz]):
            sigma_alt_2_mrz = sigma_s_2_mrz + sigma_s_s2_mrz * (m1_mrz - 1)
            update_fields.append("SIGMA_S_ALT_2_MRZ = :sigma_alt_2_mrz")
            update_params["sigma_alt_2_mrz"] = sigma_alt_2_mrz
            calculated_values["SIGMA_S_ALT_2_MRZ"] = sigma_alt_2_mrz
        if not update_fields:
            return {"success": True, "message": "No calculations performed - insufficient data for both PZ and MRZ", "calculated_values": {}}
        update_query = text(
            f"""
            UPDATE SRTN_EK_SEISM_DATA 
            SET {', '.join(update_fields)}
            WHERE EK_ID = :ek_id
            """
        )
        result = db.execute(update_query, update_params)
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail=f"No rows updated for EK_ID {ek_id}")
        db.commit()
        return {"success": True, "message": f"Successfully calculated sigma alt values for EK_ID {ek_id}", "calculated_values": calculated_values}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error calculating sigma alt: {str(e)}")


@router.post("/save-k-results", response_model=SaveKResultsResponse)
async def save_k_results(db: DbSessionDep, params: SaveKResultsParams = Body(...)):
    try:
        update_fields = []
        update_params = {"ek_id": params.ek_id}
        field_mapping = {
            "k1_pz": "K1_PZ",
            "k1_mrz": "K1_MRZ",
            "k3_pz": "K3_PZ",
            "k3_mrz": "K3_MRZ",
            "k2_value": "K2_",
            "n_pz": "N_PZ",
            "n_mrz": "N_MRZ",
        }
        for param_name, db_column in field_mapping.items():
            param_value = getattr(params, param_name)
            update_fields.append(f"{db_column} = :{param_name}")
            update_params[param_name] = param_value
        if not update_fields:
            raise HTTPException(status_code=400, detail="At least one K coefficient value must be provided")
        check_query = text("SELECT COUNT(*) FROM SRTN_EK_SEISM_DATA WHERE EK_ID = :ek_id")
        check_result = db.execute(check_query, {"ek_id": params.ek_id})
        if check_result.scalar() == 0:
            raise HTTPException(status_code=404, detail=f"Element with EK_ID {params.ek_id} not found")
        update_query = text(
            f"""
            UPDATE SRTN_EK_SEISM_DATA 
            SET {', '.join(update_fields)}
            WHERE EK_ID = :ek_id
            """
        )
        result = db.execute(update_query, update_params)
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail=f"No rows updated for EK_ID {params.ek_id}")
        db.commit()
        updated_fields = {}
        for param_name, db_column in field_mapping.items():
            param_value = getattr(params, param_name)
            if param_value is not None:
                updated_fields[db_column] = param_value
        return SaveKResultsResponse(
            success=True,
            message=f"Successfully updated K coefficient results for EK_ID {params.ek_id}",
            updated_fields=updated_fields,
        )
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error saving K results: {str(e)}")


@router.get("/get-k-results/{ek_id}")
async def get_k_results(db: DbSessionDep, ek_id: int):
    try:
        check_query = text("SELECT COUNT(*) FROM SRTN_EK_SEISM_DATA WHERE EK_ID = :ek_id")
        check_result = db.execute(check_query, {"ek_id": ek_id})
        if check_result.scalar() == 0:
            raise HTTPException(status_code=404, detail=f"Element with EK_ID {ek_id} not found")
        k_query = text(
            """
            SELECT K1_PZ, K1_MRZ, K3_PZ, K3_MRZ, K2_, N_PZ, N_MRZ
            FROM SRTN_EK_SEISM_DATA 
            WHERE EK_ID = :ek_id
            """
        )
        result = db.execute(k_query, {"ek_id": ek_id})
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"No data found for EK_ID {ek_id}")
        has_k_data = any(value is not None for value in row)
        k_values = {
            "k1_pz": row[0],
            "k2_value": row[4],
            "k3_pz": row[2],
            "k_min_pz": row[0],
            "seismic_category_pz": None,
            "k1_mrz": row[1],
            "k3_mrz": row[3],
            "k_min_mrz": row[1],
            "n_pz": row[5],
            "n_mrz": row[6],
            "calculated": has_k_data,
        }
        return {"success": True, "ek_id": ek_id, **k_values}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving K results: {str(e)}")


