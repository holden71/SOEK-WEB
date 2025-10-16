"""
File service - бизнес-логика для работы с файлами
"""
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import inspect, text
from fastapi import HTTPException

from repositories import FileRepository, FileTypeRepository
from schemas import FileData, CreateFileRequest, FileTypeData, CreateFileTypeRequest
from utils.formatters import format_data_field


class FileService:
    """File service"""
    
    def __init__(self):
        self.file_repo = FileRepository()
        self.file_type_repo = FileTypeRepository()
    
    def get_all_files(self, db: Session) -> List[FileData]:
        """Get all files with formatted data"""
        inspector = inspect(db.get_bind())
        columns = inspector.get_columns('SRTN_FILES')
        column_names = [col['name'] for col in columns if col['name'].upper() not in ['DATA', 'ORIG_FILE_PATH']]
        
        query_sql = f"""
            SELECT {', '.join(column_names)}, 
                   COALESCE(LENGTH(DATA), 0) as DATA_SIZE
            FROM SRTN_FILES
            ORDER BY FILE_ID
        """
        result = db.execute(text(query_sql))
        
        files_data = []
        for row in result:
            data_size = row[-1]  # Last column - DATA_SIZE
            row_dict = {column_names[i]: value for i, value in enumerate(row[:-1])}
            row_dict['DATA'] = format_data_field(int(data_size) if data_size else 0)
            files_data.append(FileData(data=row_dict))
        
        return files_data
    
    def get_file_by_id(self, db: Session, file_id: int):
        """Get file by ID"""
        file_obj = self.file_repo.get_by_id(db, file_id)
        if not file_obj:
            raise HTTPException(status_code=404, detail=f"Файл з ID {file_id} не знайдено")
        return file_obj
    
    def create_file(self, db: Session, request: CreateFileRequest) -> int:
        """Create file from request"""
        # Get file type by extension
        file_type = self.file_type_repo.get_by_extension(db, request.file_extension)
        
        # Convert list of ints to bytes
        file_bytes = bytes(request.file_content)
        
        # Create file
        file_id = self.file_repo.create_file(
            db=db,
            file_type_id=file_type.FILE_TYPE_ID,
            file_name=request.file_name,
            file_bytes=file_bytes,
            descr=request.descr,
            sh_descr=request.sh_descr
        )
        
        return file_id
    
    def delete_file(self, db: Session, file_id: int):
        """Delete file by ID"""
        self.file_repo.delete(db, file_id)
    
    def get_all_file_types(self, db: Session) -> List[FileTypeData]:
        """Get all file types"""
        file_types = self.file_type_repo.get_all(db)
        return [
            FileTypeData(data={
                "FILE_TYPE_ID": ft.FILE_TYPE_ID,
                "NAME": ft.NAME,
                "DESCR": ft.DESCR,
                "DEF_EXT": ft.DEF_EXT
            })
            for ft in file_types
        ]
    
    def create_file_type(self, db: Session, request: CreateFileTypeRequest) -> int:
        """Create file type"""
        file_type = self.file_type_repo.create(
            db=db,
            NAME=request.name,
            DESCR=request.descr,
            DEF_EXT=request.def_ext
        )
        return file_type.FILE_TYPE_ID
    
    def delete_file_type(self, db: Session, file_type_id: int):
        """Delete file type"""
        self.file_type_repo.delete(db, file_type_id)
    
    def get_allowed_extensions(self, db: Session) -> List[str]:
        """Get list of allowed file extensions"""
        file_types = self.file_type_repo.get_all(db)
        extensions = [ft.DEF_EXT for ft in file_types if ft.DEF_EXT]
        return sorted(set(extensions))

    def get_allowed_extensions_detailed(self, db: Session) -> dict:
        """Get detailed list of allowed file extensions with metadata"""
        # TODO: В будущем надо конкретизировать, какие типы относятся к моделям, а какие к мультимедиа
        # Добавить поле в FILE_TYPES для категоризации (например, IS_MODEL, IS_MULTIMEDIA)
        # и фильтровать типы файлов в зависимости от контекста использования
        file_types = self.file_type_repo.get_all(db)

        allowed_extensions = []
        for ft in file_types:
            if ft.DEF_EXT:
                allowed_extensions.append({
                    "extension": ft.DEF_EXT,
                    "name": ft.NAME,
                    "description": ft.DESCR
                })

        # Create accept string for HTML input accept attribute
        extensions_list = [ft.DEF_EXT for ft in file_types if ft.DEF_EXT]
        accept_string = ",".join(sorted(set(extensions_list)))

        return {
            "allowed_extensions": allowed_extensions,
            "accept_string": accept_string
        }

