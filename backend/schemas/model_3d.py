"""
3D Model Pydantic schemas
"""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class Model3DData(BaseModel):
    """3D model data schema"""
    data: Dict[str, Any]


class MultimediaFileRequest(BaseModel):
    """Multimedia file request schema"""
    sh_name: str  # Короткая назва файлу мультімедіа
    file_name: str  # Имя файла мультимедиа
    file_content: List[int]  # Содержимое файла мультимедиа
    file_extension: str  # Расширение файла для автоматического определения типа


class CreateModel3DRequest(BaseModel):
    """Create 3D model request schema"""
    sh_name: str  # Короткая название модели
    descr: Optional[str] = None  # Описание модели
    file_name: str  # Имя файла модели
    file_content: List[int]  # Содержимое файла модели
    file_extension: str  # Расширение файла для автоматического определения типа
    multimedia_files: Optional[List[MultimediaFileRequest]] = []  # Мультимедиа файлы


class EkModel3DCreate(BaseModel):
    """EK 3D model link creation schema"""
    sh_name: Optional[str] = None
    ek_id: int
    model_id: int


class EkModel3DResponse(BaseModel):
    """EK 3D model response schema"""
    EK_3D_ID: int
    SH_NAME: Optional[str]
    EK_ID: int
    MODEL_ID: int
    
    # Model details
    MODEL_SH_NAME: Optional[str] = None
    MODEL_DESCR: Optional[str] = None
    MODEL_FILE_NAME: Optional[str] = None
    FILE_TYPE_NAME: Optional[str] = None

    class Config:
        from_attributes = True

