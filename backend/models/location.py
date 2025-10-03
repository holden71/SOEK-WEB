"""
Location ORM models
"""
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

from .base import Base


class TermLocation(Base):
    """Term location (Терміни розміщення)"""
    __tablename__ = 'SRT_TERMS_LOC'
    
    T_ID = Column(Integer, primary_key=True, autoincrement=True)
    T_NAME = Column(String(255))
    PLANT_ID = Column(Integer, ForeignKey('UNS_PLANTS.PLANT_ID'))
    UNIT_ID = Column(Integer, ForeignKey('UNS_UNITS.UNIT_ID'))
    
    plant = relationship("Plant")
    unit = relationship("Unit")

