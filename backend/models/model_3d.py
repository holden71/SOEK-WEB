"""
3D Models ORM models
"""
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

from .base import Base


class Model3D(Base):
    """3D Model"""
    __tablename__ = 'SRTN_3D_MODELS'
    
    MODEL_ID = Column(Integer, primary_key=True, autoincrement=True)
    SH_NAME = Column(String(100))
    DESCR = Column(String(500))
    MODEL_FILE_ID = Column(Integer, ForeignKey('SRTN_FILES.FILE_ID'))
    MODEL_PREV1_ID = Column(Integer)
    MODEL_PREV2_ID = Column(Integer)
    
    model_file = relationship("File")


class MultimediaModel(Base):
    """Multimedia file linked to 3D model"""
    __tablename__ = 'SRTN_MULTIMED_3D_MODELS'
    
    MULTIMED_3D_ID = Column(Integer, primary_key=True, autoincrement=True)
    SH_NAME = Column(String(100))
    MULTIMED_FILE_ID = Column(Integer, ForeignKey('SRTN_FILES.FILE_ID'))
    MODEL_ID = Column(Integer, ForeignKey('SRTN_3D_MODELS.MODEL_ID'))
    
    multimedia_file = relationship("File")
    model = relationship("Model3D")


class EkModel3D(Base):
    """Link between EK (Equipment Class) and 3D Model"""
    __tablename__ = 'SRTN_EK_3D_MODELS'
    
    EK_3D_ID = Column(Integer, primary_key=True, autoincrement=True)
    SH_NAME = Column(String(200))
    EK_ID = Column(Integer)
    MODEL_ID = Column(Integer, ForeignKey('SRTN_3D_MODELS.MODEL_ID'))
    
    model = relationship("Model3D")

