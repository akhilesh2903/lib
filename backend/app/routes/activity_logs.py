from typing import Optional
from fastapi import APIRouter, Query, Depends
from app.database.connection import get_db
from app.middleware.auth_middleware import require_admin
from app.utils.helpers import serialize_docs

router = APIRouter(prefix="/activity-logs", tags=["Activity Logs"])


@router.get("")
def get_activity_logs(
    search: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=25, ge=1, le=100),
    current_user: dict = Depends(require_admin)
):
    db = get_db()
    logs = list(db["activity_logs"].find().sort("timestamp", -1))

    if search:
        q = search.lower().strip()
        logs = [
            l for l in logs
            if q in l.get("action", "").lower()
            or q in l.get("details", "").lower()
            or q in l.get("user_name", "").lower()
            or q in l.get("user_role", "").lower()
        ]

    total_count = len(logs)
    start_idx = (page - 1) * limit
    paged = logs[start_idx:start_idx + limit]

    return {
        "success": True,
        "data": serialize_docs(paged),
        "pagination": {
            "page": page,
            "limit": limit,
            "total_items": total_count,
            "total_pages": max(1, (total_count + limit - 1) // limit)
        }
    }
