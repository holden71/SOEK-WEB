"""
File and FileType ORM models
"""
from sqlalchemy import Column, Integer, String, LargeBinary, ForeignKey
from sqlalchemy.orm import relationship

from .base import Base


class FileType(Base):
    """File type model"""
    __tablename__ = 'SRTN_FILE_TYPES'
    
    FILE_TYPE_ID = Column(Integer, primary_key=True, autoincrement=True)
    NAME = Column(String(255))
    DESCR = Column(String(500))
    DEF_EXT = Column(String(10))


class File(Base):
    """File model"""
    __tablename__ = 'SRTN_FILES'
    
    FILE_ID = Column(Integer, primary_key=True, autoincrement=True)
    FILE_TYPE_ID = Column(Integer, ForeignKey('SRTN_FILE_TYPES.FILE_TYPE_ID'))
    FILE_NAME = Column(String(255))
    DESCR = Column(String(500))
    DATA = Column(LargeBinary)
    SH_DESCR = Column(String(100))
    
    file_type = relationship("FileType")

