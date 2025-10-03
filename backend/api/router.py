"""
API router - агрегация всех endpoint'ов
"""
from fastapi import APIRouter

from api.endpoints import (
    plants,
    search,
    files,
    file_types,
    models_3d,
    locations,
    multimedia,
    acceleration,
    seismic_analysis,
    load_analysis,
)

# Создаем главный роутер для API
api_router = APIRouter()

# Подключаем все endpoint'ы
api_router.include_router(plants.router)
api_router.include_router(search.router)
api_router.include_router(files.router)
api_router.include_router(file_types.router)
api_router.include_router(models_3d.router)
api_router.include_router(locations.router)
api_router.include_router(multimedia.router)
api_router.include_router(acceleration.router)
api_router.include_router(seismic_analysis.router)
api_router.include_router(load_analysis.router)

