from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from app.database.connection import get_db
from app.schemas.circulation import SystemSettingsUpdate
from app.middleware.auth_middleware import require_admin, get_current_user
from app.utils.helpers import serialize_doc
from app.services.log_service import log_activity

router = APIRouter(prefix="/settings", tags=["System Settings"])


@router.get("")
def get_settings():
    db = get_db()
    settings = db["system_settings"].find_one()
    if not settings:
        settings = {
            "_id": "SYS-SETTINGS-01",
            "borrowing_duration_days": 14,
            "fine_per_day": 5.0,
            "max_books_per_student": 4,
            "renewal_limit": 2,
            "library_name": "Aster College Central Library",
            "email_alerts_enabled": True,
            "academic_year": "2024 - 25",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        db["system_settings"].insert_one(settings)
    return {"success": True, "data": serialize_doc(settings)}


@router.put("")
def update_settings(payload: SystemSettingsUpdate, current_user: dict = Depends(require_admin)):
    db = get_db()
    settings = db["system_settings"].find_one()
    if not settings:
        get_settings()
        settings = db["system_settings"].find_one()

    update_fields = {}
    for k, v in payload.dict(exclude_unset=True).items():
        if v is not None:
            update_fields[k] = v

    if update_fields:
        update_fields["updated_at"] = datetime.utcnow().isoformat()
        db["system_settings"].update_one({"_id": settings["_id"]}, {"$set": update_fields})

    log_activity(
        user_id=str(current_user["_id"]),
        user_name=current_user["name"],
        user_role=current_user["role"],
        action="System Settings Updated",
        details=f"Modified system circulation and fine parameters: {list(update_fields.keys())}"
    )

    updated = db["system_settings"].find_one({"_id": settings["_id"]})
    return {"success": True, "message": "System settings updated successfully", "data": serialize_doc(updated)}
