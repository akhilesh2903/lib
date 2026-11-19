from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, status
from app.database.connection import get_db
from app.schemas.circulation import ReservationRequest
from app.middleware.auth_middleware import get_current_user, require_librarian_or_admin
from app.utils.helpers import serialize_doc, serialize_docs, generate_unique_id
from app.services.log_service import log_activity
from app.services.email_service import send_system_notification

router = APIRouter(prefix="/reservations", tags=["Reservations"])


@router.post("/request", status_code=status.HTTP_201_CREATED)
def request_reservation(payload: ReservationRequest, current_user: dict = Depends(get_current_user)):
    db = get_db()
    # Identify student
    student = db["students"].find_one({"$or": [{"user_id": current_user["_id"]}, {"email": current_user["email"]}]})
    if not student:
        raise HTTPException(status_code=400, detail="Only registered students can reserve books")

    book = db["books"].find_one({
        "$or": [
            {"book_id": payload.book_id.strip()},
            {"_id": payload.book_id.strip()},
            {"isbn": payload.book_id.strip()}
        ]
    })
    if not book:
        raise HTTPException(status_code=404, detail="Book not found in library catalog")

    # Check if existing pending or approved reservation exists
    existing = db["reservations"].find_one({
        "student_usn": student.get("usn"),
        "book_id": book.get("book_id"),
        "status": {"$in": ["pending", "approved"]}
    })
    if existing:
        raise HTTPException(status_code=400, detail=f"You already have an active reservation for '{book.get('title')}'")

    res_id = f"RES-{datetime.utcnow().year}-{generate_unique_id('')[1:]}"
    res_doc = {
        "_id": res_id,
        "reservation_id": res_id,
        "student_id": str(student.get("_id")),
        "student_usn": student.get("usn"),
        "student_name": student.get("name"),
        "book_id": book.get("book_id"),
        "book_title": book.get("title"),
        "request_date": datetime.utcnow().isoformat(),
        "status": "pending",
        "notes": payload.notes or "Student hold request",
        "notified_at": None,
        "created_at": datetime.utcnow().isoformat()
    }
    db["reservations"].insert_one(res_doc)

    log_activity(
        user_id=str(current_user["_id"]),
        user_name=current_user["name"],
        user_role=current_user["role"],
        action="Book Reserved",
        details=f"Reservation requested for '{book.get('title')}' by {student.get('name')}"
    )

    return {"success": True, "message": f"Reservation placed for '{book.get('title')}'. You will be notified when ready.", "data": serialize_doc(res_doc)}


@router.get("")
def get_reservations(current_user: dict = Depends(get_current_user)):
    db = get_db()
    if current_user.get("role") == "student":
        student = db["students"].find_one({"$or": [{"user_id": current_user["_id"]}, {"email": current_user["email"]}]})
        usn = student.get("usn") if student else "NONE"
        reservations = list(db["reservations"].find({"student_usn": usn}).sort("created_at", -1))
    else:
        reservations = list(db["reservations"].find().sort("created_at", -1))

    return {"success": True, "data": serialize_docs(reservations)}


@router.put("/{res_id}/status")
def update_reservation_status(res_id: str, status_payload: dict, current_user: dict = Depends(require_librarian_or_admin)):
    new_status = status_payload.get("status")
    if new_status not in ("pending", "approved", "fulfilled", "cancelled"):
        raise HTTPException(status_code=400, detail="Invalid reservation status")

    db = get_db()
    res = db["reservations"].find_one({"$or": [{"reservation_id": res_id}, {"_id": res_id}]})
    if not res:
        raise HTTPException(status_code=404, detail="Reservation not found")

    update_fields = {"status": new_status, "updated_at": datetime.utcnow().isoformat()}
    if new_status == "approved":
        update_fields["notified_at"] = datetime.utcnow().isoformat()

    db["reservations"].update_one({"_id": res["_id"]}, {"$set": update_fields})

    # Dispatch notification to student
    student = db["students"].find_one({"usn": res.get("student_usn")})
    if student:
        msg = f"Your reservation request for '{res.get('book_title')}' has been updated to: {new_status.upper()}."
        if new_status == "approved":
            msg += " The book is on hold at the circulation desk. Please collect it within 48 hours."
        send_system_notification(
            recipient_email=student.get("email"),
            subject=f"Reservation {new_status.capitalize()}: {res.get('book_title')}",
            message=msg,
            recipient_id=student.get("usn"),
            recipient_role="student",
            notif_type="reservation"
        )

    log_activity(
        user_id=str(current_user["_id"]),
        user_name=current_user["name"],
        user_role=current_user["role"],
        action="Reservation Status Changed",
        details=f"Reservation {res_id} marked as {new_status}"
    )

    return {"success": True, "message": f"Reservation updated to '{new_status}'"}
