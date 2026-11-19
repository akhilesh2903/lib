import os
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

load_dotenv()

from app.database.connection import init_db, is_connected_to_atlas
from app.utils.seeder import seed_database
from app.routes import (
    auth_router,
    dashboard_router,
    books_router,
    circulation_router,
    students_router,
    librarians_router,
    reservations_router,
    fines_router,
    notifications_router,
    reports_router,
    settings_router,
    activity_logs_router
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Database & Seed sample data if empty
    print("Initializing Aster Library Management System...")
    init_db()
    seed_database(force=False)
    print("LMS API Server Ready!")
    yield
    print("Shutting down LMS API Server...")


app = FastAPI(
    title="Aster College Library Management System API",
    description="Production-grade LMS REST API powering Super Admin, Librarian, and Student Portals",
    version="2.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"Unhandled Exception on {request.url.path}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"success": False, "message": "An internal server error occurred", "detail": str(exc)}
    )


# Health Check
@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": "Aster Library API",
        "database": "MongoDB Atlas" if is_connected_to_atlas() else "Persistent Document Store (Local Fallback)",
        "version": "2.0.0"
    }


@app.get("/", tags=["Root"])
def root_info():
    return {
        "system": "Aster College Library Management System",
        "status": "running",
        "docs_url": "/docs",
        "api_v1": "/api/v1"
    }


# Include API Routers under /api/v1 prefix
api_v1_prefix = "/api/v1"
app.include_router(auth_router, prefix=api_v1_prefix)
app.include_router(dashboard_router, prefix=api_v1_prefix)
app.include_router(books_router, prefix=api_v1_prefix)
app.include_router(circulation_router, prefix=api_v1_prefix)
app.include_router(students_router, prefix=api_v1_prefix)
app.include_router(librarians_router, prefix=api_v1_prefix)
app.include_router(reservations_router, prefix=api_v1_prefix)
app.include_router(fines_router, prefix=api_v1_prefix)
app.include_router(notifications_router, prefix=api_v1_prefix)
app.include_router(reports_router, prefix=api_v1_prefix)
app.include_router(settings_router, prefix=api_v1_prefix)
app.include_router(activity_logs_router, prefix=api_v1_prefix)

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run("main:app", host=host, port=port, reload=True)
