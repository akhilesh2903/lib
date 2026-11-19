from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from app.database.connection import get_db
from app.middleware.auth_middleware import get_current_user, require_librarian_or_admin
from app.utils.helpers import serialize_doc, serialize_docs, generate_unique_id
from app.services.email_service import send_system_notification
from app.services.log_service import log_activity

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("")
def get_user_notifications(current_user: dict = Depends(get_current_user)):
    db = get_db()
    email = current_user.get("email")
    role = current_user.get("role")
    user_id = str(current_user.get("_id"))

    usn = None
    if role == "student":
        student = db["students"].find_one({"$or": [{"user_id": user_id}, {"email": email}]})
        if student:
            usn = student.get("usn")

    query_or = [
        {"recipient_id": user_id},
        {"recipient_email": email},
        {"recipient_role": "all"},
        {"recipient_role": role}
    ]
    if usn:
        query_or.append({"recipient_id": usn})

    notifications = list(db["notifications"].find({"$or": query_or}).sort("created_at", -1).limit(30))
    unread_count = sum(1 for n in notifications if not n.get("is_read", False))

    return {
        "success": True,
        "unread_count": unread_count,
        "data": serialize_docs(notifications)
    }


@router.put("/{notif_id}/read")
def mark_notification_read(notif_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    db["notifications"].update_one(
        {"$or": [{"notification_id": notif_id}, {"_id": notif_id}]},
        {"$set": {"is_read": True}}
    )
    return {"success": True, "message": "Notification marked as read"}


@router.put("/read-all/mark")
def mark_all_read(current_user: dict = Depends(get_current_user)):
    db = get_db()
    email = current_user.get("email")
    db["notifications"].update_many(
        {"recipient_email": email},
        {"$set": {"is_read": True}}
    )
    return {"success": True, "message": "All notifications marked as read"}


@router.post("/broadcast")
def broadcast_notification(payload: dict, current_user: dict = Depends(require_librarian_or_admin)):
    title = payload.get("title", "Library Announcement")
    message = payload.get("message", "")
    target_role = payload.get("target_role", "all")

    if not message:
        raise HTTPException(status_code=400, detail="Notification message cannot be empty")

    db = get_db()
    notif_id = generate_unique_id("NOTIF")
    doc = {
        "_id": notif_id,
        "notification_id": notif_id,
        "recipient_id": "broadcast",
        "recipient_email": "all@aster.edu",
        "recipient_role": target_role,
        "title": title,
        "message": message,
        "type": "system",
        "is_read": False,
        "created_at": datetime.utcnow().isoformat()
    }
    db["notifications"].insert_one(doc)

    log_activity(
        user_id=str(current_user["_id"]),
        user_name=current_user["name"],
        user_role=current_user["role"],
        action="Announcement Broadcast",
        details=f"Broadcast message: '{title}' to {target_role}"
    )

    return {"success": True, "message": "Notification broadcast successfully issued"}
