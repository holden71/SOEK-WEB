"""
Common Pydantic schemas
"""
from typing import Any, Dict
from pydantic import BaseModel


class SearchData(BaseModel):
    """Search data schema"""
    data: Dict[str, Any]

