from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Depends, Response
from app.database.connection import get_db
from app.middleware.auth_middleware import require_librarian_or_admin
from app.services.report_service import generate_pdf_report, generate_excel_report
from app.utils.helpers import calculate_overdue_days

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/summary")
def get_reports_summary(current_user: dict = Depends(require_librarian_or_admin)):
    db = get_db()
    books = list(db["books"].find())
    students = list(db["students"].find())
    transactions = list(db["book_transactions"].find())
    fines = list(db["fines"].find())

    # Department borrowing distribution
    dept_distribution = {}
    for tx in transactions:
        student = db["students"].find_one({"usn": tx.get("student_usn")})
        dept = student.get("department", "General") if student else "General"
        dept_distribution[dept] = dept_distribution.get(dept, 0) + 1

    dept_stats = [{"department": d, "borrows": count} for d, count in sorted(dept_distribution.items(), key=lambda x: x[1], reverse=True)]

    # Most borrowed books
    book_borrow_counts = {}
    for tx in transactions:
        b_title = tx.get("book_title", "Unknown")
        book_borrow_counts[b_title] = book_borrow_counts.get(b_title, 0) + 1

    popular_books = [{"title": title, "issues": count} for title, count in sorted(book_borrow_counts.items(), key=lambda x: x[1], reverse=True)[:5]]

    return {
        "success": True,
        "data": {
            "department_borrows": dept_stats,
            "most_borrowed_books": popular_books,
            "total_transactions": len(transactions),
            "total_fines_levied": sum(f.get("amount", 0) for f in fines),
            "total_fines_collected": sum(f.get("amount", 0) for f in fines if f.get("status") == "paid")
        }
    }


@router.get("/export/pdf")
def export_pdf_report(
    report_type: str = Query(default="transactions", pattern="^(transactions|inventory|overdue|fines)$"),
    current_user: dict = Depends(require_librarian_or_admin)
):
    db = get_db()
    headers = []
    rows = []
    title = "Library Report"

    if report_type == "transactions":
        title = "Circulation Transactions Audit Report"
        headers = ["Txn ID", "Student USN", "Student Name", "Book Title", "Issue Date", "Due Date", "Status"]
        txns = list(db["book_transactions"].find().sort("created_at", -1).limit(100))
        for t in txns:
            rows.append([
                t.get("transaction_id"),
                t.get("student_usn"),
                t.get("student_name"),
                t.get("book_title")[:25],
                (t.get("issue_date") or "")[:10],
                (t.get("due_date") or "")[:10],
                t.get("status", "").upper()
            ])

    elif report_type == "inventory":
        title = "Complete Book Inventory Catalog"
        headers = ["Book ID", "ISBN", "Title", "Author", "Category", "Total", "Avail", "Shelf"]
        books = list(db["books"].find().sort("title", 1))
        for b in books:
            rows.append([
                b.get("book_id"),
                b.get("isbn"),
                b.get("title")[:28],
                b.get("author")[:20],
                b.get("category"),
                b.get("total_quantity"),
                b.get("available_quantity"),
                b.get("shelf_number")
            ])

    elif report_type == "overdue":
        title = "Overdue Books & Delinquency Register"
        headers = ["Txn ID", "Student USN", "Name", "Book Title", "Due Date", "Days Overdue", "Fine (₹)"]
        txns = list(db["book_transactions"].find({"status": {"$in": ["issued", "overdue"]}}))
        for t in txns:
            days = calculate_overdue_days(t.get("due_date"))
            if days > 0:
                rows.append([
                    t.get("transaction_id"),
                    t.get("student_usn"),
                    t.get("student_name"),
                    t.get("book_title")[:25],
                    (t.get("due_date") or "")[:10],
                    days,
                    round(days * 5.0, 2)
                ])

    elif report_type == "fines":
        title = "Fine Collections and Outstanding Balance"
        headers = ["Fine ID", "Student USN", "Name", "Book", "Amount (₹)", "Status", "Collected By"]
        fines = list(db["fines"].find().sort("created_at", -1))
        for f in fines:
            rows.append([
                f.get("fine_id"),
                f.get("student_usn"),
                f.get("student_name"),
                f.get("book_title")[:20],
                f.get("amount"),
                f.get("status", "").upper(),
                f.get("collected_by") or "Pending"
            ])

    pdf_bytes = generate_pdf_report(title, headers, rows)
    filename = f"Aster_Library_{report_type}_{title.split()[0].lower()}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/export/excel")
def export_excel_report(
    report_type: str = Query(default="transactions", pattern="^(transactions|inventory|overdue|fines)$"),
    current_user: dict = Depends(require_librarian_or_admin)
):
    db = get_db()
    headers = []
    rows = []
    sheet_name = report_type.capitalize()

    if report_type == "transactions":
        headers = ["Transaction ID", "Student USN", "Student Name", "Book ID", "Book Title", "Issue Date", "Due Date", "Return Date", "Status", "Fine Amount"]
        txns = list(db["book_transactions"].find().sort("created_at", -1))
        for t in txns:
            rows.append([
                t.get("transaction_id"),
                t.get("student_usn"),
                t.get("student_name"),
                t.get("book_id"),
                t.get("book_title"),
                t.get("issue_date"),
                t.get("due_date"),
                t.get("return_date"),
                t.get("status"),
                t.get("fine_amount", 0.0)
            ])

    elif report_type == "inventory":
        headers = ["Book ID", "ISBN", "Title", "Author", "Publisher", "Edition", "Year", "Category", "Total Copies", "Available Copies", "Issued Copies", "Shelf"]
        books = list(db["books"].find().sort("title", 1))
        for b in books:
            rows.append([
                b.get("book_id"),
                b.get("isbn"),
                b.get("title"),
                b.get("author"),
                b.get("publisher"),
                b.get("edition"),
                b.get("publication_year"),
                b.get("category"),
                b.get("total_quantity"),
                b.get("available_quantity"),
                b.get("issued_quantity"),
                b.get("shelf_number")
            ])

    elif report_type == "overdue":
        headers = ["Transaction ID", "Student USN", "Student Name", "Book ID", "Book Title", "Due Date", "Days Overdue", "Estimated Fine (INR)"]
        txns = list(db["book_transactions"].find({"status": {"$in": ["issued", "overdue"]}}))
        for t in txns:
            days = calculate_overdue_days(t.get("due_date"))
            if days > 0:
                rows.append([
                    t.get("transaction_id"),
                    t.get("student_usn"),
                    t.get("student_name"),
                    t.get("book_id"),
                    t.get("book_title"),
                    t.get("due_date"),
                    days,
                    round(days * 5.0, 2)
                ])

    elif report_type == "fines":
        headers = ["Fine ID", "Transaction ID", "Student USN", "Student Name", "Book Title", "Amount (INR)", "Days Overdue", "Status", "Payment Date", "Collected By"]
        fines = list(db["fines"].find().sort("created_at", -1))
        for f in fines:
            rows.append([
                f.get("fine_id"),
                f.get("transaction_id"),
                f.get("student_usn"),
                f.get("student_name"),
                f.get("book_title"),
                f.get("amount"),
                f.get("days_overdue"),
                f.get("status"),
                f.get("paid_at"),
                f.get("collected_by")
            ])

    excel_bytes = generate_excel_report(sheet_name, headers, rows)
    filename = f"Aster_Library_{report_type}_report.xlsx"
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
