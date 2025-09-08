from typing import List
import mimetypes

from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import Response
from sqlalchemy import inspect, text

from db import DbSessionDep
from models import FileData, CreateFileRequest


router = APIRouter(prefix="/api", tags=["files"])


def format_file_size(size_bytes: int) -> str:
    """Форматирует размер файла в читаемый вид"""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.1f} GB"


def format_data_field(data_size: int) -> str:
    """Форматирует поле DATA для отображения"""
    if data_size > 0:
        return f"{format_file_size(data_size)}"
    else:
        return "NO DATA"


def get_files_query(column_names: List[str], where_clause: str = "") -> str:
    """Генерирует SQL запрос для получения файлов с информацией о размере"""
    base_query = f"""
        SELECT {', '.join(column_names)}, 
               COALESCE(LENGTH(DATA), 0) as DATA_SIZE
        FROM SRTN_FILES
        {where_clause}
        ORDER BY FILE_ID
    """
    return base_query


def process_file_row(row, column_names: List[str]) -> dict:
    """Обрабатывает строку результата запроса и добавляет информацию о размере данных"""
    data_size = row[-1]  # Последняя колонка - DATA_SIZE
    row_dict = {column_names[i]: value for i, value in enumerate(row[:-1])}
    
    # Убеждаемся что data_size это число
    if data_size is None:
        data_size = 0
    
    row_dict['DATA'] = format_data_field(int(data_size))
    return row_dict


@router.get("/files", response_model=List[FileData])
async def get_files(db: DbSessionDep):
    inspector = inspect(db.get_bind())
    columns = inspector.get_columns('SRTN_FILES')
    # Исключаем DATA и ORIG_FILE_PATH колонки
    column_names = [col['name'] for col in columns if col['name'].upper() not in ['DATA', 'ORIG_FILE_PATH']]

    query_sql = get_files_query(column_names)
    result = db.execute(text(query_sql))

    files_data = []
    for row in result:
        row_dict = process_file_row(row, column_names)
        files_data.append(FileData(data=row_dict))

    return files_data


@router.get("/files/{file_id}", response_model=FileData)
async def get_file_by_id(db: DbSessionDep, file_id: int):
    inspector = inspect(db.get_bind())
    columns = inspector.get_columns('SRTN_FILES')
    # Исключаем DATA и ORIG_FILE_PATH колонки
    column_names = [col['name'] for col in columns if col['name'].upper() not in ['DATA', 'ORIG_FILE_PATH']]

    query_sql = get_files_query(column_names, "WHERE FILE_ID = :file_id")
    result = db.execute(text(query_sql), {"file_id": file_id})

    row = result.fetchone()
    if row:
        row_dict = process_file_row(row, column_names)
        return FileData(data=row_dict)

    return None


@router.get("/files/{file_id}/download")
async def download_file(db: DbSessionDep, file_id: int):
    """Отдельный эндпоинт для скачивания файла"""
    query = text("SELECT FILE_NAME, DATA FROM SRTN_FILES WHERE FILE_ID = :file_id")
    result = db.execute(query, {"file_id": file_id})
    row = result.fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="File not found")
    
    file_name, file_data = row
    
    if file_data is None:
        file_data = b""
    
    # Определяем MIME-тип по расширению файла
    content_type, _ = mimetypes.guess_type(file_name)
    if not content_type:
        content_type = 'application/octet-stream'
    
    # Убеждаемся что file_data это bytes
    if isinstance(file_data, str):
        file_data = file_data.encode('utf-8')
    elif not isinstance(file_data, bytes):
        file_data = bytes(file_data) if file_data else b""
    
    # Используем простое ASCII имя для заголовка
    safe_filename = f"file_{file_id}.txt"
    
    return Response(
        content=file_data,
        media_type=content_type,
        headers={
            "Content-Disposition": f'attachment; filename="{safe_filename}"',
            "Content-Length": str(len(file_data))
        }
    )


@router.post("/files", response_model=FileData)
async def create_file(db: DbSessionDep, file_data: CreateFileRequest):
    try:
        # Get next FILE_ID
        result = db.execute(text("SELECT NVL(MAX(FILE_ID), 0) + 1 FROM SRTN_FILES"))
        new_id = result.scalar()

        # Convert file content and get size
        file_bytes = bytes(file_data.file_content) if file_data.file_content else None
        file_size = len(file_data.file_content) if file_data.file_content else 0

        # Find file type by extension
        file_type_result = db.execute(text("SELECT FILE_TYPE_ID FROM SRTN_FILE_TYPES WHERE DEF_EXT = :extension"), {"extension": file_data.file_extension})
        file_type_row = file_type_result.fetchone()

        if not file_type_row:
            raise HTTPException(status_code=400, detail=f"Тип файлу з розширенням '{file_data.file_extension}' не знайдено в базі даних")

        file_type_id = file_type_row[0]

        # Insert new file
        insert_query = text("""
            INSERT INTO SRTN_FILES (FILE_ID, FILE_TYPE_ID, FILE_NAME, DESCR, DATA, SH_DESCR)
            VALUES (:file_id, :file_type_id, :file_name, :descr, :data, :sh_descr)
        """)

        db.execute(insert_query, {
            "file_id": new_id,
            "file_type_id": file_type_id,
            "file_name": file_data.file_name,
            "descr": file_data.descr or None,
            "data": file_bytes,
            "sh_descr": file_data.sh_descr or None
        })

        db.commit()

        # Return created file info
        return FileData(data={
            "FILE_ID": new_id,
            "FILE_TYPE_ID": file_type_id,
            "FILE_NAME": file_data.file_name,
            "DESCR": file_data.descr,
            "DATA": format_data_field(file_size),
            "SH_DESCR": file_data.sh_descr
        })

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Не вдалося створити файл: {str(e)}")


@router.delete("/files/{file_id}")
async def delete_file(db: DbSessionDep, file_id: int):
    # Check if file exists
    result = db.execute(text("SELECT FILE_ID FROM SRTN_FILES WHERE FILE_ID = :file_id"), {"file_id": file_id})
    
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Файл не знайдений")

    # Delete the file
    db.execute(text("DELETE FROM SRTN_FILES WHERE FILE_ID = :file_id"), {"file_id": file_id})
    db.commit()

    return {"message": "Файл успішно видалений"}