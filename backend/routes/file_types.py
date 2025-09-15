from typing import List

from fastapi import APIRouter, HTTPException

from db import DbSessionDep
from models import FileTypeData, CreateFileTypeRequest
from database_utils import get_all_file_types, get_file_type_by_id, create_file_type_orm, delete_file_type_orm


router = APIRouter(prefix="/api", tags=["file_types"])


@router.get("/file_types", response_model=List[FileTypeData])
async def get_file_types(db: DbSessionDep):
    """Get all file types using SQLAlchemy ORM"""
    file_types_orm = get_all_file_types(db)
    
    file_types_data = []
    for file_type in file_types_orm:
        # Create display name with extension
        display_name = f"{file_type.NAME} ({file_type.DEF_EXT})" if file_type.DEF_EXT else file_type.NAME
        
        row_dict = {
            "FILE_TYPE_ID": file_type.FILE_TYPE_ID,
            "NAME": file_type.NAME,
            "DESCR": file_type.DESCR,
            "DEF_EXT": file_type.DEF_EXT,
            "DISPLAY_NAME": display_name
        }
        file_types_data.append(FileTypeData(data=row_dict))
    
    return file_types_data


@router.get("/file_types/{file_type_id}", response_model=FileTypeData)
async def get_file_type_by_id(db: DbSessionDep, file_type_id: int):
    """Get file type by ID using SQLAlchemy ORM"""
    file_type = get_file_type_by_id(db, file_type_id)
    
    if not file_type:
        return None
        
    row_dict = {
        "FILE_TYPE_ID": file_type.FILE_TYPE_ID,
        "NAME": file_type.NAME,
        "DESCR": file_type.DESCR,
        "DEF_EXT": file_type.DEF_EXT,
        "DISPLAY_NAME": f"{file_type.NAME} ({file_type.DEF_EXT})" if file_type.DEF_EXT else file_type.NAME
    }
    
    return FileTypeData(data=row_dict)


@router.post("/file_types", response_model=FileTypeData)
async def create_file_type(db: DbSessionDep, file_type_data: CreateFileTypeRequest):
    """Create file type using SQLAlchemy ORM"""
    try:
        # Create file type using ORM
        new_id = create_file_type_orm(
            db=db,
            name=file_type_data.name,
            descr=file_type_data.descr,
            def_ext=file_type_data.def_ext
        )

        # Commit transaction
        db.commit()

        # Return the created file type
        display_name = f"{file_type_data.name} ({file_type_data.def_ext})" if file_type_data.def_ext else file_type_data.name
        return FileTypeData(data={
            "FILE_TYPE_ID": new_id,
            "NAME": file_type_data.name,
            "DESCR": file_type_data.descr,
            "DEF_EXT": file_type_data.def_ext,
            "DISPLAY_NAME": display_name
        })

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Помилка створення типу файлу: {str(e)}")


@router.delete("/file_types/{file_type_id}")
async def delete_file_type(db: DbSessionDep, file_type_id: int):
    """Delete file type using SQLAlchemy ORM"""
    try:
        # Delete file type using ORM
        delete_file_type_orm(db, file_type_id)
        
        # Commit transaction
        db.commit()
        
        return {"message": "Тип файлу успішно видалений"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Помилка видалення типу файлу: {str(e)}")