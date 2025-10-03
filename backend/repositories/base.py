"""
Base repository with generic CRUD operations
"""
from typing import Generic, TypeVar, Type, Optional, List, Any
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from core.exceptions import DatabaseException, NotFoundException

ModelType = TypeVar("ModelType")


class BaseRepository(Generic[ModelType]):
    """Base repository with generic CRUD operations"""
    
    def __init__(self, model: Type[ModelType]):
        self.model = model
    
    def get_by_id(self, db: Session, id: Any) -> Optional[ModelType]:
        """Get entity by ID"""
        try:
            return db.query(self.model).filter(
                getattr(self.model, self._get_primary_key()) == id
            ).first()
        except SQLAlchemyError as e:
            raise DatabaseException(f"Error getting {self.model.__name__} by ID: {str(e)}")
    
    def get_all(self, db: Session, skip: int = 0, limit: int = 100) -> List[ModelType]:
        """Get all entities with pagination"""
        try:
            return db.query(self.model).offset(skip).limit(limit).all()
        except SQLAlchemyError as e:
            raise DatabaseException(f"Error getting all {self.model.__name__}: {str(e)}")
    
    def create(self, db: Session, **kwargs) -> ModelType:
        """Create new entity"""
        try:
            obj = self.model(**kwargs)
            db.add(obj)
            db.flush()
            return obj
        except SQLAlchemyError as e:
            raise DatabaseException(f"Error creating {self.model.__name__}: {str(e)}")
    
    def update(self, db: Session, id: Any, **kwargs) -> ModelType:
        """Update entity by ID"""
        try:
            obj = self.get_by_id(db, id)
            if not obj:
                raise NotFoundException(f"{self.model.__name__} with ID {id} not found")
            
            for key, value in kwargs.items():
                if hasattr(obj, key) and value is not None:
                    setattr(obj, key, value)
            
            db.flush()
            return obj
        except NotFoundException:
            raise
        except SQLAlchemyError as e:
            raise DatabaseException(f"Error updating {self.model.__name__}: {str(e)}")
    
    def delete(self, db: Session, id: Any) -> None:
        """Delete entity by ID"""
        try:
            obj = self.get_by_id(db, id)
            if not obj:
                raise NotFoundException(f"{self.model.__name__} with ID {id} not found")
            
            db.delete(obj)
            db.flush()
        except NotFoundException:
            raise
        except SQLAlchemyError as e:
            raise DatabaseException(f"Error deleting {self.model.__name__}: {str(e)}")
    
    def _get_primary_key(self) -> str:
        """Get primary key column name"""
        return self.model.__table__.primary_key.columns.keys()[0]

