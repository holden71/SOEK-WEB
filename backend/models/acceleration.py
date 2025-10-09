"""
Acceleration data ORM models
"""
from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship

from .base import Base


class AccelSet(Base):
    """Acceleration set (набор акселерограмм)"""
    __tablename__ = 'SRTN_ACCEL_SET'
    
    ACCEL_SET_ID = Column(Integer, primary_key=True, autoincrement=True)
    SET_TYPE = Column(String(100))
    X_PLOT_ID = Column(Integer, ForeignKey('SRTN_ACCEL_PLOT.PLOT_ID'))
    Y_PLOT_ID = Column(Integer, ForeignKey('SRTN_ACCEL_PLOT.PLOT_ID'))
    Z_PLOT_ID = Column(Integer, ForeignKey('SRTN_ACCEL_PLOT.PLOT_ID'))
    BUILDING = Column(String(30))
    ROOM = Column(String(30))
    LEV = Column(Float)
    LEV1 = Column(Float)
    LEV2 = Column(Float)
    DEMPF = Column(Float)
    PLANT_ID = Column(Integer, ForeignKey('UNS_PLANTS.PLANT_ID'))
    PLANT_NAME = Column(String(50))
    UNIT_ID = Column(Integer, ForeignKey('UNS_UNITS.UNIT_ID'))
    UNIT_NAME = Column(String(50))
    PGA_ = Column(Float)
    SPECTR_EARTHQ_TYPE = Column(String(8))
    CALC_TYPE = Column(String(40))
    
    # Relationships
    plant = relationship("Plant")
    unit = relationship("Unit")


class AccelPlot(Base):
    """Acceleration plot (график акселерограммы)"""
    __tablename__ = 'SRTN_ACCEL_PLOT'
    
    PLOT_ID = Column(Integer, primary_key=True, autoincrement=True)
    AXIS = Column(String(10))
    NAME = Column(String(255))


class AccelPoint(Base):
    """Acceleration point (точка на графике акселерограммы)"""
    __tablename__ = 'SRTN_ACCEL_POINT'
    
    POINT_ID = Column(Integer, primary_key=True, autoincrement=True)
    FREQ = Column(Float)
    ACCEL = Column(Float)
    PLOT_ID = Column(Integer, ForeignKey('SRTN_ACCEL_PLOT.PLOT_ID'))
    
    plot = relationship("AccelPlot")

