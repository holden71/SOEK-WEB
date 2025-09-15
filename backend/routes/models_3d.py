from typing import List
import mimetypes
import zipfile
import io

from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import Response
from sqlalchemy import inspect, text

from db import DbSessionDep
from models import Model3DData, CreateModel3DRequest
from database_utils import create_file_orm, create_model_orm, create_multimedia_relation_orm, get_file_type_by_extension, delete_model_with_files


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
    try:
        # Delete model and all related files using ORM
        result = delete_model_with_files(db, model_id)
        
        # Commit the transaction
        db.commit()
        
        return {"message": result["message"]}
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Не вдалося видалити 3D модель: {str(e)}")


@router.post("/models_3d", response_model=Model3DData)
async def create_3d_model(db: DbSessionDep, model_data: CreateModel3DRequest):
    """Simple and reliable 3D model creation using SQLAlchemy ORM"""
    try:
        # Pre-validate all file extensions before creating anything
        extensions_to_validate = [model_data.file_extension]
        if model_data.multimedia_files:
            extensions_to_validate.extend([mf.file_extension for mf in model_data.multimedia_files])
        
        # Validate all extensions at once
        invalid_extensions = []
        for extension in extensions_to_validate:
            try:
                get_file_type_by_extension(db, extension)
            except HTTPException as e:
                if e.status_code == 400:  # Extension not found
                    invalid_extensions.append(extension)
                else:
                    raise
        
        if invalid_extensions:
            # Get available extensions for comprehensive error message
            from database_models import FileType
            available_types = db.query(FileType).filter(FileType.DEF_EXT.isnot(None)).all()
            available_extensions = [ft.DEF_EXT for ft in available_types]
            available_list = ", ".join(sorted(available_extensions))
            
            invalid_list = ", ".join(invalid_extensions)
            raise HTTPException(
                status_code=400,
                detail=f"Недозволені розширення файлів: {invalid_list}. Дозволені розширення: {available_list}"
            )

        # Step 1: Create main model file
        file_bytes = bytes(model_data.file_content) if model_data.file_content else None

        # Find file type by extension using ORM
        file_type_id = get_file_type_by_extension(db, model_data.file_extension)

        # Create model file using ORM
        model_file_id = create_file_orm(
            db=db,
            file_type_id=file_type_id,
            file_name=model_data.file_name,
            file_bytes=file_bytes,
            descr=f"Файл 3D моделі: {model_data.sh_name}",
            sh_descr=None
        )

        # Step 2: Create 3D model record using ORM
        model_id = create_model_orm(
            db=db,
            sh_name=model_data.sh_name,
            descr=model_data.descr,
            model_file_id=model_file_id
        )

        # Step 3: Process multimedia files if any
        if model_data.multimedia_files:
            for multimedia_file in model_data.multimedia_files:
                # Convert multimedia file content
                multimedia_bytes = bytes(multimedia_file.file_content)
                
                # Find multimedia file type using ORM
                multimedia_type_id = get_file_type_by_extension(db, multimedia_file.file_extension)
                
                # Create multimedia file using ORM
                multimedia_file_id = create_file_orm(
                    db=db,
                    file_type_id=multimedia_type_id,
                    file_name=multimedia_file.file_name,
                    file_bytes=multimedia_bytes,
                    descr=f"Мультімедіа файл для 3D моделі: {model_data.sh_name}",
                    sh_descr=None
                )
                
                # Create multimedia relation using ORM
                create_multimedia_relation_orm(
                    db=db,
                    sh_name=multimedia_file.sh_name,
                    multimedia_file_id=multimedia_file_id,
                    model_id=model_id
                )

        # Commit all changes
        db.commit()

        # Get created model data using raw SQL (keep for compatibility with existing format)
        inspector = inspect(db.get_bind())
        columns = inspector.get_columns('SRTN_3D_MODELS')
        column_names = [col['name'] for col in columns]

        # Exclude MODEL_PREV1_ID and MODEL_PREV2_ID
        excluded_columns = ['MODEL_PREV1_ID', 'MODEL_PREV2_ID']
        filtered_columns = [col for col in column_names if col not in excluded_columns]

        query = text(f"""
            SELECT {', '.join(filtered_columns)}
            FROM SRTN_3D_MODELS
            WHERE MODEL_ID = :model_id
        """)

        result = db.execute(query, {"model_id": model_id})
        row = result.fetchone()
        
        if not row:
            raise HTTPException(status_code=500, detail=f"Не вдалося отримати дані створеної моделі з ID {model_id}")
        
        # Create row dictionary
        row_dict = {filtered_columns[i]: value for i, value in enumerate(row)}
        
        return Model3DData(data=row_dict)

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
    
    # Проверяем наличие данных модели
    if model_file_data is None:
        model_file_data = b""
    elif isinstance(model_file_data, str):
        model_file_data = model_file_data.encode('utf-8')
    elif not isinstance(model_file_data, bytes):
        model_file_data = bytes(model_file_data) if model_file_data else b""
    
    if not include_multimedia:
        # Загружаем только файл 3D модели
        content_type, _ = mimetypes.guess_type(model_file_name)
        if not content_type:
            content_type = 'application/octet-stream'
        
        # Используем оригинальное имя файла из базы как есть
        filename = model_file_name or f"model_{model_id}.bin"

        print(f"DEBUG: Setting Content-Disposition header with filename: {filename}")
        
        return Response(
            content=model_file_data,
            media_type=content_type,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Length": str(len(model_file_data))
            }
        )
    
    else:
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
        
        # Простое ASCII имя для ZIP файла
        zip_filename = f"model_{model_id}_with_multimedia.zip"
        
        return Response(
            content=zip_data,
            media_type="application/zip",
            headers={
                "Content-Disposition": f'attachment; filename="{zip_filename}"',
                "Content-Length": str(len(zip_data))
            }
        )
