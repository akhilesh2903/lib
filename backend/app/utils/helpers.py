import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional


def generate_unique_id(prefix: str = "ID") -> str:
    """Generate a clean human-readable unique identifier."""
    rand_str = uuid.uuid4().hex[:6].upper()
    return f"{prefix}-{rand_str}"


def serialize_doc(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Convert Mongo ObjectIds and timestamps to clean JSON-serializable primitives."""
    if not doc:
        return None
    res = {}
    for k, v in doc.items():
        if k == "_id":
            res["id"] = str(v)
            res["_id"] = str(v)
        elif isinstance(v, datetime):
            res[k] = v.isoformat()
        elif isinstance(v, list):
            res[k] = [serialize_doc(i) if isinstance(i, dict) else (str(i) if hasattr(i, "__str__") and "ObjectId" in str(type(i)) else i) for i in v]
        elif hasattr(v, "__str__") and "ObjectId" in str(type(v)):
            res[k] = str(v)
        else:
            res[k] = v
    return res


def serialize_docs(docs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Serialize a list of Mongo documents."""
    return [serialize_doc(d) for d in docs if d is not None]


def calculate_due_date(days: int = 14) -> datetime:
    """Calculate return due date from current UTC time."""
    return datetime.utcnow() + timedelta(days=days)


def calculate_overdue_days(due_date_val) -> int:
    """Calculate number of days past due date (returns 0 if not overdue)."""
    if not due_date_val:
        return 0

    if isinstance(due_date_val, str):
        try:
            # Parse ISO string
            due_dt = datetime.fromisoformat(due_date_val.replace("Z", "+00:00"))
            if due_dt.tzinfo is not None:
                due_dt = due_dt.astimezone(timezone.utc).replace(tzinfo=None)
        except Exception:
            return 0
    elif isinstance(due_date_val, datetime):
        due_dt = due_date_val.replace(tzinfo=None) if due_date_val.tzinfo else due_date_val
    else:
        return 0

    now_utc = datetime.utcnow()
    diff = (now_utc - due_dt).total_seconds()
    if diff > 0:
        return int(diff // 86400) + (1 if (diff % 86400) > 3600 else 0)
    return 0


def calculate_fine_amount(due_date_val, return_date_val=None, rate_per_day: float = 5.0) -> float:
    """Calculate fine amount based on overdue days and rate."""
    if not due_date_val:
        return 0.0

    try:
        if isinstance(due_date_val, str):
            due_dt = datetime.fromisoformat(due_date_val.replace("Z", "+00:00")).replace(tzinfo=None)
        else:
            due_dt = due_date_val.replace(tzinfo=None)

        if return_date_val:
            if isinstance(return_date_val, str):
                ret_dt = datetime.fromisoformat(return_date_val.replace("Z", "+00:00")).replace(tzinfo=None)
            else:
                ret_dt = return_date_val.replace(tzinfo=None)
        else:
            ret_dt = datetime.utcnow()

        diff_seconds = (ret_dt - due_dt).total_seconds()
        if diff_seconds > 0:
            days = int(diff_seconds // 86400)
            if diff_seconds % 86400 > 0:
                days += 1
            return round(days * rate_per_day, 2)
        return 0.0
    except Exception:
        return 0.0
