from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Depends, status
from app.database.connection import get_db
from app.schemas.user import StudentCreate, StudentUpdate
from app.middleware.auth_middleware import get_current_user, require_librarian_or_admin, require_admin
from app.utils.security import hash_password
from app.utils.helpers import serialize_doc, serialize_docs, calculate_overdue_days
from app.services.log_service import log_activity

router = APIRouter(prefix="/students", tags=["Students"])


@router.get("")
def get_students(
    search: Optional[str] = None,
    department: Optional[str] = None,
    semester: Optional[int] = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: dict = Depends(require_librarian_or_admin)
):
    db = get_db()
    students = list(db["students"].find())

    filtered = []
    for s in students:
        if search:
            q = search.lower().strip()
            name_m = q in s.get("name", "").lower()
            usn_m = q in s.get("usn", "").lower()
            dept_m = q in s.get("department", "").lower()
            email_m = q in s.get("email", "").lower()
            if not (name_m or usn_m or dept_m or email_m):
                continue

        if department and department.lower() != "all":
            if s.get("department", "").lower() != department.lower():
                continue

        if semester:
            if s.get("semester") != semester:
                continue

        # Enrich active borrow count
        active_borrows = db["book_transactions"].count_documents({
            "student_usn": s.get("usn"),
            "status": {"$in": ["issued", "overdue"]}
        })
        s["active_borrows_count"] = active_borrows

        filtered.append(s)

    filtered.sort(key=lambda x: x.get("name", ""))
    total_count = len(filtered)
    start_idx = (page - 1) * limit
    paged = filtered[start_idx:start_idx + limit]

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


@router.get("/{usn_or_id}")
def get_student_details(usn_or_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    # Check permission: student can only view their own profile, admin/librarian can view any
    if current_user.get("role") == "student":
        student_me = db["students"].find_one({"$or": [{"user_id": current_user["_id"]}, {"email": current_user["email"]}]})
        if not student_me or (student_me.get("usn") != usn_or_id and student_me.get("_id") != usn_or_id):
            raise HTTPException(status_code=403, detail="Students can only access their own student records")

    student = db["students"].find_one({
        "$or": [
            {"usn": {"$regex": f"^{usn_or_id.strip()}$", "$options": "i"}},
            {"_id": usn_or_id.strip()},
            {"user_id": usn_or_id.strip()}
        ]
    })
    if not student:
        raise HTTPException(status_code=404, detail=f"Student record '{usn_or_id}' not found")

    usn = student.get("usn")
    # Fetch active borrowings and full history
    transactions = list(db["book_transactions"].find({"student_usn": usn}).sort("created_at", -1))
    fines = list(db["fines"].find({"student_usn": usn}))
    reservations = list(db["reservations"].find({"student_usn": usn}))

    active_items = []
    past_items = []
    for tx in transactions:
        if tx.get("status") in ("issued", "overdue"):
            active_items.append({
                **serialize_doc(tx),
                "days_overdue": calculate_overdue_days(tx.get("due_date"))
            })
        else:
            past_items.append(serialize_doc(tx))

    res = serialize_doc(student)
    res["active_borrowings"] = active_items
    res["history"] = past_items
    res["fines"] = serialize_docs(fines)
    res["reservations"] = serialize_docs(reservations)

    return {"success": True, "data": res}


@router.post("", status_code=status.HTTP_201_CREATED)
def create_student(payload: StudentCreate, current_user: dict = Depends(require_librarian_or_admin)):
    db = get_db()
    usn = payload.usn.strip().upper()
    existing_usn = db["students"].find_one({"usn": usn})
    if existing_usn:
        raise HTTPException(status_code=400, detail=f"Student with USN '{usn}' is already registered")

    existing_email = db["users"].find_one({"email": payload.email.strip().lower()})
    if existing_email:
        raise HTTPException(status_code=400, detail=f"Email '{payload.email}' is already registered in the system")

    user_id = f"usr-std-{usn}"
    avatar = payload.profile_picture or "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"
    user_doc = {
        "_id": user_id,
        "name": payload.name.strip(),
        "email": payload.email.strip().lower(),
        "hashed_password": hash_password(payload.password or "Student@123"),
        "role": "student",
        "is_active": True,
        "avatar_url": avatar,
        "must_change_password": True,
        "created_at": datetime.utcnow().isoformat()
    }
    db["users"].insert_one(user_doc)

    student_doc = {
        "_id": f"std-rec-{usn}",
        "user_id": user_id,
        "usn": usn,
        "name": payload.name.strip(),
        "email": payload.email.strip().lower(),
        "department": payload.department.strip(),
        "semester": payload.semester,
        "phone": payload.phone,
        "profile_picture": avatar,
        "max_books_allowed": payload.max_books_allowed or 4,
        "active_borrows_count": 0,
        "created_at": datetime.utcnow().isoformat()
    }
    db["students"].insert_one(student_doc)

    log_activity(
        user_id=str(current_user.get("_id")),
        user_name=current_user.get("name"),
        user_role=current_user.get("role"),
        action="Student Registered",
        details=f"Registered student {student_doc['name']} ({usn}) in {student_doc['department']}"
    )

    return {"success": True, "message": f"Student '{student_doc['name']}' registered successfully", "data": serialize_doc(student_doc)}


@router.put("/{usn_or_id}")
def update_student(usn_or_id: str, payload: StudentUpdate, current_user: dict = Depends(require_librarian_or_admin)):
    db = get_db()
    student = db["students"].find_one({
        "$or": [
            {"usn": {"$regex": f"^{usn_or_id.strip()}$", "$options": "i"}},
            {"_id": usn_or_id.strip()}
        ]
    })
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    update_fields = {}
    for k, v in payload.dict(exclude_unset=True).items():
        if v is not None:
            update_fields[k] = v

    if update_fields:
        update_fields["updated_at"] = datetime.utcnow().isoformat()
        db["students"].update_one({"_id": student["_id"]}, {"$set": update_fields})

        # Also sync name, avatar, email to users collection
        user_sync = {}
        if "name" in update_fields:
            user_sync["name"] = update_fields["name"]
        if "email" in update_fields:
            user_sync["email"] = update_fields["email"]
        if "profile_picture" in update_fields:
            user_sync["avatar_url"] = update_fields["profile_picture"]
        if "is_active" in update_fields:
            user_sync["is_active"] = update_fields["is_active"]

        if user_sync:
            db["users"].update_one({"_id": student.get("user_id")}, {"$set": user_sync})

    log_activity(
        user_id=str(current_user.get("_id")),
        user_name=current_user.get("name"),
        user_role=current_user.get("role"),
        action="Student Updated",
        details=f"Updated profile for student {student.get('name')} ({student.get('usn')})"
    )

    updated_std = db["students"].find_one({"_id": student["_id"]})
    return {"success": True, "message": "Student information updated successfully", "data": serialize_doc(updated_std)}


@router.delete("/{usn_or_id}")
def delete_student(usn_or_id: str, current_user: dict = Depends(require_admin)):
    db = get_db()
    student = db["students"].find_one({
        "$or": [
            {"usn": {"$regex": f"^{usn_or_id.strip()}$", "$options": "i"}},
            {"_id": usn_or_id.strip()}
        ]
    })
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Prevent deletion if student has active borrowed books
    active_borrows = db["book_transactions"].count_documents({
        "student_usn": student.get("usn"),
        "status": {"$in": ["issued", "overdue"]}
    })
    if active_borrows > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete student {student.get('name')}: {active_borrows} book(s) are currently issued to them."
        )

    db["students"].delete_one({"_id": student["_id"]})
    db["users"].delete_one({"_id": student.get("user_id")})

    log_activity(
        user_id=str(current_user.get("_id")),
        user_name=current_user.get("name"),
        user_role=current_user.get("role"),
        action="Student Deleted",
        details=f"Removed student account {student.get('name')} ({student.get('usn')})"
    )

    return {"success": True, "message": f"Student '{student.get('name')}' removed successfully"}
