"""
Database session management
"""
import logging
from contextlib import contextmanager
from typing import Annotated

import oracledb
from fastapi import Depends
from sqlalchemy import URL, create_engine, Engine
from sqlalchemy.exc import DatabaseError
from sqlalchemy.orm import sessionmaker, Session

from .config import settings

logger = logging.getLogger("uvicorn")

# Disable SQLAlchemy logging
logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)


class DbException(Exception):
    """Database exception"""
    pass


class DbSessionManager:
    """Database session manager - singleton для управления подключением к БД"""
    
    _engine: Engine | None = None
    _session_maker: sessionmaker[Session] | None = None

    @classmethod
    def initialize(cls):
        """Initialize database connection"""
        url_object = URL.create(
            drivername=settings.db_drivername,
            username=settings.db_username,
            password=settings.db_password,
            host=settings.db_host,
            port=settings.db_port,
            database=settings.db_name,
        )

        oracledb.init_oracle_client(lib_dir=settings.db_libdir)
        cls._engine = create_engine(url_object, echo=False)
        cls._session_maker = sessionmaker(bind=cls._engine, expire_on_commit=False)

        # Checking whether a connection could be made successfully
        try:
            next(cls.get_session()).connection().close()
        except DatabaseError as e:
            raise DbException(f"Failed to connect DB: {e}") from None

        logger.info("DB connected")

    @classmethod
    def dispose(cls):
        """Dispose database connection"""
        if cls._engine is None:
            return

        cls._engine.dispose()
        cls._engine = None
        cls._session_maker = None
        logger.info("DB disconnected")

    @classmethod
    def get_session(cls):
        """Get database session (generator for dependency injection)"""
        if cls._session_maker is None:
            raise DbException("DB not initialized")

        session = cls._session_maker()
        try:
            yield session
        finally:
            session.close()


# FastAPI dependency for database session
DbSessionDep = Annotated[Session, Depends(DbSessionManager.get_session)]

# Context manager for database session
DbSessionContext = contextmanager(DbSessionManager.get_session)

