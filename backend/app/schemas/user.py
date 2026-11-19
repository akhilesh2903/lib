from typing import Optional, List
from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: str  # super_admin, librarian, student
    is_active: bool = True
    avatar_url: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None
    avatar_url: Optional[str] = None
    role: Optional[str] = None


class StudentCreate(BaseModel):
    usn: str
    name: str
    email: EmailStr
    department: str
    semester: int = 1
    phone: Optional[str] = None
    profile_picture: Optional[str] = None
    password: Optional[str] = "Student@123"
    max_books_allowed: int = 4


class StudentUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    department: Optional[str] = None
    semester: Optional[int] = None
    phone: Optional[str] = None
    profile_picture: Optional[str] = None
    max_books_allowed: Optional[int] = None
    is_active: Optional[bool] = None


class LibrarianCreate(BaseModel):
    employee_id: str
    name: str
    email: EmailStr
    phone: Optional[str] = None
    shift: Optional[str] = "Morning"  # Morning, Evening, General
    password: Optional[str] = "Library@123"


class LibrarianUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    shift: Optional[str] = None
    is_active: Optional[bool] = None
