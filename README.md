# Aster College Library Management System (LMS)

A complete, production-quality, full-stack Library Management System engineered for colleges and educational institutions. Features multi-role authentication (Super Admin, Librarian, Student), complete circulation workflows, automatic due date and fine calculations, persistent MongoDB Atlas database integration, real-time analytics with Recharts, and downloadable PDF and Excel reports.

---

## 🏛️ System Architecture

```text
Aster Library Management System
├── backend/                  # Python FastAPI REST API Backend
│   ├── app/
│   │   ├── database/         # MongoDB Atlas connection & local persistence fallback
│   │   ├── middleware/       # JWT authentication & Role-Based Access Control (RBAC)
│   │   ├── models/           # Domain models & database schema definitions
│   │   ├── routes/           # REST API endpoints (Auth, Dashboard, Books, Circulation, etc.)
│   │   ├── schemas/          # Pydantic validation schemas
│   │   ├── services/         # Audit logging, SMTP notifications, PDF/Excel generation
│   │   └── utils/            # PBKDF2/bcrypt hashing, JWT, ID generators, seeder
│   ├── data/                 # Persistent storage (auto-synced)
│   ├── main.py               # Application entry point, CORS, lifespan seeder
│   ├── requirements.txt      # Python dependencies
│   └── .env.example          # Environment variables template
│
└── frontend/                 # Modern React / Next.js Frontend
    ├── src/
    │   ├── components/       # Reusable UI widgets, badges, modals
    │   ├── context/          # AuthContext (JWT session), ToastContext (alerts)
    │   ├── dashboards/       # Role-tailored dashboards (Admin, Librarian, Student)
    │   ├── layouts/          # Responsive DashboardLayout with sidebar & header
    │   ├── pages/            # Catalog, Circulation, Members, Librarians, Fines, Reports
    │   └── services/         # Axios-compatible API client with auth interceptors
    ├── package.json          # Node dependencies
    └── tailwind.config.ts    # Modern styling theme
```

---

## 🚀 Technology Stack

- **Backend**: Python 3.11+ with **FastAPI** & **Uvicorn**
- **Frontend**: **React 19** with **Next.js** component architecture
- **Database**: **MongoDB Atlas** (with automatic local persistent fallback for instant offline development)
- **Styling**: **Tailwind CSS** with smooth animations
- **Charts**: **Recharts** (Circulation curves, Category donuts, Usage meters)
- **Icons**: **Lucide React**
- **Authentication**: Stateless **JWT (JSON Web Tokens)**
- **Password Security**: NIST-approved **PBKDF2-HMAC-SHA256** and **bcrypt**
- **Reporting**: **ReportLab** for formal PDF reports and **OpenPyXL** for Excel sheets
- **Email Notifications**: **SMTP Integration** with in-app notification inbox fallback

---

## 👥 Multiple Login Systems & Roles

| Role | Username / Identifier | Password | Access & Responsibilities |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@aster.edu` | `Admin@123` | Complete system governance, manage librarian accounts, manage student accounts, configure loan limits and fine rates, view full audit logs, and export institutional reports. |
| **Librarian** | `librarian@aster.edu` | `Library@123` | Catalog physical books, upload cover images, issue books by student USN, accept returns, assess overdue fines, renew loans, and print spine barcodes. |
| **Student** | `1MS21CS001` | `Student@123` | Personalized dashboard, view active loans with live countdown badges, check reading history, reserve books, and receive due-date notifications. |

> **Note**: Additional sample accounts are seeded:
> - Librarian 2: `sarah.librarian@aster.edu` / `Library@123`
> - Student 2: `1MS21CS002` / `Student@123` (Diya Mehta)
> - Student 3: `1MS22EC024` / `Student@123` (Sneha Reddy)

---

## ⚡ Quick Start Instructions

### 1. Start the FastAPI Backend

Open a terminal:

```powershell
cd backend
python -m pip install -r requirements.txt
python main.py
```

The backend starts on `http://localhost:8000`.
- API Health Check: `http://localhost:8000/health`
- Interactive OpenAPI Docs: `http://localhost:8000/docs`

### 2. Start the Frontend

Open another terminal:

```powershell
cd frontend
npm run dev
```

Open `http://localhost:3000` in your web browser.

---

## 🗄️ Database Setup & MongoDB Atlas Configuration

The application is pre-configured to connect to MongoDB Atlas or local MongoDB via `backend/.env`:

```env
# MongoDB Atlas Connection (or local MongoDB)
MONGODB_URL=mongodb+srv://<username>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=library_management_system
```

If no MongoDB server is currently running, the system transparently utilizes its built-in persistent document store in `backend/data/db.json` so you can test all features instantly without requiring any setup.

---

## 📋 Key Features & Workflows

1. **Book Inventory Management**:
   - Add new books with ISBN validation, categories, rack numbers, and cover URLs.
   - Automatically tracks which librarian added each book.
   - Deletion protection prevents deleting books with active loans.
2. **Circulation Workflow**:
   - Issue book: Search student by USN, select book, auto-calculate return deadline based on configured borrowing duration.
   - Return book: Auto-records return timestamp, assesses fines for overdue days, updates inventory counts consistently.
   - Renew loan: Extends return deadline by 14 days.
3. **Automatic Due Dates & Fine Calculation**:
   - Configurable fine rate (default ₹5.00/day).
   - Real-time days remaining and overdue indicators.
   - Settlement recording via Cash, UPI, Card, or Online receipt.
4. **Export Reports**:
   - One-click PDF export using ReportLab for Accreditation Audits.
   - One-click Excel (.xlsx) export using OpenPyXL.
5. **Fast 1-Click Role Switcher**:
   - A demo switcher is integrated directly into the header bar so you can switch between Admin, Librarian, and Student views in 1 click!

---

## 🔐 API Reference Endpoints

### Authentication & Profiles
- `POST /api/v1/auth/login` - Sign in with Email or Student USN
- `GET /api/v1/auth/me` - Fetch authenticated user profile
- `POST /api/v1/auth/change-password` - Update account password
- `POST /api/v1/auth/register-student` - Student registration

### Dashboards
- `GET /api/v1/dashboard/admin` - 6 KPI metrics, monthly circulation curves, category breakdown, recent activities
- `GET /api/v1/dashboard/librarian` - Operational desk metrics, books due today
- `GET /api/v1/dashboard/student` - Personalized active loans, reading history, quotas

### Books Catalog
- `GET /api/v1/books` - Search & filter catalog with pagination
- `POST /api/v1/books` - Add new book (Librarian/Admin)
- `PUT /api/v1/books/{id}` - Edit book details
- `DELETE /api/v1/books/{id}` - Remove book from catalog

### Circulation
- `POST /api/v1/circulation/issue` - Issue book to student USN
- `POST /api/v1/circulation/return` - Return book and calculate fine
- `POST /api/v1/circulation/renew` - Extend return deadline
- `GET /api/v1/circulation/active` - Active borrowed books
- `GET /api/v1/circulation/overdue` - Overdue delinquent records
- `GET /api/v1/circulation/history` - Historical circulation log

### Reports & Export
- `GET /api/v1/reports/export/pdf?report_type=transactions` - Download PDF report
- `GET /api/v1/reports/export/excel?report_type=inventory` - Download Excel spreadsheet

---

## 📄 License

Proprietary • Designed and developed for Aster College.
