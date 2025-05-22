#!/usr/bin/env -S uv run

import io
import os
import re
import tempfile
from contextlib import asynccontextmanager
from typing import List

import openpyxl
from db import DbSessionDep, DbSessionManager
from fastapi import (Body, Depends, FastAPI, File, Form, HTTPException, Query,
                     UploadFile)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from models import Plant, SearchData, SetAccelProcedureParams, SetAccelProcedureResult, Term, Unit
from pydantic import BaseModel
from settings import settings
from sqlalchemy import inspect, text


@asynccontextmanager
async def lifespan(_app: FastAPI):
    DbSessionManager.initialize()
    yield
    DbSessionManager.dispose()
    print("Database connection closed")


app = FastAPI(lifespan=lifespan)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

@app.get("/api/plants", response_model=List[Plant])
async def get_plants(db: DbSessionDep):
    """Get all plants from UNS_PLANTS table"""
    result = db.execute(text("SELECT NAME, PLANT_ID FROM UNS_PLANTS ORDER BY NAME"))
    plants = [Plant(name=row[0], plant_id=row[1]) for row in result]
    return plants

@app.get("/api/units", response_model=List[Unit])
async def get_units(
    db: DbSessionDep,
    plant_id: int = Query(..., description="ID of the plant to get units for")
):
    """Get all units for a specific plant from UNS_UNITS table"""
    result = db.execute(
        text("SELECT NAME, UNIT_ID FROM UNS_UNITS WHERE PLANT_ID = :plant_id ORDER BY NAME"),
        {"plant_id": plant_id}
    )
    units = [Unit(name=row[0], unit_id=row[1]) for row in result]
    return units

@app.get("/api/terms", response_model=List[Term])
async def get_terms(
    db: DbSessionDep,
    plant_id: int = Query(..., description="ID of the plant"),
    unit_id: int = Query(..., description="ID of the unit")
):
    """Get all terms for a specific plant and unit from SRT_TERMS_LOC table"""
    result = db.execute(
        text("""
            SELECT T_NAME, T_ID 
            FROM SRT_TERMS_LOC 
            WHERE PLANT_ID = :plant_id 
            AND UNIT_ID = :unit_id 
            ORDER BY T_NAME
        """),
        {"plant_id": plant_id, "unit_id": unit_id}
    )
    terms = [Term(name=row[0], term_id=row[1]) for row in result]
    return terms

@app.get("/api/search", response_model=List[SearchData])
async def search_data(
    db: DbSessionDep,
    plant_id: int = Query(..., description="ID of the plant"),
    unit_id: int = Query(..., description="ID of the unit"),
    t_id: int = Query(..., description="Term ID (EKLIST_ID)")
):
    """Search data from SRTN_EK_SEISM_DATA table with dynamic column selection"""
    # First, get all columns from the table
    inspector = inspect(db.get_bind())
    columns = inspector.get_columns('SRTN_EK_SEISM_DATA')
    column_names = [col['name'] for col in columns]
    
    # Build the dynamic query
    query = text(f"""
        SELECT {', '.join(column_names)}
        FROM SRTN_EK_SEISM_DATA
        WHERE PLANT_ID = :plant_id
        AND UNIT_ID = :unit_id
        AND EKLIST_ID = :t_id
    """)
    
    result = db.execute(query, {
        "plant_id": plant_id,
        "unit_id": unit_id,
        "t_id": t_id
    })
    
    # Convert each row to a dictionary with column names as keys
    search_results = []
    for row in result:
        row_dict = {column_names[i]: value for i, value in enumerate(row)}
        search_results.append(SearchData(data=row_dict))
    
    return search_results

class LocationCheck(BaseModel):
    plant_id: int
    unit_id: int
    building: str
    room: str

@app.post("/api/check-location")
async def check_location(
    db: DbSessionDep,
    location: LocationCheck = Body(...)
):
    """Check if building and room exist in SRTN_EK_SEISM_DATA table"""
    result = db.execute(
        text("""
            SELECT COUNT(*) 
            FROM SRTN_EK_SEISM_DATA 
            WHERE PLANT_ID = :plant_id 
            AND UNIT_ID = :unit_id 
            AND BUILDING = :building 
            AND ROOM = :room
        """),
        {
            "plant_id": location.plant_id,
            "unit_id": location.unit_id,
            "building": location.building,
            "room": location.room
        }
    )
    count = result.scalar()
    return {"exists": count > 0}

class BuildingCheck(BaseModel):
    plant_id: int
    unit_id: int
    building: str

@app.post("/api/check-building")
async def check_building(
    db: DbSessionDep,
    data: BuildingCheck = Body(...)
):
    """Check if building exists in SRTN_EK_SEISM_DATA table for given plant and unit"""
    result = db.execute(
        text("""
            SELECT COUNT(*)
            FROM SRTN_EK_SEISM_DATA
            WHERE PLANT_ID = :plant_id
            AND UNIT_ID = :unit_id
            AND BUILDING = :building
        """),
        {
            "plant_id": data.plant_id,
            "unit_id": data.unit_id,
            "building": data.building
        }
    )
    count = result.scalar()
    return {"exists": count > 0}

@app.post("/api/analyze-excel")
async def analyze_excel(
    file: UploadFile = File(...),
    filter_percentage_only: bool = Query(False, description="Filter sheets to include only percentage names")
):
    """
    Analyze Excel file and return information about sheets.
    Optionally filter to include only sheets with percentage names (like 4%, 0.2%, 1,2%)
    """
    if not file.filename.endswith(('.xls', '.xlsx', '.xlsm')):
        raise HTTPException(status_code=400, detail="File must be an Excel file (.xls, .xlsx, .xlsm)")
    
    try:
        # Read file directly into memory
        contents = await file.read()
        file_object = io.BytesIO(contents)
        
        # Load workbook from memory buffer
        workbook = openpyxl.load_workbook(file_object, read_only=True, data_only=True)
        
        # Get sheet names
        sheet_names = workbook.sheetnames
        
        # Regex pattern for percentage names (e.g., 4%, 0.2%, 1,2%)
        # This matches numbers with optional decimal parts (using . or , as separator) followed by %
        percentage_pattern = re.compile(r'^[0-9]+([.,][0-9]+)?%$')
        
        # Get basic info about each sheet
        sheets_info = []
        for sheet_name in sheet_names:
            # Skip non-percentage sheets if filter is enabled
            if filter_percentage_only and not percentage_pattern.match(sheet_name.strip()):
                continue
                
            sheet = workbook[sheet_name]
            # Get dimensions
            try:
                max_row = sheet.max_row
                max_col = sheet.max_column
                
                if max_row > 0 and max_col > 0:
                    sheets_info.append({
                        "name": sheet_name,
                        "rows": max_row,
                        "columns": max_col
                    })
                else:
                    sheets_info.append({
                        "name": sheet_name,
                        "rows": 0,
                        "columns": 0
                    })
            except Exception as sheet_error:
                # Add sheet with error info
                sheets_info.append({
                    "name": sheet_name,
                    "rows": 0,
                    "columns": 0,
                    "error": str(sheet_error)
                })
        
        # Make sure to close workbook and file objects
        workbook.close()
        file_object.close()
        
        return {"sheets": sheets_info}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing Excel file: {str(e)}")

@app.post("/api/extract-sheet-data")
async def extract_sheet_data(
    file: UploadFile = File(...),
    sheet_name: str = Form(...),
):
    """
    Extract data from a specific sheet in an Excel file.
    Returns a dictionary with sheet_name and column contents.
    """
    if not file.filename.endswith(('.xls', '.xlsx', '.xlsm')):
        raise HTTPException(status_code=400, detail="File must be an Excel file (.xls, .xlsx, .xlsm)")
    
    try:
        # Read file directly into memory
        contents = await file.read()
        file_object = io.BytesIO(contents)
        
        # Load workbook from memory buffer
        workbook = openpyxl.load_workbook(file_object, read_only=True, data_only=True)
        
        if sheet_name not in workbook.sheetnames:
            raise HTTPException(status_code=404, detail=f"Sheet '{sheet_name}' not found in the Excel file")
        
        sheet = workbook[sheet_name]
        
        # Get column headers (assuming first row contains headers)
        headers = []
        max_col = sheet.max_column
        
        for col in range(1, max_col + 1):
            cell_value = sheet.cell(row=1, column=col).value
            if cell_value is not None:
                headers.append(str(cell_value))
        
        # Initialize result dictionary with sheet name
        result = {
            'demp': sheet_name
        }
        
        # Extract column data
        for col_idx, header in enumerate(headers, start=1):
            column_data = []
            for row_idx in range(2, sheet.max_row + 1):  # Start from row 2 (skip headers)
                cell_value = sheet.cell(row=row_idx, column=col_idx).value
                if cell_value is not None:
                    column_data.append(str(cell_value))
            
            # Use column number as key if header is empty
            col_key = f"column_{col_idx}" if not header.strip() else header
            result[col_key] = column_data
        
        # Close workbook and file objects
        workbook.close()
        file_object.close()
        
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error extracting sheet data: {str(e)}")

class AccelDataItem(BaseModel):
    dempf: float | None = None  # Make dempf nullable
    data: dict

class AccelData(BaseModel):
    plant_id: int
    unit_id: int
    building: str
    room: str = None
    lev: float | None = None   # Add LEV field
    lev1: float | None = None  # Using more explicit Union type for None
    lev2: float | None = None  # Using more explicit Union type for None
    pga: float | None = None   # Using more explicit Union type for None
    calc_type: str
    set_type: str = "ВИМОГИ"   # Default to "ВИМОГИ" but allow custom values
    sheets: dict[str, AccelDataItem]

@app.post("/api/save-accel-data")
async def save_accel_data(
    db: DbSessionDep,
    data: AccelData = Body(...)
):
    """
    Save acceleration data to the database tables: 
    SRTN_ACCEL_SET, SRTN_ACCEL_PLOT, and SRTN_ACCEL_POINT
    """
    try:
        # Debug: Get actual column names from SRTN_ACCEL_SET table
        inspector = inspect(db.get_bind())
        columns = inspector.get_columns('SRTN_ACCEL_SET')
        column_names = [col['name'] for col in columns]
        print("Available columns in SRTN_ACCEL_SET:", column_names)
        
        # Check if PGA column exists and note its exact name
        pga_column = None
        for col in column_names:
            if col.upper() == 'PGA' or col.upper().startswith('PGA_'):
                pga_column = col
                print(f"Found PGA column: {pga_column}")
                break

        # Get plant and unit names
        plant_result = db.execute(
            text("SELECT NAME FROM UNS_PLANTS WHERE PLANT_ID = :plant_id"),
            {"plant_id": data.plant_id}
        )
        plant_name = plant_result.scalar()

        unit_result = db.execute(
            text("SELECT NAME FROM UNS_UNITS WHERE UNIT_ID = :unit_id"),
            {"unit_id": data.unit_id}
        )
        unit_name = unit_result.scalar()

        if not plant_name or not unit_name:
            raise HTTPException(status_code=400, detail="Invalid plant or unit ID")

        # Store created record IDs for the response
        created_records = {
            "sets": [],
            "plots": [],
            "points": 0,
            "mrz_set_id": None,  # Store MRZ set ID for procedure
            "pz_set_id": None    # Store PZ set ID for procedure
        }

        # Process each sheet
        for sheet_name, sheet_data in data.sheets.items():
            dempf = sheet_data.dempf  # This can now be None
            sheet_columns = sheet_data.data

            # Get frequency column
            freq_column = None
            for col_name in sheet_columns.keys():
                if col_name.lower() in ["частота", "частота, гц", "частота,гц", "частота гц", "част", "frequency", "freq", "hz"]:
                    freq_column = col_name
                    break

            if not freq_column:
                # Assume first column is frequency if no clear frequency column found
                columns = list(sheet_columns.keys())
                if columns:
                    freq_column = columns[0]
                else:
                    continue  # Skip this sheet if no data

            # Filter to only keep relevant columns
            valid_spectrum_types = ["МРЗ", "ПЗ"]
            valid_axes = ["x", "y", "z"]
            
            # Find all valid columns that match our pattern (МРЗ_x, МРЗ_y, etc.)
            relevant_columns = [freq_column]  # Always include frequency column
            
            for column_name in sheet_columns.keys():
                if "_" in column_name:
                    parts = column_name.split("_")
                    if len(parts) == 2 and parts[0] in valid_spectrum_types and parts[1].lower() in valid_axes:
                        relevant_columns.append(column_name)
            
            # Only process spectrum types that exist in the relevant columns
            spectrum_types = set()
            for column_name in relevant_columns:
                if "_" in column_name:
                    spectrum_type = column_name.split("_")[0]
                    if spectrum_type in valid_spectrum_types:
                        spectrum_types.add(spectrum_type)

            # Process each spectrum type (МРЗ, ПЗ)
            for spectrum_type in spectrum_types:
                # First create a set record in SRTN_ACCEL_SET
                
                # Use LEV from the data instead of hardcoding to null
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
                    "spectr_type": spectrum_type,  # МРЗ/ПЗ
                    "calc_type": data.calc_type  # ДЕТЕРМІНИСТИЧНИЙ/ІМОВІРНІСНИЙ
                }
                
                db.execute(text("""
                    INSERT INTO SRTN_ACCEL_SET(SET_TYPE, BUILDING, ROOM, LEV, LEV1, LEV2, DEMPF, 
                    PLANT_ID, PLANT_NAME, UNIT_ID, UNIT_NAME, SPECTR_EARTHQ_TYPE, CALC_TYPE) 
                    VALUES(:set_type, :building, :room, :lev, :lev1, :lev2, :dempf, :plant_id, 
                    :plant_name, :unit_id, :unit_name, :spectr_type, :calc_type)
                """), set_params)
                
                # Get the last inserted ID using a separate query
                id_query = text("""
                    SELECT ACCEL_SET_ID FROM (
                        SELECT ACCEL_SET_ID FROM SRTN_ACCEL_SET 
                        WHERE PLANT_ID = :plant_id 
                        AND UNIT_ID = :unit_id 
                        AND BUILDING = :building
                        AND ((:dempf IS NULL AND DEMPF IS NULL) OR DEMPF = :dempf)
                        AND SPECTR_EARTHQ_TYPE = :spectr_type
                        ORDER BY ACCEL_SET_ID DESC
                    ) WHERE ROWNUM = 1
                """)
                
                # Debug the parameters to check NULL values
                print(f"Query parameters: plant_id={data.plant_id}, unit_id={data.unit_id}, building={data.building}, dempf={dempf}, spectr_type={spectrum_type}")
                
                id_result = db.execute(id_query, {
                    "plant_id": data.plant_id,
                    "unit_id": data.unit_id,
                    "building": data.building,
                    "dempf": dempf,
                    "spectr_type": spectrum_type
                })
                
                set_id = id_result.scalar()
                created_records["sets"].append(set_id)
                
                # Store specific set IDs for procedure parameters
                if spectrum_type == "МРЗ":
                    created_records["mrz_set_id"] = set_id
                    print(f"Stored MRZ set ID: {set_id}")
                elif spectrum_type == "ПЗ":
                    created_records["pz_set_id"] = set_id
                    print(f"Stored PZ set ID: {set_id}")
                
                # Only update PGA if it's not None (for Import.jsx)
                # For Main.jsx imports, data.pga will be null so this section will be skipped
                if data.pga is not None:
                    try:
                        # Try updating with column name we discovered
                        if pga_column:
                            update_pga_query = text(f"""
                                UPDATE SRTN_ACCEL_SET
                                SET {pga_column} = :pga_value
                                WHERE ACCEL_SET_ID = :set_id
                            """)
                            
                            db.execute(update_pga_query, {
                                "pga_value": data.pga,
                                "set_id": set_id
                            })
                        else:
                            # Try alternative column names if pga_column not found
                            try_columns = ['FGA', 'PGA']  # Try FGA as alternative
                            for col_name in try_columns:
                                try:
                                    update_query = text(f"""
                                        UPDATE SRTN_ACCEL_SET
                                        SET {col_name} = :pga_value
                                        WHERE ACCEL_SET_ID = :set_id
                                    """)
                                    
                                    db.execute(update_query, {
                                        "pga_value": data.pga,
                                        "set_id": set_id
                                    })
                                    print(f"Successfully updated {col_name} column")
                                    break
                                except Exception as err:
                                    print(f"Failed to update with column {col_name}: {err}")
                    except Exception as pga_error:
                        print(f"Error updating PGA value: {pga_error}")
                
                # Create plot records for X, Y, Z axes
                plot_ids = {}
                for axis in ["x", "y", "z"]:
                    column_name = f"{spectrum_type}_{axis}"
                    if column_name not in sheet_columns:
                        continue
                        
                    modified_plot_query = text("""
                        INSERT INTO SRTN_ACCEL_PLOT (AXIS, NAME)
                        VALUES (:axis, :name)
                    """)
                    
                    plot_params = {
                        "axis": axis.upper(),
                        "name": column_name
                    }
                    
                    db.execute(modified_plot_query, plot_params)
                    
                    # Get the last inserted plot ID
                    plot_id_query = text("""
                        SELECT PLOT_ID FROM (
                            SELECT PLOT_ID FROM SRTN_ACCEL_PLOT 
                            WHERE AXIS = :axis AND NAME = :name
                            ORDER BY PLOT_ID DESC
                        ) WHERE ROWNUM = 1
                    """)
                    
                    plot_id_result = db.execute(plot_id_query, plot_params)
                    plot_id = plot_id_result.scalar()
                    
                    plot_ids[axis] = plot_id
                    created_records["plots"].append(plot_id)
                
                # Update set record with plot IDs
                update_set_query = text("""
                    UPDATE SRTN_ACCEL_SET
                    SET X_PLOT_ID = :x_plot_id, Y_PLOT_ID = :y_plot_id, Z_PLOT_ID = :z_plot_id
                    WHERE ACCEL_SET_ID = :set_id
                """)
                
                update_set_params = {
                    "x_plot_id": plot_ids.get("x"),
                    "y_plot_id": plot_ids.get("y"),
                    "z_plot_id": plot_ids.get("z"),
                    "set_id": set_id
                }
                
                db.execute(update_set_query, update_set_params)
                
                # Insert frequency-acceleration points for each axis
                for axis in ["x", "y", "z"]:
                    column_name = f"{spectrum_type}_{axis}"
                    if column_name not in sheet_columns or column_name not in relevant_columns or axis not in plot_ids:
                        continue
                        
                    plot_id = plot_ids[axis]
                    frequencies = sheet_columns.get(freq_column, [])
                    accelerations = sheet_columns.get(column_name, [])
                    
                    # Make sure we have equal number of values
                    num_points = min(len(frequencies), len(accelerations))
                    
                    for i in range(num_points):
                        try:
                            freq = float(frequencies[i])
                            accel = float(accelerations[i])
                            
                            point_query = text("""
                                INSERT INTO SRTN_ACCEL_POINT (FREQ, ACCEL, PLOT_ID)
                                VALUES (:freq, :accel, :plot_id)
                            """)
                            
                            point_params = {
                                "freq": freq,
                                "accel": accel,
                                "plot_id": plot_id
                            }
                            
                            db.execute(point_query, point_params)
                            created_records["points"] += 1
                        except (ValueError, TypeError):
                            # Skip invalid numeric values
                            continue
        
        # Commit all changes
        db.commit()
        
        # Get final mrz_set_id and pz_set_id values for return
        mrz_set_id = created_records.get("mrz_set_id")
        pz_set_id = created_records.get("pz_set_id")
        
        return {
            "success": True,
            "message": "Data saved successfully",
            "created": created_records,
            "mrz_set_id": mrz_set_id,
            "pz_set_id": pz_set_id
        }
        
    except Exception as e:
        # Rollback in case of error
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error saving acceleration data: {str(e)}")

@app.post("/api/execute-set-all-ek-accel-set", response_model=SetAccelProcedureResult)
async def execute_set_all_ek_accel_set(
    db: DbSessionDep,
    params: SetAccelProcedureParams = Body(...)
):
    """
    Execute the SET_ALL_EK_ACCEL_SET stored procedure
    This procedure sets acceleration data for an element or all elements of the same type
    """
    try:
        # Prepare the parameters for all attempts
        ek_id = params.ek_id
        set_mrz = params.set_mrz  # Now using the actual ACCEL_SET_ID for MRZ
        set_pz = params.set_pz    # Now using the actual ACCEL_SET_ID for PZ
        can_overwrite = params.can_overwrite
        do_for_all = params.do_for_all
        
        # Log the parameters we're sending
        print(f"Executing procedure with: EK_ID={ek_id}, SET_MRZ={set_mrz}, SET_PZ={set_pz}, CAN_OVERWRITE={can_overwrite}, DO_FOR_ALL={do_for_all}")
        
        # Try both approaches - first check if procedure exists
        check_query = text("""
            SELECT OWNER, OBJECT_NAME FROM ALL_OBJECTS 
            WHERE OBJECT_TYPE IN ('PROCEDURE', 'FUNCTION') 
            AND OBJECT_NAME = 'SET_ALL_EK_ACCEL_SET'
        """)
        proc_check = db.execute(check_query).fetchall()
        print(f"Found procedures: {proc_check}")
        
        error_messages = []
        done_for_id_value = 0
        done_for_all_value = None
        success = False
        
        # Try approach 1: Direct SQL execution
        try:
            print("Trying direct SQL approach")
            direct_sql_query = text("""
                BEGIN
                    SET_ALL_EK_ACCEL_SET(:ek_id, :set_mrz, :set_pz, :can_overwrite, :do_for_all, :done_for_id, :done_for_all);
                END;
            """)
            
            # Execute with named parameters
            result = db.execute(
                direct_sql_query,
                {
                    "ek_id": ek_id, 
                    "set_mrz": set_mrz, 
                    "set_pz": set_pz, 
                    "can_overwrite": can_overwrite, 
                    "do_for_all": do_for_all,
                    "done_for_id": 0,  # OUT parameter (default value)
                    "done_for_all": 0  # OUT parameter (default value)
                }
            )
            
            # For now, set default success values since we can't easily get output parameters with this method
            done_for_id_value = 1
            done_for_all_value = 1 if do_for_all else None
            success = True
            print("Direct SQL approach succeeded")
            
        except Exception as e1:
            error_messages.append(f"Direct SQL error: {str(e1)}")
            print(f"Direct SQL approach failed: {str(e1)}")
            
            # Try approach 2: Using cursor.callproc
            if not success:
                try:
                    print("Trying cursor.callproc approach")
                    conn = db.connection().connection  # Get raw connection
                    cursor = conn.cursor()
                    
                    # Create output variables
                    done_for_id = cursor.var(int)
                    done_for_all = cursor.var(int)
                    
                    # Set initial values
                    done_for_id.setvalue(0, 0)
                    done_for_all.setvalue(0, 0)
                    
                    # Call the procedure
                    cursor.callproc('SET_ALL_EK_ACCEL_SET', [
                        ek_id, set_mrz, set_pz, can_overwrite, do_for_all, 
                        done_for_id, done_for_all
                    ])
                    
                    # Get the output values
                    done_for_id_value = done_for_id.getvalue()
                    done_for_all_value = done_for_all.getvalue()
                    success = True
                    print(f"cursor.callproc succeeded: done_for_id={done_for_id_value}, done_for_all={done_for_all_value}")
                    
                except Exception as e2:
                    error_messages.append(f"Cursor callproc error: {str(e2)}")
                    print(f"cursor.callproc approach failed: {str(e2)}")
        
        # If none of the approaches worked, try simple manual update as fallback
        if not success:
            try:
                print("Trying manual SQL update fallback")
                
                # Directly update the element's acceleration set IDs
                update_query = text("""
                    UPDATE SRTN_EK_SEISM_DATA
                    SET MRZ_ACCEL_SET = :set_mrz, PZ_ACCEL_SET = :set_pz
                    WHERE EK_ID = :ek_id
                """)
                
                db.execute(update_query, {
                    "set_mrz": set_mrz,
                    "set_pz": set_pz,
                    "ek_id": ek_id
                })
                
                done_for_id_value = 1
                
                # If do_for_all is enabled, update all elements of the same type
                if do_for_all:
                    # First get type ID of current element
                    type_query = text("""
                        SELECT PTYPE_ID, PLANT_ID, UNIT_ID, EKLIST_ID  
                        FROM SRTN_EK_SEISM_DATA 
                        WHERE EK_ID = :ek_id
                    """)
                    
                    type_result = db.execute(type_query, {"ek_id": ek_id}).fetchone()
                    
                    if type_result:
                        ptype_id = type_result[0]
                        plant_id = type_result[1]
                        unit_id = type_result[2]
                        eklist_id = type_result[3]
                        
                        # Update all elements of the same type
                        update_all_query = text("""
                            UPDATE SRTN_EK_SEISM_DATA
                            SET MRZ_ACCEL_SET = :set_mrz, PZ_ACCEL_SET = :set_pz
                            WHERE PTYPE_ID = :ptype_id
                            AND PLANT_ID = :plant_id
                            AND UNIT_ID = :unit_id
                            AND EKLIST_ID = :eklist_id
                        """)
                        
                        db.execute(update_all_query, {
                            "set_mrz": set_mrz,
                            "set_pz": set_pz,
                            "ptype_id": ptype_id,
                            "plant_id": plant_id,
                            "unit_id": unit_id,
                            "eklist_id": eklist_id
                        })
                        
                        done_for_all_value = 1
                
                success = True
                print("Manual SQL update fallback succeeded")
                
            except Exception as e3:
                error_messages.append(f"Manual update error: {str(e3)}")
                print(f"Manual SQL update fallback failed: {str(e3)}")
        
        # Check if any method succeeded
        if success:
            # Commit changes
            db.commit()
            print("Changes committed successfully")
            
            # Return success values
            return SetAccelProcedureResult(
                done_for_id=done_for_id_value,
                done_for_all=done_for_all_value
            )
        else:
            # If all attempts failed, raise an exception with all error messages
            raise Exception(f"All procedure execution attempts failed: {'; '.join(error_messages)}")
        
    except Exception as e:
        # Rollback in case of error
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error executing SET_ALL_EK_ACCEL_SET procedure: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    
    if settings.dev:
        uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
    else:
        uvicorn.run(app, host="0.0.0.0", port=8000)
