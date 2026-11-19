from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends
from app.database.connection import get_db
from app.schemas.auth import LoginRequest, TokenResponse, ChangePasswordRequest, ForgotPasswordRequest, ResetPasswordRequest
from app.schemas.user import StudentCreate
from app.utils.security import hash_password, verify_password, create_access_token
from app.utils.helpers import serialize_doc, generate_unique_id
from app.middleware.auth_middleware import get_current_user
from app.services.log_service import log_activity
from app.services.email_service import send_system_notification

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest):
    db = get_db()
    identifier = payload.username_or_email.strip()

    # Search user by email or student USN
    user = db["users"].find_one({"email": {"$regex": f"^{identifier}$", "$options": "i"}})
    
    # If not found by email, check if identifier is a student USN
    student_profile = None
    if not user:
        student = db["students"].find_one({"usn": {"$regex": f"^{identifier}$", "$options": "i"}})
        if student:
            user = db["users"].find_one({"_id": student.get("user_id")})
            student_profile = serialize_doc(student)

    if not user or not verify_password(payload.password, user.get("hashed_password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please verify your email/USN and password."
        )

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is currently suspended or inactive. Please contact the library administrator."
        )

    # Attach role-specific metadata
    role = user.get("role")
    librarian_profile = None
    if role == "student" and not student_profile:
        std = db["students"].find_one({"$or": [{"user_id": user["_id"]}, {"email": user["email"]}]})
        student_profile = serialize_doc(std)
    elif role == "librarian":
        lib = db["librarians"].find_one({"$or": [{"user_id": user["_id"]}, {"email": user["email"]}]})
        librarian_profile = serialize_doc(lib)

    token_data = {
        "sub": str(user["_id"]),
        "id": str(user["_id"]),
        "email": user["email"],
        "name": user["name"],
        "role": user["role"]
    }
    access_token = create_access_token(token_data)

    user_clean = serialize_doc(user)
    user_clean.pop("hashed_password", None)
    if student_profile:
        user_clean["student_profile"] = student_profile
    if librarian_profile:
        user_clean["librarian_profile"] = librarian_profile

    # Record last login & log
    db["users"].update_one({"_id": user["_id"]}, {"$set": {"last_login": datetime.utcnow().isoformat()}})
    log_activity(
        user_id=str(user["_id"]),
        user_name=user["name"],
        user_role=user["role"],
        action="User Login",
        details=f"Successful sign in as {user['role']}"
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_clean
    }


@router.get("/me")
def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    db = get_db()
    role = current_user.get("role")
    profile = dict(current_user)

    if role == "student":
        student = db["students"].find_one({"$or": [{"user_id": current_user["_id"]}, {"email": current_user["email"]}]})
        profile["student_profile"] = serialize_doc(student)
    elif role == "librarian":
        librarian = db["librarians"].find_one({"$or": [{"user_id": current_user["_id"]}, {"email": current_user["email"]}]})
        profile["librarian_profile"] = serialize_doc(librarian)

    return {"success": True, "data": profile}


@router.post("/change-password")
def change_password(payload: ChangePasswordRequest, current_user: dict = Depends(get_current_user)):
    db = get_db()
    user = db["users"].find_one({"_id": current_user["_id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not verify_password(payload.current_password, user.get("hashed_password", "")):
        raise HTTPException(status_code=400, detail="Current password entered is incorrect")

    new_hash = hash_password(payload.new_password)
    db["users"].update_one(
        {"_id": user["_id"]},
        {"$set": {"hashed_password": new_hash, "must_change_password": False, "updated_at": datetime.utcnow().isoformat()}}
    )

    log_activity(
        user_id=str(user["_id"]),
        user_name=user["name"],
        user_role=user["role"],
        action="Password Changed",
        details="Security password successfully updated"
    )

    return {"success": True, "message": "Password changed successfully"}


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest):
    db = get_db()
    user = db["users"].find_one({"email": payload.email})
    if not user:
        # Avoid user enumeration while confirming request
        return {"success": True, "message": "If this email is registered, password reset instructions have been issued."}

    reset_token = generate_unique_id("RST")
    db["users"].update_one(
        {"_id": user["_id"]},
        {"$set": {"reset_token": reset_token, "reset_token_expires": (datetime.utcnow()).isoformat()}}
    )

    send_system_notification(
        recipient_email=payload.email,
        subject="Password Reset Request",
        message=f"A password reset was requested for your account. Use recovery verification token: {reset_token}",
        recipient_id=str(user["_id"]),
        recipient_role=user.get("role", "student"),
        notif_type="system"
    )

    return {"success": True, "message": "Password reset instructions have been sent to your email."}


@router.post("/register-student")
def register_student(payload: StudentCreate):
    db = get_db()
    existing_usn = db["students"].find_one({"usn": {"$regex": f"^{payload.usn.strip()}$", "$options": "i"}})
    if existing_usn:
        raise HTTPException(status_code=400, detail=f"A student with USN '{payload.usn}' already exists.")

    existing_email = db["users"].find_one({"email": {"$regex": f"^{payload.email.strip()}$", "$options": "i"}})
    if existing_email:
        raise HTTPException(status_code=400, detail=f"Email '{payload.email}' is already registered.")

    user_id = f"usr-std-{payload.usn.strip()}"
    new_user = {
        "_id": user_id,
        "name": payload.name.strip(),
        "email": payload.email.strip().lower(),
        "hashed_password": hash_password(payload.password or "Student@123"),
        "role": "student",
        "is_active": True,
        "avatar_url": payload.profile_picture or "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        "must_change_password": False,
        "created_at": datetime.utcnow().isoformat()
    }
    db["users"].insert_one(new_user)

    student_rec = {
        "_id": f"std-rec-{payload.usn.strip()}",
        "user_id": user_id,
        "usn": payload.usn.strip().upper(),
        "name": payload.name.strip(),
        "email": payload.email.strip().lower(),
        "department": payload.department.strip(),
        "semester": payload.semester,
        "phone": payload.phone,
        "profile_picture": new_user["avatar_url"],
        "max_books_allowed": payload.max_books_allowed or 4,
        "active_borrows_count": 0,
        "created_at": datetime.utcnow().isoformat()
    }
    db["students"].insert_one(student_rec)

    log_activity(
        user_id=user_id,
        user_name=payload.name,
        user_role="student",
        action="Student Registered",
        details=f"New student registration for USN {payload.usn}"
    )

    return {"success": True, "message": "Student registration completed successfully", "data": serialize_doc(student_rec)}
