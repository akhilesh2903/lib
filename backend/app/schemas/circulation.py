from typing import Optional
from pydantic import BaseModel, Field


class IssueBookRequest(BaseModel):
    student_usn: str
    book_id: str
    custom_due_date: Optional[str] = None  # ISO format string or YYYY-MM-DD
    notes: Optional[str] = None


class ReturnBookRequest(BaseModel):
    transaction_id: Optional[str] = None
    student_usn: Optional[str] = None
    book_id: Optional[str] = None
    fine_collected: Optional[float] = 0.0
    notes: Optional[str] = None


class RenewBookRequest(BaseModel):
    transaction_id: str
    additional_days: Optional[int] = 14


class ReservationRequest(BaseModel):
    book_id: str
    notes: Optional[str] = None


class PayFineRequest(BaseModel):
    payment_mode: Optional[str] = "Cash"  # Cash, Card, UPI, Online
    reference_number: Optional[str] = None


class SystemSettingsUpdate(BaseModel):
    borrowing_duration_days: Optional[int] = Field(default=None, ge=1, le=180)
    fine_per_day: Optional[float] = Field(default=None, ge=0.0)
    max_books_per_student: Optional[int] = Field(default=None, ge=1, le=20)
    renewal_limit: Optional[int] = Field(default=None, ge=0, le=10)
    library_name: Optional[str] = None
    email_alerts_enabled: Optional[bool] = None
    academic_year: Optional[str] = None
