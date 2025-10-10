"""
Seismic data ORM models
"""
from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship

from .base import Base


class EkSeismData(Base):
    """Seismic data for equipment class (Сейсмічні дані ЕК)"""
    __tablename__ = 'SRTN_EK_SEISM_DATA'
    
    # Primary key
    EK_ID = Column(Integer, primary_key=True, autoincrement=True)
    
    # Equipment list info
    EKLIST_ID = Column(Integer)
    EKLIST_NAME = Column(String(255))
    
    # Equipment info
    IDEN = Column(String(50))
    NAME = Column(String(255))  # Найменування ЕК
    
    # Location
    PLANT_ID = Column(Integer, ForeignKey('UNS_PLANTS.PLANT_ID'))
    PLANT_NAME = Column(String(255))
    UNIT_ID = Column(Integer, ForeignKey('UNS_UNITS.UNIT_ID'))
    UNIT_NAME = Column(String(255))
    BUILDING = Column(String(100))
    ROOM = Column(String(100))
    LEV = Column(String(50))
    
    # Equipment classification
    EK_CLASS_ID = Column(Integer)
    EK_CLASS_NAME = Column(String(255))
    SEISMO_TXT = Column(String(255))
    PTYPE_ID = Column(Integer)
    PTYPE_TXT = Column(String(255))
    
    # Acceleration sets
    ACCEL_SET_ID_MRZ = Column(Integer)
    ACCEL_SET_ID_PZ = Column(Integer)
    
    # M values (Bending moments)
    M1_MRZ = Column(Float)
    M2_MRZ = Column(Float)
    M1_PZ = Column(Float)
    M2_PZ = Column(Float)
    
    # HCLPF and sigma values
    HCLPF = Column(Float)
    SIGMA_DOP = Column(Float)
    SIGMA_1 = Column(Float)
    SIGMA_2 = Column(Float)
    
    # Sigma stress values - MRZ
    SIGMA_S_1_MRZ = Column(Float)
    SIGMA_S_2_MRZ = Column(Float)
    SIGMA_S_S1_MRZ = Column(Float)
    SIGMA_S_S2_MRZ = Column(Float)
    SIGMA_S_ALT_1_MRZ = Column(Float)
    SIGMA_S_ALT_2_MRZ = Column(Float)
    
    # Sigma stress values - PZ
    SIGMA_S_1_PZ = Column(Float)
    SIGMA_S_2_PZ = Column(Float)
    SIGMA_S_S1_PZ = Column(Float)
    SIGMA_S_S2_PZ = Column(Float)
    SIGMA_S_ALT_1_PZ = Column(Float)
    SIGMA_S_ALT_2_PZ = Column(Float)
    
    # Alternative sigma
    SIGMA_ALT_DOP = Column(Float)
    
    # Frequency and coefficients
    F_MU = Column(Float)
    FIRST_NAT_FREQ_X = Column(Float)
    FIRST_NAT_FREQ_Y = Column(Float)
    FIRST_NAT_FREQ_Z = Column(Float)
    N_MRZ = Column(Float)
    N_PZ = Column(Float)
    K1_MRZ = Column(Float)
    K3_MRZ = Column(Float)
    K1_PZ = Column(Float)
    K3_PZ = Column(Float)
    K1_ = Column(Float)
    K2_ = Column(Float)
    K3_ = Column(Float)
    K1_ALT_MRZ = Column(Float)
    
    # Status flags
    SAFETY_MARGIN_OK = Column(String(10))
    SEISMIC_STATUS_OK = Column(String(10))
    
    # Temperature and pressure - MRZ
    TEMP1_MRZ = Column(Float)
    TEMP2_MRZ = Column(Float)
    DELTA_T_MRZ = Column(Float)
    P1_MRZ = Column(Float)
    P2_MRZ = Column(Float)
    RATIO_P_MRZ = Column(Float)
    RATIO_E_MRZ = Column(Float)
    M1_ALT_MRZ = Column(Float)
    RATIO_M1_MRZ = Column(Float)
    SIGMA_DOP_A_MRZ = Column(Float)
    RATION_SIGMA_DOP_MRZ = Column(Float)
    HCLPF_ALT_MRZ = Column(Float)
    
    # Temperature and pressure - PZ
    TEMP1_PZ = Column(Float)
    TEMP2_PZ = Column(Float)
    DELTA_T_PZ = Column(Float)
    P1_PZ = Column(Float)
    P2_PZ = Column(Float)
    RATIO_P_PZ = Column(Float)
    RATIO_E_PZ = Column(Float)
    M1_ALT_PZ = Column(Float)
    RATIO_M1_PZ = Column(Float)
    SIGMA_DOP_A_PZ = Column(Float)
    RATION_SIGMA_DOP_PZ = Column(Float)
    HCLPF_ALT_PZ = Column(Float)
    K1_ALT_PZ = Column(Float)
    
    # Material and documentation
    MAT_NAME = Column(String(255))
    DOC_1 = Column(String(255))
    DOC_2 = Column(String(255))
    
    # Relationships
    plant = relationship("Plant")
    unit = relationship("Unit")

