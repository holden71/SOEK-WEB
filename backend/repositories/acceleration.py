"""
Acceleration data repositories
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException

from models import AccelSet, AccelPlot, AccelPoint
from .base import BaseRepository


class AccelSetRepository(BaseRepository[AccelSet]):
    """Acceleration set repository"""
    
    def __init__(self):
        super().__init__(AccelSet)
    
    def create_set(self, db: Session, **kwargs) -> int:
        """Create acceleration set and return its ID"""
        try:
            new_accel_set = AccelSet(**kwargs)
            db.add(new_accel_set)
            db.flush()
            return new_accel_set.ACCEL_SET_ID
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Помилка створення набору прискорень: {str(e)}")
    
    def update_set(self, db: Session, accel_set_id: int, **kwargs):
        """Update acceleration set"""
        accel_set = db.query(AccelSet).filter(AccelSet.ACCEL_SET_ID == accel_set_id).first()
        if not accel_set:
            raise HTTPException(status_code=404, detail="Набір прискорень не знайдено")
        
        for key, value in kwargs.items():
            if hasattr(accel_set, key):
                setattr(accel_set, key, value)


class AccelPlotRepository(BaseRepository[AccelPlot]):
    """Acceleration plot repository"""
    
    def __init__(self):
        super().__init__(AccelPlot)
    
    def create_plot(self, db: Session, axis: str, name: str) -> int:
        """Create acceleration plot and return its ID"""
        try:
            new_plot = AccelPlot(AXIS=axis, NAME=name)
            db.add(new_plot)
            db.flush()
            return new_plot.PLOT_ID
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Помилка створення графіку: {str(e)}")


class AccelPointRepository(BaseRepository[AccelPoint]):
    """Acceleration point repository"""
    
    def __init__(self):
        super().__init__(AccelPoint)
    
    def create_point(self, db: Session, freq: float, accel: float, plot_id: int):
        """Create acceleration point"""
        try:
            new_point = AccelPoint(FREQ=freq, ACCEL=accel, PLOT_ID=plot_id)
            db.add(new_point)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Помилка створення точки: {str(e)}")
    
    def get_by_plot_id(self, db: Session, plot_id: int) -> List[AccelPoint]:
        """Get all points for a plot"""
        return db.query(AccelPoint).filter(
            AccelPoint.PLOT_ID == plot_id
        ).order_by(AccelPoint.FREQ).all()

