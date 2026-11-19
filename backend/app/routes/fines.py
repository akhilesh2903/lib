from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from app.database.connection import get_db
from app.schemas.circulation import PayFineRequest
from app.middleware.auth_middleware import get_current_user, require_librarian_or_admin
from app.utils.helpers import serialize_doc, serialize_docs
from app.services.log_service import log_activity
from app.services.email_service import send_system_notification

router = APIRouter(prefix="/fines", tags=["Fines"])


@router.get("")
def get_fines(status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    db = get_db()
    query = {}
    if current_user.get("role") == "student":
        student = db["students"].find_one({"$or": [{"user_id": current_user["_id"]}, {"email": current_user["email"]}]})
        usn = student.get("usn") if student else "NONE"
        query["student_usn"] = usn

    if status and status.lower() != "all":
        query["status"] = status.lower()

    fines = list(db["fines"].find(query).sort("created_at", -1))
    
    total_amount = sum(f.get("amount", 0) for f in fines)
    paid_amount = sum(f.get("amount", 0) for f in fines if f.get("status") == "paid")
    unpaid_amount = sum(f.get("amount", 0) for f in fines if f.get("status") == "unpaid")

    return {
        "success": True,
        "data": serialize_docs(fines),
        "summary": {
            "total_fines_count": len(fines),
            "total_amount": round(total_amount, 2),
            "paid_amount": round(paid_amount, 2),
            "unpaid_amount": round(unpaid_amount, 2)
        }
    }


@router.post("/{fine_identifier}/pay")
def pay_fine(fine_identifier: str, payload: PayFineRequest, current_user: dict = Depends(require_librarian_or_admin)):
    db = get_db()
    fine = db["fines"].find_one({
        "$or": [
            {"fine_id": fine_identifier.strip()},
            {"_id": fine_identifier.strip()}
        ]
    })
    if not fine:
        raise HTTPException(status_code=404, detail="Fine record not found")

    if fine.get("status") == "paid":
        return {"success": True, "message": "Fine has already been recorded as paid", "data": serialize_doc(fine)}

    now = datetime.utcnow()
    db["fines"].update_one(
        {"_id": fine["_id"]},
        {"$set": {
            "status": "paid",
            "paid_at": now.isoformat(),
            "collected_by": current_user.get("name"),
            "payment_mode": payload.payment_mode or "Cash",
            "reference_number": payload.reference_number
        }}
    )

    # Sync with transaction record if exists
    if fine.get("transaction_id"):
        db["book_transactions"].update_one(
            {"transaction_id": fine.get("transaction_id")},
            {"$set": {"fine_paid": True}}
        )

    # Notify student
    student = db["students"].find_one({"usn": fine.get("student_usn")})
    if student:
        send_system_notification(
            recipient_email=student.get("email"),
            subject="Fine Payment Receipt",
            message=f"Fine payment of ₹{fine.get('amount')} for '{fine.get('book_title')}' has been acknowledged and marked as settled.",
            recipient_id=student.get("usn"),
            recipient_role="student",
            notif_type="system"
        )

    log_activity(
        user_id=str(current_user["_id"]),
        user_name=current_user["name"],
        user_role=current_user["role"],
        action="Fine Collected",
        details=f"Collected fine ₹{fine.get('amount')} from {fine.get('student_name')} via {payload.payment_mode}"
    )

    updated_fine = db["fines"].find_one({"_id": fine["_id"]})
    return {"success": True, "message": "Fine payment recorded successfully", "data": serialize_doc(updated_fine)}
