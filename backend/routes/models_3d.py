from typing import List
import mimetypes
import zipfile
import io

from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import Response
from sqlalchemy import inspect, text

from db import DbSessionDep
from models import Model3DData, CreateModel3DRequest
from database_utils import insert_file_with_returning, insert_model_with_returning, insert_multimedia_with_returning, call_delete_3d_model_procedure


router = APIRouter(prefix="/api", tags=["models_3d"])


@router.get("/models_3d", response_model=List[Model3DData])
async def get_3d_models(
    db: DbSessionDep,
):
    inspector = inspect(db.get_bind())
    columns = inspector.get_columns('SRTN_3D_MODELS')
    column_names = [col['name'] for col in columns]

    # Exclude MODEL_PREV1_ID and MODEL_PREV2_ID as requested
    excluded_columns = ['MODEL_PREV1_ID', 'MODEL_PREV2_ID']
    filtered_columns = [col for col in column_names if col not in excluded_columns]

    query = text(
        f"""
        SELECT {', '.join(filtered_columns)}
        FROM SRTN_3D_MODELS
        ORDER BY MODEL_ID
        """
    )

    result = db.execute(query)

    models_data = []
    for row in result:
        row_dict = {filtered_columns[i]: value for i, value in enumerate(row)}
        models_data.append(Model3DData(data=row_dict))

    return models_data


@router.get("/models_3d/{model_id}", response_model=Model3DData)
async def get_3d_model_by_id(
    db: DbSessionDep,
    model_id: int,
):
    inspector = inspect(db.get_bind())
    columns = inspector.get_columns('SRTN_3D_MODELS')
    column_names = [col['name'] for col in columns]

    # Exclude MODEL_PREV1_ID and MODEL_PREV2_ID as requested
    excluded_columns = ['MODEL_PREV1_ID', 'MODEL_PREV2_ID']
    filtered_columns = [col for col in column_names if col not in excluded_columns]

    query = text(
        f"""
        SELECT {', '.join(filtered_columns)}
        FROM SRTN_3D_MODELS
        WHERE MODEL_ID = :model_id
        """
    )

    result = db.execute(query, {"model_id": model_id})

    row = result.fetchone()
    if row:
        row_dict = {filtered_columns[i]: value for i, value in enumerate(row)}
        return Model3DData(data=row_dict)

    return None


@router.delete("/models_3d/{model_id}")
async def delete_3d_model(
    db: DbSessionDep,
    model_id: int,
):
    # Check if model exists first
    check_query = text("SELECT MODEL_ID FROM SRTN_3D_MODELS WHERE MODEL_ID = :model_id")
    result = db.execute(check_query, {"model_id": model_id})
    existing_model = result.fetchone()

    if not existing_model:
        raise HTTPException(status_code=404, detail="3D модель не знайдена")

    # Use stored procedure to delete model and all related data
    result = call_delete_3d_model_procedure(db, model_id)
    
    # Commit the transaction
    db.commit()
    
    return {"message": result["message"]}


@router.post("/models_3d", response_model=Model3DData)
async def create_3d_model(db: DbSessionDep, model_data: CreateModel3DRequest):
    try:
        # Step 1: Create the file first using RETURNING INTO (MOST RELIABLE METHOD)
        # Convert file content
        file_bytes = bytes(model_data.file_content) if model_data.file_content else None

        # Find file type by extension
        file_type_result = db.execute(text("SELECT FILE_TYPE_ID FROM SRTN_FILE_TYPES WHERE DEF_EXT = :extension"), {"extension": model_data.file_extension})
        file_type_row = file_type_result.fetchone()

        if not file_type_row:
            raise HTTPException(status_code=400, detail=f"Тип файлу з розширенням '{model_data.file_extension}' не знайдено в базі даних")

        file_type_id = file_type_row[0]

        # STEP 1: Insert file using utility function
        new_file_id = insert_file_with_returning(
            db=db,
            file_type_id=file_type_id,
            file_name=model_data.file_name,
            file_bytes=file_bytes,
            descr=f"Файл 3D моделі: {model_data.sh_name}",  # Auto-generated description like multimedia
            sh_descr=None  # sh_descr should be null for 3D model files
        )

        # STEP 2: Insert 3D model using utility function
        new_model_id = insert_model_with_returning(
            db=db,
            sh_name=model_data.sh_name,
            descr=model_data.descr,
            model_file_id=new_file_id
        )

        # STEP 3: Process multimedia files if any
        multimedia_ids = []
        if model_data.multimedia_files:
            print(f"DEBUG: Processing {len(model_data.multimedia_files)} multimedia files...")
            
            for multimedia_file in model_data.multimedia_files:
                # Convert file content back to bytes
                multimedia_bytes = bytes(multimedia_file.file_content)
                
                # Check if file type exists
                multimedia_type_query = text("SELECT FILE_TYPE_ID FROM SRTN_FILE_TYPES WHERE DEF_EXT = :extension")
                multimedia_type_row = db.execute(multimedia_type_query, {"extension": multimedia_file.file_extension}).fetchone()
                
                if not multimedia_type_row:
                    raise HTTPException(status_code=400, detail=f"Тип мультімедіа файлу з розширенням '{multimedia_file.file_extension}' не знайдено в базі даних")
                
                multimedia_type_id = multimedia_type_row[0]
                
                # Insert multimedia file into SRTN_FILES
                multimedia_file_id = insert_file_with_returning(
                    db=db,
                    file_type_id=multimedia_type_id,
                    file_name=multimedia_file.file_name,
                    file_bytes=multimedia_bytes,
                    descr=f"Мультімедіа файл для 3D моделі: {model_data.sh_name}",
                    sh_descr=None  # sh_descr should be null for multimedia files
                )
                
                # Insert relationship into SRTN_MULTIMED_3D_MODELS
                multimedia_relation_id = insert_multimedia_with_returning(
                    db=db,
                    sh_name=multimedia_file.sh_name,
                    multimedia_file_id=multimedia_file_id,
                    model_id=new_model_id
                )
                
                multimedia_ids.append({
                    "multimedia_file_id": multimedia_file_id,
                    "multimedia_relation_id": multimedia_relation_id,
                    "file_name": multimedia_file.file_name
                })
                
                print(f"DEBUG: Multimedia file '{multimedia_file.file_name}' processed - FILE_ID: {multimedia_file_id}, RELATION_ID: {multimedia_relation_id}")

        db.commit()

        # Return created model info with confirmed IDs
        result_data = {
            "MODEL_ID": new_model_id,
            "SH_NAME": model_data.sh_name,
            "DESCR": model_data.descr,
            "MODEL_FILE_ID": new_file_id,
            "MULTIMEDIA_FILES_COUNT": len(multimedia_ids) if multimedia_ids else 0
        }

        print(f"SUCCESS: 3D Model created with MODEL_ID: {new_model_id}, FILE_ID: {new_file_id}, Multimedia files: {len(multimedia_ids) if multimedia_ids else 0}")

        return Model3DData(data=result_data)

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Не вдалося створити 3D модель: {str(e)}")


@router.get("/models_3d/{model_id}/download")
async def download_3d_model(
    db: DbSessionDep, 
    model_id: int, 
    include_multimedia: bool = False
):
    """
    Загрузка 3D модели с опциональными мультимедийными файлами
    
    - model_id: ID 3D модели
    - include_multimedia: если True, включает все связанные мультимедийные файлы в ZIP архив
    """
    
    print(f"DEBUG: download_3d_model called with model_id={model_id}, include_multimedia={include_multimedia}")
    
    # Получаем информацию о 3D модели вместе с типом файла
    model_query = text("""
        SELECT m.MODEL_ID, m.SH_NAME, m.DESCR, m.MODEL_FILE_ID,
               f.FILE_NAME, f.DATA, ft.DEF_EXT
        FROM SRTN_3D_MODELS m
        JOIN SRTN_FILES f ON m.MODEL_FILE_ID = f.FILE_ID
        JOIN SRTN_FILE_TYPES ft ON f.FILE_TYPE_ID = ft.FILE_TYPE_ID
        WHERE m.MODEL_ID = :model_id
    """)
    
    model_result = db.execute(model_query, {"model_id": model_id})
    model_row = model_result.fetchone()
    
    if not model_row:
        raise HTTPException(status_code=404, detail="3D модель не знайдена")
    
    model_id, sh_name, descr, model_file_id, model_file_name, model_file_data, file_extension = model_row
    
    print(f"DEBUG: Found model - ID: {model_id}, name: {sh_name}, file_name: {model_file_name}, extension: {file_extension}")
    print(f"DEBUG: File data type: {type(model_file_data)}, size: {len(model_file_data) if model_file_data else 0}")
    
    # Проверяем наличие данных модели
    if model_file_data is None:
        model_file_data = b""
        print("DEBUG: model_file_data was None, set to empty bytes")
    elif isinstance(model_file_data, str):
        model_file_data = model_file_data.encode('utf-8')
        print("DEBUG: model_file_data was string, encoded to utf-8")
    elif not isinstance(model_file_data, bytes):
        model_file_data = bytes(model_file_data) if model_file_data else b""
        print("DEBUG: model_file_data converted to bytes")
    
    print(f"DEBUG: Final model_file_data size: {len(model_file_data)} bytes")
    print(f"DEBUG: include_multimedia = {include_multimedia}")
    
    if not include_multimedia:
        print("DEBUG: Single file download mode")
        # Загружаем только файл 3D модели
        content_type, _ = mimetypes.guess_type(model_file_name)
        if not content_type:
            content_type = 'application/octet-stream'
        
        # Просто используем оригинальное имя файла из базы
        filename = model_file_name or f"model_{model_id}.bin"
        
        print(f"DEBUG: Returning single file - content_type: {content_type}, filename: {filename}, size: {len(model_file_data)}")
        
        return Response(
            content=model_file_data,
            media_type=content_type,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Length": str(len(model_file_data))
            }
        )
    
    else:
        print("DEBUG: ZIP archive with multimedia mode")
        # Создаем ZIP архив с моделью и мультимедийными файлами
        zip_buffer = io.BytesIO()
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # Добавляем основной файл 3D модели
            model_filename = model_file_name or f"model_{model_id}"
            zip_file.writestr(model_filename, model_file_data)
            
            # Получаем все связанные мультимедийные файлы
            multimedia_query = text("""
                SELECT mm.SH_NAME as MM_NAME, f.FILE_NAME, f.DATA
                FROM SRTN_MULTIMED_3D_MODELS mm
                JOIN SRTN_FILES f ON mm.MULTIMED_FILE_ID = f.FILE_ID
                WHERE mm.MODEL_ID = :model_id
            """)
            
            multimedia_result = db.execute(multimedia_query, {"model_id": model_id})
            multimedia_files = multimedia_result.fetchall()
            
            # Добавляем мультимедийные файлы в архив
            multimedia_count = 0
            for mm_name, file_name, file_data in multimedia_files:
                if file_data is None:
                    file_data = b""
                elif isinstance(file_data, str):
                    file_data = file_data.encode('utf-8')
                elif not isinstance(file_data, bytes):
                    file_data = bytes(file_data) if file_data else b""
                
                # Создаем папку для мультимедийных файлов
                multimedia_filename = f"multimedia/{file_name}" if file_name else f"multimedia/file_{multimedia_count}"
                zip_file.writestr(multimedia_filename, file_data)
                multimedia_count += 1
            
            # Создаем информационный файл
            info_content = f"""3D Model Information
============================
Model Name: {sh_name or 'Unnamed'}
Description: {descr or 'No description'}
Model ID: {model_id}
Model File: {model_filename}
Multimedia Files: {multimedia_count}

This archive contains:
- Main 3D model file: {model_filename}
- Multimedia files folder: multimedia/ ({multimedia_count} files)
"""
            zip_file.writestr("README.txt", info_content.encode('utf-8'))
        
        zip_buffer.seek(0)
        zip_data = zip_buffer.getvalue()
        
        # Имя ZIP файла на основе названия модели
        zip_filename = f"{sh_name or f'model_{model_id}'}_with_multimedia.zip"
        
        return Response(
            content=zip_data,
            media_type="application/zip",
            headers={
                "Content-Disposition": f'attachment; filename="{zip_filename}"',
                "Content-Length": str(len(zip_data))
            }
        )
