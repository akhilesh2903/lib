from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, status
from app.database.connection import get_db
from app.schemas.user import LibrarianCreate, LibrarianUpdate
from app.middleware.auth_middleware import require_admin
from app.utils.security import hash_password
from app.utils.helpers import serialize_doc, serialize_docs
from app.services.log_service import log_activity

router = APIRouter(prefix="/librarians", tags=["Librarians"])


@router.get("")
def get_librarians(current_user: dict = Depends(require_admin)):
    db = get_db()
    librarians = list(db["librarians"].find())
    return {"success": True, "data": serialize_docs(librarians)}


@router.post("", status_code=status.HTTP_201_CREATED)
def create_librarian(payload: LibrarianCreate, current_user: dict = Depends(require_admin)):
    db = get_db()
    emp_id = payload.employee_id.strip().upper()
    existing_emp = db["librarians"].find_one({"employee_id": emp_id})
    if existing_emp:
        raise HTTPException(status_code=400, detail=f"Employee ID '{emp_id}' is already registered")

    existing_email = db["users"].find_one({"email": payload.email.strip().lower()})
    if existing_email:
        raise HTTPException(status_code=400, detail=f"Email '{payload.email}' is already registered")

    user_id = f"usr-lib-{emp_id}"
    user_doc = {
        "_id": user_id,
        "name": payload.name.strip(),
        "email": payload.email.strip().lower(),
        "hashed_password": hash_password(payload.password or "Library@123"),
        "role": "librarian",
        "is_active": True,
        "avatar_url": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
        "must_change_password": True,
        "created_at": datetime.utcnow().isoformat()
    }
    db["users"].insert_one(user_doc)

    lib_doc = {
        "_id": f"lib-rec-{emp_id}",
        "user_id": user_id,
        "employee_id": emp_id,
        "name": payload.name.strip(),
        "email": payload.email.strip().lower(),
        "phone": payload.phone,
        "shift": payload.shift or "Morning",
        "status": "Active",
        "created_at": datetime.utcnow().isoformat()
    }
    db["librarians"].insert_one(lib_doc)

    log_activity(
        user_id=str(current_user.get("_id")),
        user_name=current_user.get("name"),
        user_role=current_user.get("role"),
        action="Librarian Account Created",
        details=f"Created staff account for {payload.name} ({emp_id})"
    )

    return {"success": True, "message": f"Librarian account for '{payload.name}' created successfully", "data": serialize_doc(lib_doc)}


@router.put("/{lib_id}")
def update_librarian(lib_id: str, payload: LibrarianUpdate, current_user: dict = Depends(require_admin)):
    db = get_db()
    librarian = db["librarians"].find_one({
        "$or": [
            {"employee_id": lib_id.strip().upper()},
            {"_id": lib_id.strip()},
            {"user_id": lib_id.strip()}
        ]
    })
    if not librarian:
        raise HTTPException(status_code=404, detail="Librarian record not found")

    update_fields = {}
    for k, v in payload.dict(exclude_unset=True).items():
        if v is not None:
            update_fields[k] = v

    if update_fields:
        update_fields["updated_at"] = datetime.utcnow().isoformat()
        db["librarians"].update_one({"_id": librarian["_id"]}, {"$set": update_fields})

        # Sync changes to user record
        user_sync = {}
        if "name" in update_fields:
            user_sync["name"] = update_fields["name"]
        if "email" in update_fields:
            user_sync["email"] = update_fields["email"]
        if "is_active" in update_fields:
            user_sync["is_active"] = update_fields["is_active"]
        if user_sync:
            db["users"].update_one({"_id": librarian.get("user_id")}, {"$set": user_sync})

    log_activity(
        user_id=str(current_user.get("_id")),
        user_name=current_user.get("name"),
        user_role=current_user.get("role"),
        action="Librarian Updated",
        details=f"Updated details for librarian {librarian.get('name')} ({librarian.get('employee_id')})"
    )

    updated_lib = db["librarians"].find_one({"_id": librarian["_id"]})
    return {"success": True, "message": "Librarian profile updated", "data": serialize_doc(updated_lib)}


@router.delete("/{lib_id}")
def delete_librarian(lib_id: str, current_user: dict = Depends(require_admin)):
    db = get_db()
    librarian = db["librarians"].find_one({
        "$or": [
            {"employee_id": lib_id.strip().upper()},
            {"_id": lib_id.strip()},
            {"user_id": lib_id.strip()}
        ]
    })
    if not librarian:
        raise HTTPException(status_code=404, detail="Librarian record not found")

    db["librarians"].delete_one({"_id": librarian["_id"]})
    db["users"].delete_one({"_id": librarian.get("user_id")})

    log_activity(
        user_id=str(current_user.get("_id")),
        user_name=current_user.get("name"),
        user_role=current_user.get("role"),
        action="Librarian Removed",
        details=f"Decommissioned staff account {librarian.get('name')} ({librarian.get('employee_id')})"
    )

    return {"success": True, "message": f"Librarian account '{librarian.get('name')}' removed successfully"}
