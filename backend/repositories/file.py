"""
File and FileType repositories
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException

from models import File, FileType
from .base import BaseRepository


class FileTypeRepository(BaseRepository[FileType]):
    """File type repository"""
    
    def __init__(self):
        super().__init__(FileType)
    
    def get_by_extension(self, db: Session, extension: str) -> Optional[FileType]:
        """Get file type by extension"""
        file_type = db.query(FileType).filter(FileType.DEF_EXT == extension).first()
        if not file_type:
            # Get available extensions for error message
            available_types = db.query(FileType).filter(FileType.DEF_EXT.isnot(None)).all()
            available_extensions = [ft.DEF_EXT for ft in available_types]
            available_list = ", ".join(sorted(available_extensions))
            raise HTTPException(
                status_code=400,
                detail=f"Тип файлу з розширенням '{extension}' не дозволено. Дозволені розширення: {available_list}"
            )
        return file_type


class FileRepository(BaseRepository[File]):
    """File repository"""
    
    def __init__(self):
        super().__init__(File)
    
    def create_file(
        self,
        db: Session,
        file_type_id: int,
        file_name: str,
        file_bytes: bytes,
        descr: str = None,
        sh_descr: str = None
    ) -> int:
        """Create file and return its ID"""
        try:
            new_file = File(
                FILE_TYPE_ID=file_type_id,
                FILE_NAME=file_name,
                DESCR=descr,
                DATA=file_bytes,
                SH_DESCR=sh_descr
            )
            db.add(new_file)
            db.flush()
            return new_file.FILE_ID
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Не вдалося створити файл: {str(e)}")
    
    def get_all_with_types(self, db: Session) -> List[File]:
        """Get all files with file types"""
        return db.query(File).join(FileType).all()

