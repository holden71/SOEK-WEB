"""
FastAPI dependencies
"""
from core.database import DbSessionDep

# Re-export for convenience
__all__ = ["DbSessionDep"]

