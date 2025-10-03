"""
File and FileType Pydantic schemas
"""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class FileData(BaseModel):
    """File data schema"""
    data: Dict[str, Any]


class CreateFileTypeRequest(BaseModel):
    """Create file type request schema"""
    name: str
    descr: str
    def_ext: str


class CreateFileRequest(BaseModel):
    """Create file request schema"""
    file_name: str
    descr: Optional[str] = None
    sh_descr: Optional[str] = None
    file_content: List[int]  # Массив байтов для BLOB данных
    file_extension: str  # Расширение файла для автоматического определения типа


class FileTypeData(BaseModel):
    """File type data schema"""
    data: Dict[str, Any]

