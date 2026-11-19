# backend/app/database/__init__.py
from .connection import get_db, init_db, is_connected_to_atlas

__all__ = ["get_db", "init_db", "is_connected_to_atlas"]
