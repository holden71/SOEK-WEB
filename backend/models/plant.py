"""
Plant and Unit ORM models
"""
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

from .base import Base


class Plant(Base):
    """Plant (АЕС) model"""
    __tablename__ = 'UNS_PLANTS'
    
    PLANT_ID = Column(Integer, primary_key=True, autoincrement=True)
    NAME = Column(String(255))


class Unit(Base):
    """Unit (Блок) model"""
    __tablename__ = 'UNS_UNITS'
    
    UNIT_ID = Column(Integer, primary_key=True, autoincrement=True)
    PLANT_ID = Column(Integer, ForeignKey('UNS_PLANTS.PLANT_ID'))
    NAME = Column(String(255))
    
    plant = relationship("Plant")

