"""
Complete SQLAlchemy ORM models for all database tables
"""
from sqlalchemy import Column, Integer, String, LargeBinary, ForeignKey, Float, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


# ==================== File System Tables ====================

class FileType(Base):
    __tablename__ = 'SRTN_FILE_TYPES'
    
    FILE_TYPE_ID = Column(Integer, primary_key=True, autoincrement=True)
    NAME = Column(String(255))
    DESCR = Column(String(500))
    DEF_EXT = Column(String(10))


class File(Base):
    __tablename__ = 'SRTN_FILES'
    
    FILE_ID = Column(Integer, primary_key=True, autoincrement=True)
    FILE_TYPE_ID = Column(Integer, ForeignKey('SRTN_FILE_TYPES.FILE_TYPE_ID'))
    FILE_NAME = Column(String(255))
    DESCR = Column(String(500))
    DATA = Column(LargeBinary)
    SH_DESCR = Column(String(100))
    
    file_type = relationship("FileType")


# ==================== 3D Models Tables ====================

class Model3D(Base):
    __tablename__ = 'SRTN_3D_MODELS'
    
    MODEL_ID = Column(Integer, primary_key=True, autoincrement=True)
    SH_NAME = Column(String(100))
    DESCR = Column(String(500))
    MODEL_FILE_ID = Column(Integer, ForeignKey('SRTN_FILES.FILE_ID'))
    MODEL_PREV1_ID = Column(Integer)
    MODEL_PREV2_ID = Column(Integer)
    
    model_file = relationship("File")


class MultimediaModel(Base):
    __tablename__ = 'SRTN_MULTIMED_3D_MODELS'
    
    MULTIMED_3D_ID = Column(Integer, primary_key=True, autoincrement=True)
    SH_NAME = Column(String(100))
    MULTIMED_FILE_ID = Column(Integer, ForeignKey('SRTN_FILES.FILE_ID'))
    MODEL_ID = Column(Integer, ForeignKey('SRTN_3D_MODELS.MODEL_ID'))
    
    multimedia_file = relationship("File")
    model = relationship("Model3D")


class EkModel3D(Base):
    __tablename__ = 'SRTN_EK_3D_MODELS'
    
    EK_3D_ID = Column(Integer, primary_key=True, autoincrement=True)
    SH_NAME = Column(String(200))
    EK_ID = Column(Integer)
    MODEL_ID = Column(Integer, ForeignKey('SRTN_3D_MODELS.MODEL_ID'))
    
    model = relationship("Model3D")


# ==================== Plant & Units Tables ====================

class Plant(Base):
    __tablename__ = 'UNS_PLANTS'
    
    PLANT_ID = Column(Integer, primary_key=True, autoincrement=True)
    NAME = Column(String(255))


class Unit(Base):
    __tablename__ = 'UNS_UNITS'
    
    UNIT_ID = Column(Integer, primary_key=True, autoincrement=True)
    PLANT_ID = Column(Integer, ForeignKey('UNS_PLANTS.PLANT_ID'))
    NAME = Column(String(255))
    
    plant = relationship("Plant")


# ==================== Acceleration Data Tables ====================

class AccelSet(Base):
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
    PGA = Column(Float)
    PGA_NS = Column(Float)
    PGA_EW = Column(Float)
    PGA_Z = Column(Float)
    SPECTR_EARTHQ_TYPE = Column(String(8))
    CALC_TYPE = Column(String(40))
    
    # Relationships
    plant = relationship("Plant")
    unit = relationship("Unit")


class AccelPlot(Base):
    __tablename__ = 'SRTN_ACCEL_PLOT'
    
    PLOT_ID = Column(Integer, primary_key=True, autoincrement=True)
    AXIS = Column(String(10))
    NAME = Column(String(255))


class AccelPoint(Base):
    __tablename__ = 'SRTN_ACCEL_POINT'
    
    POINT_ID = Column(Integer, primary_key=True, autoincrement=True)
    FREQ = Column(Float)
    ACCEL = Column(Float)
    PLOT_ID = Column(Integer, ForeignKey('SRTN_ACCEL_PLOT.PLOT_ID'))
    
    plot = relationship("AccelPlot")


# ==================== Seismic Data Tables ====================

class EkSeismData(Base):
    __tablename__ = 'SRTN_EK_SEISM_DATA'
    
    # === EXACT COLUMNS FROM DATABASE ===
    EK_ID = Column(Integer, primary_key=True, autoincrement=True)
    EKLIST_ID = Column(Integer)
    EKLIST_NAME = Column(String(255))
    IDEN = Column(String(50))
    NAME = Column(String(255))  # Найменування ЕК
    PLANT_ID = Column(Integer, ForeignKey('UNS_PLANTS.PLANT_ID'))
    PLANT_NAME = Column(String(255))
    UNIT_ID = Column(Integer, ForeignKey('UNS_UNITS.UNIT_ID'))
    UNIT_NAME = Column(String(255))
    EK_CLASS_ID = Column(Integer)
    EK_CLASS_NAME = Column(String(255))
    SEISMO_TXT = Column(String(255))
    PTYPE_ID = Column(Integer)
    PTYPE_TXT = Column(String(255))
    BUILDING = Column(String(100))
    ROOM = Column(String(100))
    LEV = Column(String(50))
    ACCEL_SET_ID_MRZ = Column(Integer)
    M1_MRZ = Column(Float)
    M2_MRZ = Column(Float)
    M1_PZ = Column(Float)
    M2_PZ = Column(Float)
    HCLPF = Column(Float)
    SIGMA_DOP = Column(Float)
    SIGMA_1 = Column(Float)
    SIGMA_2 = Column(Float)
    SIGMA_S_1_MRZ = Column(Float)
    SIGMA_S_2_MRZ = Column(Float)
    SIGMA_S_S1_MRZ = Column(Float)
    SIGMA_S_S2_MRZ = Column(Float)
    SIGMA_S_ALT_1_MRZ = Column(Float)
    SIGMA_S_ALT_2_MRZ = Column(Float)
    SIGMA_S_1_PZ = Column(Float)
    SIGMA_S_2_PZ = Column(Float)
    SIGMA_S_S1_PZ = Column(Float)
    SIGMA_S_S2_PZ = Column(Float)
    SIGMA_S_ALT_1_PZ = Column(Float)
    SIGMA_S_ALT_2_PZ = Column(Float)
    SIGMA_ALT_DOP = Column(Float)
    F_MU = Column(Float)
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
    SAFETY_MARGIN_OK = Column(String(10))
    SEISMIC_STATUS_OK = Column(String(10))
    ACCEL_SET_ID_PZ = Column(Integer)
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
    MAT_NAME = Column(String(255))
    DOC_1 = Column(String(255))
    DOC_2 = Column(String(255))
    
    # Relationships
    plant = relationship("Plant")
    unit = relationship("Unit")


# ==================== Location Tables ====================

class TermLocation(Base):
    __tablename__ = 'SRT_TERMS_LOC'
    
    T_ID = Column(Integer, primary_key=True, autoincrement=True)
    T_NAME = Column(String(255))
    PLANT_ID = Column(Integer, ForeignKey('UNS_PLANTS.PLANT_ID'))
    UNIT_ID = Column(Integer, ForeignKey('UNS_UNITS.UNIT_ID'))
    
    plant = relationship("Plant")
    unit = relationship("Unit")