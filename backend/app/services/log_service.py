from datetime import datetime
from typing import Optional
from app.database.connection import get_db
from app.utils.helpers import generate_unique_id


def log_activity(
    user_id: str,
    user_name: str,
    user_role: str,
    action: str,
    details: str,
    ip_address: Optional[str] = "127.0.0.1"
):
    try:
        db = get_db()
        db["activity_logs"].insert_one({
            "log_id": generate_unique_id("LOG"),
            "user_id": user_id,
            "user_name": user_name,
            "user_role": user_role,
            "action": action,
            "details": details,
            "ip_address": ip_address,
            "timestamp": datetime.utcnow().isoformat(),
            "created_at": datetime.utcnow().isoformat()
        })
    except Exception as e:
        print(f"Error logging activity: {e}")
