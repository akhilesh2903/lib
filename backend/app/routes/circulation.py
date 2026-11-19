from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Depends, status
from app.database.connection import get_db
from app.schemas.circulation import IssueBookRequest, ReturnBookRequest, RenewBookRequest
from app.middleware.auth_middleware import get_current_user, require_librarian_or_admin
from app.utils.helpers import serialize_doc, serialize_docs, generate_unique_id, calculate_overdue_days, calculate_fine_amount
from app.services.log_service import log_activity
from app.services.email_service import send_system_notification

router = APIRouter(prefix="/circulation", tags=["Circulation"])


@router.post("/issue", status_code=status.HTTP_201_CREATED)
def issue_book(payload: IssueBookRequest, current_user: dict = Depends(require_librarian_or_admin)):
    db = get_db()
    usn = payload.student_usn.strip().upper()
    book_id_or_isbn = payload.book_id.strip()

    # 1. Verify Student
    student = db["students"].find_one({"usn": {"$regex": f"^{usn}$", "$options": "i"}})
    if not student:
        raise HTTPException(status_code=404, detail=f"No registered student found with USN '{usn}'")

    # Check student active borrow limit
    system_settings = db["system_settings"].find_one() or {}
    max_allowed = student.get("max_books_allowed") or system_settings.get("max_books_per_student", 4)
    active_count = db["book_transactions"].count_documents({
        "student_usn": usn,
        "status": {"$in": ["issued", "overdue"]}
    })
    if active_count >= max_allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Student {student.get('name')} (USN: {usn}) has reached the maximum borrowing limit of {max_allowed} books."
        )

    # 2. Verify Book
    book = db["books"].find_one({
        "$or": [
            {"book_id": book_id_or_isbn},
            {"_id": book_id_or_isbn},
            {"isbn": book_id_or_isbn}
        ]
    })
    if not book:
        raise HTTPException(status_code=404, detail=f"Book '{book_id_or_isbn}' not found in inventory")

    if book.get("available_quantity", 0) <= 0:
        raise HTTPException(
            status_code=400,
            detail=f"All copies of '{book.get('title')}' are currently issued out. Available: 0/{book.get('total_quantity', 0)}"
        )

    # Check if student already has an active copy of this exact book
    already_has = db["book_transactions"].find_one({
        "student_usn": usn,
        "book_id": book.get("book_id"),
        "status": {"$in": ["issued", "overdue"]}
    })
    if already_has:
        raise HTTPException(status_code=400, detail=f"Student already has an active issued copy of '{book.get('title')}'.")

    # 3. Calculate Due Date
    borrow_duration = system_settings.get("borrowing_duration_days", 14)
    if payload.custom_due_date:
        try:
            due_dt = datetime.fromisoformat(payload.custom_due_date.replace("Z", "+00:00"))
        except Exception:
            due_dt = datetime.utcnow() + timedelta(days=borrow_duration)
    else:
        due_dt = datetime.utcnow() + timedelta(days=borrow_duration)

    now = datetime.utcnow()
    txn_id = f"TXN-{now.year}-{generate_unique_id('')[1:]}"

    transaction_record = {
        "_id": txn_id,
        "transaction_id": txn_id,
        "student_id": str(student.get("_id")),
        "student_usn": student.get("usn"),
        "student_name": student.get("name"),
        "book_id": book.get("book_id"),
        "book_title": book.get("title"),
        "librarian_id": str(current_user.get("_id")),
        "librarian_name": current_user.get("name"),
        "issue_date": now.isoformat(),
        "due_date": due_dt.isoformat(),
        "return_date": None,
        "status": "issued",
        "fine_amount": 0.0,
        "fine_paid": False,
        "notes": payload.notes or "Standard checkout",
        "created_at": now.isoformat()
    }

    db["book_transactions"].insert_one(transaction_record)

    # 4. Update book inventory
    db["books"].update_one(
        {"_id": book["_id"]},
        {"$inc": {"available_quantity": -1, "issued_quantity": 1}}
    )

    # 5. Update student record
    db["students"].update_one(
        {"_id": student["_id"]},
        {"$inc": {"active_borrows_count": 1}}
    )

    # 6. Notify Student
    send_system_notification(
        recipient_email=student.get("email"),
        subject=f"Book Issued: {book.get('title')}",
        message=f"Hello {student.get('name')}, '{book.get('title')}' has been issued to you. Please return on or before {due_dt.strftime('%d %B %Y')}.",
        recipient_id=student.get("usn"),
        recipient_role="student",
        notif_type="issue"
    )

    # 7. Audit log
    log_activity(
        user_id=str(current_user.get("_id")),
        user_name=current_user.get("name"),
        user_role=current_user.get("role"),
        action="Book Issued",
        details=f"Issued '{book.get('title')}' to {student.get('name')} ({student.get('usn')})"
    )

    return {
        "success": True,
        "message": f"Book '{book.get('title')}' successfully issued to {student.get('name')}",
        "data": serialize_doc(transaction_record)
    }


@router.post("/return")
def return_book(payload: ReturnBookRequest, current_user: dict = Depends(require_librarian_or_admin)):
    db = get_db()
    system_settings = db["system_settings"].find_one() or {}
    fine_rate = system_settings.get("fine_per_day", 5.0)

    # Locate active transaction
    query = {"status": {"$in": ["issued", "overdue"]}}
    if payload.transaction_id:
        query["$or"] = [{"transaction_id": payload.transaction_id.strip()}, {"_id": payload.transaction_id.strip()}]
    elif payload.student_usn and payload.book_id:
        query["student_usn"] = {"$regex": f"^{payload.student_usn.strip()}$", "$options": "i"}
        query["book_id"] = payload.book_id.strip()
    else:
        raise HTTPException(status_code=400, detail="Please provide a transaction_id or both student_usn and book_id")

    transaction = db["book_transactions"].find_one(query)
    if not transaction:
        raise HTTPException(status_code=404, detail="No active borrowing transaction found matching the criteria")

    now = datetime.utcnow()
    due_date_str = transaction.get("due_date")
    overdue_days = calculate_overdue_days(due_date_str)
    fine_amount = calculate_fine_amount(due_date_str, now, rate_per_day=fine_rate)

    fine_collected = payload.fine_collected or 0.0
    fine_paid = (fine_collected >= fine_amount) if fine_amount > 0 else True

    # 1. Update Transaction
    update_data = {
        "return_date": now.isoformat(),
        "status": "returned",
        "fine_amount": fine_amount,
        "fine_paid": fine_paid,
        "returned_to_librarian_id": str(current_user.get("_id")),
        "returned_to_librarian_name": current_user.get("name"),
        "notes": payload.notes or transaction.get("notes")
    }
    db["book_transactions"].update_one({"_id": transaction["_id"]}, {"$set": update_data})

    # 2. Record Fine if overdue
    fine_record = None
    if fine_amount > 0:
        fine_id = f"FINE-{now.year}-{generate_unique_id('')[1:]}"
        fine_record = {
            "_id": fine_id,
            "fine_id": fine_id,
            "transaction_id": transaction.get("transaction_id"),
            "student_usn": transaction.get("student_usn"),
            "student_name": transaction.get("student_name"),
            "book_title": transaction.get("book_title"),
            "amount": fine_amount,
            "days_overdue": overdue_days,
            "status": "paid" if fine_paid else "unpaid",
            "paid_at": now.isoformat() if fine_paid else None,
            "collected_by": current_user.get("name") if fine_paid else None,
            "created_at": now.isoformat()
        }
        db["fines"].insert_one(fine_record)

    # 3. Update Book Inventory
    db["books"].update_one(
        {"book_id": transaction.get("book_id")},
        {"$inc": {"available_quantity": 1, "issued_quantity": -1}}
    )

    # 4. Update Student Active Borrow Count
    db["students"].update_one(
        {"usn": transaction.get("student_usn")},
        {"$inc": {"active_borrows_count": -1}}
    )

    # 5. Notify Student
    student = db["students"].find_one({"usn": transaction.get("student_usn")})
    if student:
        fine_msg = f" Overdue fine assessed: ₹{fine_amount} ({'Paid' if fine_paid else 'Pending'})." if fine_amount > 0 else ""
        send_system_notification(
            recipient_email=student.get("email"),
            subject=f"Book Returned: {transaction.get('book_title')}",
            message=f"Thank you {student.get('name')}. '{transaction.get('book_title')}' has been successfully returned.{fine_msg}",
            recipient_id=student.get("usn"),
            recipient_role="student",
            notif_type="return"
        )

    # 6. Audit Log
    log_activity(
        user_id=str(current_user.get("_id")),
        user_name=current_user.get("name"),
        user_role=current_user.get("role"),
        action="Book Returned",
        details=f"Received '{transaction.get('book_title')}' from {transaction.get('student_name')}. Overdue fine: ₹{fine_amount}"
    )

    return {
        "success": True,
        "message": f"Book '{transaction.get('book_title')}' successfully returned",
        "data": {
            "transaction_id": transaction.get("transaction_id"),
            "return_date": now.isoformat(),
            "days_overdue": overdue_days,
            "fine_amount": fine_amount,
            "fine_paid": fine_paid
        }
    }


@router.post("/renew")
def renew_book(payload: RenewBookRequest, current_user: dict = Depends(require_librarian_or_admin)):
    db = get_db()
    system_settings = db["system_settings"].find_one() or {}
    renewal_days = payload.additional_days or system_settings.get("borrowing_duration_days", 14)

    transaction = db["book_transactions"].find_one({
        "$or": [{"transaction_id": payload.transaction_id}, {"_id": payload.transaction_id}],
        "status": {"$in": ["issued", "overdue"]}
    })
    if not transaction:
        raise HTTPException(status_code=404, detail="Active transaction not found for renewal")

    new_due_dt = datetime.utcnow() + timedelta(days=renewal_days)
    db["book_transactions"].update_one(
        {"_id": transaction["_id"]},
        {"$set": {"due_date": new_due_dt.isoformat(), "status": "issued", "updated_at": datetime.utcnow().isoformat()}}
    )

    log_activity(
        user_id=str(current_user.get("_id")),
        user_name=current_user.get("name"),
        user_role=current_user.get("role"),
        action="Book Renewed",
        details=f"Extended due date for '{transaction.get('book_title')}' to {new_due_dt.strftime('%d %b %Y')}"
    )

    return {
        "success": True,
        "message": f"Borrowing period renewed until {new_due_dt.strftime('%d %B %Y')}",
        "new_due_date": new_due_dt.isoformat()
    }


@router.get("/active")
def get_active_circulation():
    db = get_db()
    active_txns = list(db["book_transactions"].find({"status": {"$in": ["issued", "overdue"]}}))
    enriched = []
    now = datetime.utcnow()

    for tx in active_txns:
        due_str = tx.get("due_date")
        overdue_days = calculate_overdue_days(due_str)
        remaining_days = 0
        if due_str and overdue_days == 0:
            try:
                due_dt = datetime.fromisoformat(due_str.replace("Z", "+00:00")).replace(tzinfo=None)
                remaining_days = max(0, int((due_dt - now).total_seconds() // 86400))
            except Exception:
                pass

        enriched.append({
            **serialize_doc(tx),
            "days_overdue": overdue_days,
            "remaining_days": remaining_days,
            "is_overdue": overdue_days > 0,
            "calculated_fine": overdue_days * 5.0
        })

    enriched.sort(key=lambda x: x.get("due_date", ""))
    return {"success": True, "data": enriched}


@router.get("/overdue")
def get_overdue_books():
    db = get_db()
    active_txns = list(db["book_transactions"].find({"status": {"$in": ["issued", "overdue"]}}))
    overdue_list = []

    for tx in active_txns:
        days = calculate_overdue_days(tx.get("due_date"))
        if days > 0:
            overdue_list.append({
                **serialize_doc(tx),
                "days_overdue": days,
                "fine_amount": round(days * 5.0, 2)
            })

    overdue_list.sort(key=lambda x: x.get("days_overdue", 0), reverse=True)
    return {"success": True, "data": overdue_list}


@router.get("/history")
def get_circulation_history(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100)
):
    db = get_db()
    all_tx = list(db["book_transactions"].find().sort("created_at", -1))
    total_count = len(all_tx)
    start_idx = (page - 1) * limit
    paged = all_tx[start_idx:start_idx + limit]

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
