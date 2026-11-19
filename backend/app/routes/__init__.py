from .auth import router as auth_router
from .dashboard import router as dashboard_router
from .books import router as books_router
from .circulation import router as circulation_router
from .students import router as students_router
from .librarians import router as librarians_router
from .reservations import router as reservations_router
from .fines import router as fines_router
from .notifications import router as notifications_router
from .reports import router as reports_router
from .settings import router as settings_router
from .activity_logs import router as activity_logs_router

__all__ = [
    "auth_router",
    "dashboard_router",
    "books_router",
    "circulation_router",
    "students_router",
    "librarians_router",
    "reservations_router",
    "fines_router",
    "notifications_router",
    "reports_router",
    "settings_router",
    "activity_logs_router"
]
