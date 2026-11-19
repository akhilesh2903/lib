import logging
from datetime import datetime, timedelta
from app.database.connection import get_db
from app.utils.security import hash_password
from app.utils.helpers import calculate_due_date, calculate_overdue_days, calculate_fine_amount

logger = logging.getLogger("lms.seeder")


def seed_database(force: bool = False):
    db = get_db()

    # Check if database already has users
    user_count = db["users"].count_documents({})
    if user_count > 0 and not force:
        logger.info(f"Database already populated ({user_count} users). Skipping seeder.")
        return

    logger.info("Initializing database with complete production sample data...")

    # Clear existing collections if force
    if force:
        for col_name in [
            "users", "students", "librarians", "books",
            "book_transactions", "reservations", "fines",
            "notifications", "activity_logs", "system_settings"
        ]:
            db[col_name].delete_many({})

    # 1. System Settings
    settings_doc = {
        "_id": "SYS-SETTINGS-01",
        "borrowing_duration_days": 14,
        "fine_per_day": 5.0,
        "max_books_per_student": 4,
        "renewal_limit": 2,
        "library_name": "Aster College Central Library",
        "email_alerts_enabled": True,
        "academic_year": "2024 - 25",
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }
    db["system_settings"].insert_one(settings_doc)

    # 2. Super Admin Account
    admin_user = {
        "_id": "usr-admin-01",
        "name": "Dr. Ronald Sterling",
        "email": "admin@aster.edu",
        "hashed_password": hash_password("Admin@123"),
        "role": "super_admin",
        "is_active": True,
        "avatar_url": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
        "must_change_password": False,
        "created_at": (datetime.utcnow() - timedelta(days=90)).isoformat()
    }
    db["users"].insert_one(admin_user)

    # 3. Librarians
    librarians_data = [
        {
            "user_id": "usr-lib-01",
            "employee_id": "LIB-001",
            "name": "Akhilesh Kumar",
            "email": "librarian@aster.edu",
            "phone": "+91 98451 22334",
            "shift": "Morning",
            "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
        },
        {
            "user_id": "usr-lib-02",
            "employee_id": "LIB-002",
            "name": "Sarah Jenkins",
            "email": "sarah.librarian@aster.edu",
            "phone": "+91 98452 44556",
            "shift": "Evening",
            "avatar_url": "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80"
        }
    ]

    for lib in librarians_data:
        db["users"].insert_one({
            "_id": lib["user_id"],
            "name": lib["name"],
            "email": lib["email"],
            "hashed_password": hash_password("Library@123"),
            "role": "librarian",
            "is_active": True,
            "avatar_url": lib["avatar_url"],
            "must_change_password": False,
            "created_at": (datetime.utcnow() - timedelta(days=60)).isoformat()
        })
        db["librarians"].insert_one({
            "_id": f"lib-rec-{lib['employee_id']}",
            "user_id": lib["user_id"],
            "employee_id": lib["employee_id"],
            "name": lib["name"],
            "email": lib["email"],
            "phone": lib["phone"],
            "shift": lib["shift"],
            "status": "Active",
            "created_at": (datetime.utcnow() - timedelta(days=60)).isoformat()
        })

    # 4. Students (10 sample students)
    students_raw = [
        {"usn": "1MS21CS001", "name": "Aarav Sharma", "email": "aarav.sharma@aster.edu", "dept": "Computer Science", "sem": 6, "phone": "+91 98765 01001", "pic": "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80"},
        {"usn": "1MS21CS002", "name": "Diya Mehta", "email": "diya.mehta@aster.edu", "dept": "Computer Science", "sem": 6, "phone": "+91 98765 01002", "pic": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80"},
        {"usn": "1MS22IS015", "name": "Vivaan Kapoor", "email": "vivaan.kapoor@aster.edu", "dept": "Information Science", "sem": 4, "phone": "+91 98765 01003", "pic": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"},
        {"usn": "1MS22EC024", "name": "Sneha Reddy", "email": "sneha.reddy@aster.edu", "dept": "Electronics & Comm", "sem": 4, "phone": "+91 98765 01004", "pic": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80"},
        {"usn": "1MS23ME008", "name": "Ishaan Gupta", "email": "ishaan.gupta@aster.edu", "dept": "Mechanical Eng", "sem": 2, "phone": "+91 98765 01005", "pic": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80"},
        {"usn": "1MS21CS042", "name": "Riya Patel", "email": "riya.patel@aster.edu", "dept": "Computer Science", "sem": 6, "phone": "+91 98765 01006", "pic": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80"},
        {"usn": "1MS21AI019", "name": "Kabir Verma", "email": "kabir.verma@aster.edu", "dept": "Artificial Intelligence", "sem": 6, "phone": "+91 98765 01007", "pic": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80"},
        {"usn": "1MS22CV011", "name": "Ananya Singh", "email": "ananya.singh@aster.edu", "dept": "Civil Engineering", "sem": 4, "phone": "+91 98765 01008", "pic": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80"},
        {"usn": "1MS23EE005", "name": "Vihaan Joshi", "email": "vihaan.joshi@aster.edu", "dept": "Electrical Eng", "sem": 2, "phone": "+91 98765 01009", "pic": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80"},
        {"usn": "1MS21CS088", "name": "Meera Nair", "email": "meera.nair@aster.edu", "dept": "Computer Science", "sem": 6, "phone": "+91 98765 01010", "pic": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
    ]

    for s in students_raw:
        user_id = f"usr-std-{s['usn']}"
        db["users"].insert_one({
            "_id": user_id,
            "name": s["name"],
            "email": s["email"],
            "hashed_password": hash_password("Student@123"),
            "role": "student",
            "is_active": True,
            "avatar_url": s["pic"],
            "must_change_password": False,
            "created_at": (datetime.utcnow() - timedelta(days=45)).isoformat()
        })
        db["students"].insert_one({
            "_id": f"std-rec-{s['usn']}",
            "user_id": user_id,
            "usn": s["usn"],
            "name": s["name"],
            "email": s["email"],
            "department": s["dept"],
            "semester": s["sem"],
            "phone": s["phone"],
            "profile_picture": s["pic"],
            "max_books_allowed": 4,
            "active_borrows_count": 0,
            "created_at": (datetime.utcnow() - timedelta(days=45)).isoformat()
        })

    # 5. Books (22 rich books across various categories matching reference image)
    books_data = [
        {
            "book_id": "BK100231",
            "isbn": "978-0062457714",
            "title": "The Subtle Art of Not Giving a F*ck",
            "author": "Mark Manson",
            "category": "Self-Help",
            "publisher": "HarperOne",
            "edition": "1st Edition",
            "publication_year": 2016,
            "shelf_number": "Rack S-12",
            "total_quantity": 8,
            "available_quantity": 7,
            "issued_quantity": 1,
            "cover_image": "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&auto=format&fit=crop&q=80",
            "description": "A counterintuitive approach to living a good life, focusing on embracing our limitations and flaws."
        },
        {
            "book_id": "BK100232",
            "isbn": "978-1612680194",
            "title": "Rich Dad Poor Dad",
            "author": "Robert Kiyosaki",
            "category": "Finance",
            "publisher": "Plata Publishing",
            "edition": "20th Anniversary",
            "publication_year": 2017,
            "shelf_number": "Rack F-04",
            "total_quantity": 10,
            "available_quantity": 9,
            "issued_quantity": 1,
            "cover_image": "https://images.unsplash.com/photo-1592496431122-2349e0fbc666?w=300&auto=format&fit=crop&q=80",
            "description": "What the rich teach their kids about money that the poor and middle class do not."
        },
        {
            "book_id": "BK100233",
            "isbn": "978-0812981605",
            "title": "The Power of Habit",
            "author": "Charles Duhigg",
            "category": "Psychology",
            "publisher": "Random House",
            "edition": "Reprint",
            "publication_year": 2014,
            "shelf_number": "Rack P-08",
            "total_quantity": 6,
            "available_quantity": 5,
            "issued_quantity": 1,
            "cover_image": "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300&auto=format&fit=crop&q=80",
            "description": "Why we do what we do in life and business, and the science behind habitual transformation."
        },
        {
            "book_id": "BK100234",
            "isbn": "978-0143130727",
            "title": "Ikigai: The Japanese Secret to a Long and Happy Life",
            "author": "Héctor García & Francesc Miralles",
            "category": "Philosophy",
            "publisher": "Penguin Books",
            "edition": "Hardcover",
            "publication_year": 2017,
            "shelf_number": "Rack PH-02",
            "total_quantity": 7,
            "available_quantity": 6,
            "issued_quantity": 1,
            "cover_image": "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=300&auto=format&fit=crop&q=80",
            "description": "Discover your purpose and unlock a fulfilling lifestyle inspired by the centenarians of Okinawa."
        },
        {
            "book_id": "BK100235",
            "isbn": "978-0399590504",
            "title": "Educated: A Memoir",
            "author": "Tara Westover",
            "category": "Biography",
            "publisher": "Random House",
            "edition": "1st Edition",
            "publication_year": 2018,
            "shelf_number": "Rack B-14",
            "total_quantity": 5,
            "available_quantity": 4,
            "issued_quantity": 1,
            "cover_image": "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=300&auto=format&fit=crop&q=80",
            "description": "An unforgettable memoir about a young girl who leaves her survivalist family and earns a PhD from Cambridge."
        },
        {
            "book_id": "BK100236",
            "isbn": "978-0062315007",
            "title": "The Alchemist",
            "author": "Paulo Coelho",
            "category": "Fiction",
            "publisher": "HarperOne",
            "edition": "25th Anniversary",
            "publication_year": 2014,
            "shelf_number": "Rack F-01",
            "total_quantity": 12,
            "available_quantity": 10,
            "issued_quantity": 2,
            "cover_image": "https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=300&auto=format&fit=crop&q=80",
            "description": "A magical journey of self-discovery following Santiago, an Andalusian shepherd boy yearning to travel."
        },
        {
            "book_id": "BK100237",
            "isbn": "978-0735211292",
            "title": "Atomic Habits",
            "author": "James Clear",
            "category": "Self-Help",
            "publisher": "Avery",
            "edition": "1st Edition",
            "publication_year": 2018,
            "shelf_number": "Rack S-05",
            "total_quantity": 15,
            "available_quantity": 12,
            "issued_quantity": 3,
            "cover_image": "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=300&auto=format&fit=crop&q=80",
            "description": "An easy and proven way to build good habits and break bad ones through tiny changes."
        },
        {
            "book_id": "BK100238",
            "isbn": "978-0743273565",
            "title": "The Great Gatsby",
            "author": "F. Scott Fitzgerald",
            "category": "Fiction",
            "publisher": "Scribner",
            "edition": "Reissue",
            "publication_year": 2004,
            "shelf_number": "Rack F-03",
            "total_quantity": 8,
            "available_quantity": 6,
            "issued_quantity": 2,
            "cover_image": "https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=300&auto=format&fit=crop&q=80",
            "description": "The quintessential story of the Jazz Age, romantic hope, and the disillusionment of the American dream."
        },
        {
            "book_id": "BK100239",
            "isbn": "978-1455586691",
            "title": "Deep Work: Rules for Focused Success",
            "author": "Cal Newport",
            "category": "Science",
            "publisher": "Grand Central",
            "edition": "1st Edition",
            "publication_year": 2016,
            "shelf_number": "Rack C-02",
            "total_quantity": 6,
            "available_quantity": 5,
            "issued_quantity": 1,
            "cover_image": "https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=300&auto=format&fit=crop&q=80",
            "description": "Rules and routines for focused success in an increasingly distracted world."
        },
        {
            "book_id": "BK100240",
            "isbn": "978-0374533557",
            "title": "Thinking, Fast and Slow",
            "author": "Daniel Kahneman",
            "category": "Science",
            "publisher": "Farrar, Straus and Giroux",
            "edition": "1st Edition",
            "publication_year": 2013,
            "shelf_number": "Rack P-10",
            "total_quantity": 8,
            "available_quantity": 7,
            "issued_quantity": 1,
            "cover_image": "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=300&auto=format&fit=crop&q=80",
            "description": "Nobel Laureate Daniel Kahneman's tour de force explaining the two systems that drive the way we think."
        },
        {
            "book_id": "BK100241",
            "isbn": "978-0062316097",
            "title": "Sapiens: A Brief History of Humankind",
            "author": "Yuval Noah Harari",
            "category": "Reference",
            "publisher": "Harper",
            "edition": "Illustrated",
            "publication_year": 2015,
            "shelf_number": "Rack H-01",
            "total_quantity": 9,
            "available_quantity": 8,
            "issued_quantity": 1,
            "cover_image": "https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=300&auto=format&fit=crop&q=80",
            "description": "From ancient human species to modern society, how biology and history define humankind."
        },
        {
            "book_id": "BK100242",
            "isbn": "978-8173711466",
            "title": "Wings of Fire: An Autobiography",
            "author": "A.P.J. Abdul Kalam",
            "category": "Biography",
            "publisher": "Universities Press",
            "edition": "Special Edition",
            "publication_year": 1999,
            "shelf_number": "Rack B-01",
            "total_quantity": 10,
            "available_quantity": 9,
            "issued_quantity": 1,
            "cover_image": "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=300&auto=format&fit=crop&q=80",
            "description": "The inspiring autobiography of India's Missile Man and beloved 11th President, Dr. APJ Abdul Kalam."
        },
        {
            "book_id": "BK100243",
            "isbn": "978-0131103627",
            "title": "The C Programming Language",
            "author": "Brian W. Kernighan & Dennis M. Ritchie",
            "category": "Education",
            "publisher": "Prentice Hall",
            "edition": "2nd Edition",
            "publication_year": 1988,
            "shelf_number": "Rack CS-01",
            "total_quantity": 14,
            "available_quantity": 12,
            "issued_quantity": 2,
            "cover_image": "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=300&auto=format&fit=crop&q=80",
            "description": "The definitive classic guide to C programming, written directly by the language's creators."
        },
        {
            "book_id": "BK100244",
            "isbn": "978-0262033848",
            "title": "Introduction to Algorithms (CLRS)",
            "author": "Thomas H. Cormen et al.",
            "category": "Education",
            "publisher": "MIT Press",
            "edition": "4th Edition",
            "publication_year": 2022,
            "shelf_number": "Rack CS-03",
            "total_quantity": 10,
            "available_quantity": 7,
            "issued_quantity": 3,
            "cover_image": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=300&auto=format&fit=crop&q=80",
            "description": "The comprehensive textbook and primary reference on modern data structures and computer algorithms."
        },
        {
            "book_id": "BK100245",
            "isbn": "978-0132350884",
            "title": "Clean Code: A Handbook of Agile Software Craftsmanship",
            "author": "Robert C. Martin",
            "category": "Education",
            "publisher": "Prentice Hall",
            "edition": "1st Edition",
            "publication_year": 2008,
            "shelf_number": "Rack CS-05",
            "total_quantity": 8,
            "available_quantity": 6,
            "issued_quantity": 2,
            "cover_image": "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=300&auto=format&fit=crop&q=80",
            "description": "Even bad code can function. But if code isn't clean, it can bring a development organization to its knees."
        },
        {
            "book_id": "BK100246",
            "isbn": "978-0596517748",
            "title": "JavaScript: The Good Parts",
            "author": "Douglas Crockford",
            "category": "Education",
            "publisher": "O'Reilly Media",
            "edition": "1st Edition",
            "publication_year": 2008,
            "shelf_number": "Rack CS-07",
            "total_quantity": 6,
            "available_quantity": 5,
            "issued_quantity": 1,
            "cover_image": "https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?w=300&auto=format&fit=crop&q=80",
            "description": "Unearthing the truly elegant and powerful subset of JavaScript to build robust, maintainable web apps."
        },
        {
            "book_id": "BK100247",
            "isbn": "978-1449373320",
            "title": "Designing Data-Intensive Applications",
            "author": "Martin Kleppmann",
            "category": "Education",
            "publisher": "O'Reilly Media",
            "edition": "1st Edition",
            "publication_year": 2017,
            "shelf_number": "Rack CS-09",
            "total_quantity": 7,
            "available_quantity": 5,
            "issued_quantity": 2,
            "cover_image": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=300&auto=format&fit=crop&q=80",
            "description": "The big ideas behind reliable, scalable, and maintainable systems in distributed computing."
        },
        {
            "book_id": "BK100248",
            "isbn": "978-1491957660",
            "title": "Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow",
            "author": "Aurélien Géron",
            "category": "Science",
            "publisher": "O'Reilly Media",
            "edition": "3rd Edition",
            "publication_year": 2022,
            "shelf_number": "Rack AI-02",
            "total_quantity": 9,
            "available_quantity": 8,
            "issued_quantity": 1,
            "cover_image": "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=300&auto=format&fit=crop&q=80",
            "description": "Through concrete examples and minimal theory, learn the tools for building intelligent AI systems."
        },
        {
            "book_id": "BK100249",
            "isbn": "978-0201616224",
            "title": "The Pragmatic Programmer",
            "author": "David Thomas & Andrew Hunt",
            "category": "Education",
            "publisher": "Addison-Wesley",
            "edition": "20th Anniversary",
            "publication_year": 2019,
            "shelf_number": "Rack CS-11",
            "total_quantity": 8,
            "available_quantity": 7,
            "issued_quantity": 1,
            "cover_image": "https://images.unsplash.com/photo-1532012164546-f432f2e3777f?w=300&auto=format&fit=crop&q=80",
            "description": "From coding craftsmanship to career development, timeless advice for software engineers."
        },
        {
            "book_id": "BK100250",
            "isbn": "978-1118951156",
            "title": "Computer Networking: A Top-Down Approach",
            "author": "James F. Kurose & Keith W. Ross",
            "category": "Reference",
            "publisher": "Pearson",
            "edition": "8th Edition",
            "publication_year": 2021,
            "shelf_number": "Rack NT-01",
            "total_quantity": 10,
            "available_quantity": 8,
            "issued_quantity": 2,
            "cover_image": "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=300&auto=format&fit=crop&q=80",
            "description": "Motivates students through the early introduction of application-layer network architectures."
        }
    ]

    for b in books_data:
        b["added_by_name"] = "Akhilesh Kumar"
        b["added_by_id"] = "usr-lib-01"
        b["created_at"] = (datetime.utcnow() - timedelta(days=30)).isoformat()
        db["books"].insert_one(b)

    # 6. Sample Circulation Transactions
    # A. Active normal issues (due in future)
    # B. Overdue issues (due in past with calculated fines)
    # C. Returned books
    now = datetime.utcnow()
    transactions_sample = [
        # Overdue book 1 (12 days overdue)
        {
            "transaction_id": "TXN-2024-001",
            "student_usn": "1MS21CS042",
            "student_name": "Riya Patel",
            "book_id": "BK100238",
            "book_title": "The Great Gatsby",
            "librarian_id": "usr-lib-01",
            "librarian_name": "Akhilesh Kumar",
            "issue_date": (now - timedelta(days=26)).isoformat(),
            "due_date": (now - timedelta(days=12)).isoformat(),
            "return_date": None,
            "status": "overdue",
            "fine_amount": 60.0,
            "fine_paid": False,
            "notes": "First notice dispatched",
            "created_at": (now - timedelta(days=26)).isoformat()
        },
        # Overdue book 2 (10 days overdue)
        {
            "transaction_id": "TXN-2024-002",
            "student_usn": "1MS21AI019",
            "student_name": "Kabir Verma",
            "book_id": "BK100239",
            "book_title": "Deep Work: Rules for Focused Success",
            "librarian_id": "usr-lib-01",
            "librarian_name": "Akhilesh Kumar",
            "issue_date": (now - timedelta(days=24)).isoformat(),
            "due_date": (now - timedelta(days=10)).isoformat(),
            "return_date": None,
            "status": "overdue",
            "fine_amount": 50.0,
            "fine_paid": False,
            "notes": "Reminder sent via email",
            "created_at": (now - timedelta(days=24)).isoformat()
        },
        # Overdue book 3 (8 days overdue)
        {
            "transaction_id": "TXN-2024-003",
            "student_usn": "1MS22CV011",
            "student_name": "Ananya Singh",
            "book_id": "BK100240",
            "book_title": "Thinking, Fast and Slow",
            "librarian_id": "usr-lib-02",
            "librarian_name": "Sarah Jenkins",
            "issue_date": (now - timedelta(days=22)).isoformat(),
            "due_date": (now - timedelta(days=8)).isoformat(),
            "return_date": None,
            "status": "overdue",
            "fine_amount": 40.0,
            "fine_paid": False,
            "notes": "SMS reminder triggered",
            "created_at": (now - timedelta(days=22)).isoformat()
        },
        # Active issue 1 (due in 8 days)
        {
            "transaction_id": "TXN-2024-004",
            "student_usn": "1MS21CS001",
            "student_name": "Aarav Sharma",
            "book_id": "BK100231",
            "book_title": "The Subtle Art of Not Giving a F*ck",
            "librarian_id": "usr-lib-01",
            "librarian_name": "Akhilesh Kumar",
            "issue_date": (now - timedelta(days=6)).isoformat(),
            "due_date": (now + timedelta(days=8)).isoformat(),
            "return_date": None,
            "status": "issued",
            "fine_amount": 0.0,
            "fine_paid": False,
            "notes": "Issued in good condition",
            "created_at": (now - timedelta(days=6)).isoformat()
        },
        # Active issue 2 (due in 11 days)
        {
            "transaction_id": "TXN-2024-005",
            "student_usn": "1MS22EC024",
            "student_name": "Sneha Reddy",
            "book_id": "BK100232",
            "book_title": "Rich Dad Poor Dad",
            "librarian_id": "usr-lib-01",
            "librarian_name": "Akhilesh Kumar",
            "issue_date": (now - timedelta(days=3)).isoformat(),
            "due_date": (now + timedelta(days=11)).isoformat(),
            "return_date": None,
            "status": "issued",
            "fine_amount": 0.0,
            "fine_paid": False,
            "notes": "Standard student checkout",
            "created_at": (now - timedelta(days=3)).isoformat()
        },
        # Active issue 3 (due in 5 days)
        {
            "transaction_id": "TXN-2024-006",
            "student_usn": "1MS21CS002",
            "student_name": "Diya Mehta",
            "book_id": "BK100234",
            "book_title": "Ikigai: The Japanese Secret to a Long and Happy Life",
            "librarian_id": "usr-lib-02",
            "librarian_name": "Sarah Jenkins",
            "issue_date": (now - timedelta(days=9)).isoformat(),
            "due_date": (now + timedelta(days=5)).isoformat(),
            "return_date": None,
            "status": "issued",
            "fine_amount": 0.0,
            "fine_paid": False,
            "notes": "Borrowed for literature club",
            "created_at": (now - timedelta(days=9)).isoformat()
        },
        # Returned transaction 1 (returned on time)
        {
            "transaction_id": "TXN-2024-007",
            "student_usn": "1MS21CS001",
            "student_name": "Aarav Sharma",
            "book_id": "BK100237",
            "book_title": "Atomic Habits",
            "librarian_id": "usr-lib-01",
            "librarian_name": "Akhilesh Kumar",
            "issue_date": (now - timedelta(days=20)).isoformat(),
            "due_date": (now - timedelta(days=6)).isoformat(),
            "return_date": (now - timedelta(days=7)).isoformat(),
            "status": "returned",
            "fine_amount": 0.0,
            "fine_paid": True,
            "notes": "Returned on time in pristine condition",
            "created_at": (now - timedelta(days=20)).isoformat()
        },
        # Returned transaction 2 (returned with paid fine)
        {
            "transaction_id": "TXN-2024-008",
            "student_usn": "1MS22IS015",
            "student_name": "Vivaan Kapoor",
            "book_id": "BK100236",
            "book_title": "The Alchemist",
            "librarian_id": "usr-lib-02",
            "librarian_name": "Sarah Jenkins",
            "issue_date": (now - timedelta(days=25)).isoformat(),
            "due_date": (now - timedelta(days=11)).isoformat(),
            "return_date": (now - timedelta(days=8)).isoformat(),
            "status": "returned",
            "fine_amount": 15.0,
            "fine_paid": True,
            "notes": "Fine settled via UPI",
            "created_at": (now - timedelta(days=25)).isoformat()
        }
    ]

    for tx in transactions_sample:
        db["book_transactions"].insert_one(tx)
        # Update student active borrow count if issued/overdue
        if tx["status"] in ("issued", "overdue"):
            db["students"].update_one(
                {"usn": tx["student_usn"]},
                {"$inc": {"active_borrows_count": 1}}
            )

    # 7. Sample Fines Records
    fines_data = [
        {
            "fine_id": "FINE-2024-01",
            "transaction_id": "TXN-2024-001",
            "student_usn": "1MS21CS042",
            "student_name": "Riya Patel",
            "book_title": "The Great Gatsby",
            "amount": 60.0,
            "days_overdue": 12,
            "status": "unpaid",
            "paid_at": None,
            "collected_by": None,
            "created_at": (now - timedelta(days=1)).isoformat()
        },
        {
            "fine_id": "FINE-2024-02",
            "transaction_id": "TXN-2024-002",
            "student_usn": "1MS21AI019",
            "student_name": "Kabir Verma",
            "book_title": "Deep Work: Rules for Focused Success",
            "amount": 50.0,
            "days_overdue": 10,
            "status": "unpaid",
            "paid_at": None,
            "collected_by": None,
            "created_at": (now - timedelta(days=1)).isoformat()
        },
        {
            "fine_id": "FINE-2024-03",
            "transaction_id": "TXN-2024-008",
            "student_usn": "1MS22IS015",
            "student_name": "Vivaan Kapoor",
            "book_title": "The Alchemist",
            "amount": 15.0,
            "days_overdue": 3,
            "status": "paid",
            "paid_at": (now - timedelta(days=8)).isoformat(),
            "collected_by": "Sarah Jenkins",
            "created_at": (now - timedelta(days=8)).isoformat()
        }
    ]
    for fn in fines_data:
        db["fines"].insert_one(fn)

    # 8. Sample Reservations
    reservations_sample = [
        {
            "reservation_id": "RES-2024-001",
            "student_usn": "1MS21CS001",
            "student_name": "Aarav Sharma",
            "book_id": "BK100244",
            "book_title": "Introduction to Algorithms (CLRS)",
            "request_date": (now - timedelta(days=2)).isoformat(),
            "status": "pending",
            "notified_at": None,
            "created_at": (now - timedelta(days=2)).isoformat()
        },
        {
            "reservation_id": "RES-2024-002",
            "student_usn": "1MS22EC024",
            "student_name": "Sneha Reddy",
            "book_id": "BK100245",
            "book_title": "Clean Code: A Handbook of Agile Software Craftsmanship",
            "request_date": (now - timedelta(days=1)).isoformat(),
            "status": "approved",
            "notified_at": now.isoformat(),
            "created_at": (now - timedelta(days=1)).isoformat()
        }
    ]
    for res in reservations_sample:
        db["reservations"].insert_one(res)

    # 9. Sample Notifications
    notifications_sample = [
        {
            "notification_id": "NOTIF-01",
            "recipient_id": "1MS21CS001",
            "recipient_email": "aarav.sharma@aster.edu",
            "recipient_role": "student",
            "title": "Book Issued: The Subtle Art",
            "message": "You borrowed 'The Subtle Art of Not Giving a F*ck'. Due on " + (now + timedelta(days=8)).strftime("%d %b %Y"),
            "type": "issue",
            "is_read": False,
            "created_at": (now - timedelta(days=6)).isoformat()
        },
        {
            "notification_id": "NOTIF-02",
            "recipient_id": "1MS21CS042",
            "recipient_email": "riya.patel@aster.edu",
            "recipient_role": "student",
            "title": "URGENT: Book Overdue",
            "message": "'The Great Gatsby' is 12 days overdue. Please return immediately to halt fine accumulation.",
            "type": "overdue",
            "is_read": False,
            "created_at": (now - timedelta(days=1)).isoformat()
        },
        {
            "notification_id": "NOTIF-03",
            "recipient_id": "1MS21CS001",
            "recipient_email": "aarav.sharma@aster.edu",
            "recipient_role": "student",
            "title": "Reservation Status Update",
            "message": "Your reservation request for 'Introduction to Algorithms' has been received and is under review.",
            "type": "reservation",
            "is_read": True,
            "created_at": (now - timedelta(days=2)).isoformat()
        }
    ]
    for n in notifications_sample:
        db["notifications"].insert_one(n)

    # 10. Sample Activity Logs (matching recent activities in screenshot)
    activities_sample = [
        {
            "log_id": "LOG-001",
            "user_id": "usr-lib-01",
            "user_name": "Akhilesh Kumar",
            "user_role": "librarian",
            "action": "Book Issued",
            "details": "The Alchemist issued to Paulo Coelho admirer Aarav Sharma",
            "timestamp": (now - timedelta(minutes=25)).isoformat(),
            "created_at": (now - timedelta(minutes=25)).isoformat()
        },
        {
            "log_id": "LOG-002",
            "user_id": "usr-lib-01",
            "user_name": "Akhilesh Kumar",
            "user_role": "librarian",
            "action": "Book Returned",
            "details": "Atomic Habits by James Clear returned on time",
            "timestamp": (now - timedelta(hours=1, minutes=10)).isoformat(),
            "created_at": (now - timedelta(hours=1, minutes=10)).isoformat()
        },
        {
            "log_id": "LOG-003",
            "user_id": "usr-admin-01",
            "user_name": "Dr. Ronald Sterling",
            "user_role": "super_admin",
            "action": "New Member Added",
            "details": "Registered student Aarav Sharma (USN: 1MS21CS001)",
            "timestamp": (now - timedelta(hours=2, minutes=45)).isoformat(),
            "created_at": (now - timedelta(hours=2, minutes=45)).isoformat()
        },
        {
            "log_id": "LOG-004",
            "user_id": "usr-lib-02",
            "user_name": "Sarah Jenkins",
            "user_role": "librarian",
            "action": "Overdue Reminder Sent",
            "details": "Automated due date notices sent to 5 overdue members",
            "timestamp": (now - timedelta(hours=4)).isoformat(),
            "created_at": (now - timedelta(hours=4)).isoformat()
        },
        {
            "log_id": "LOG-005",
            "user_id": "usr-lib-01",
            "user_name": "Akhilesh Kumar",
            "user_role": "librarian",
            "action": "Catalog Updated",
            "details": "Added 3 copies of 'Designing Data-Intensive Applications'",
            "timestamp": (now - timedelta(hours=6)).isoformat(),
            "created_at": (now - timedelta(hours=6)).isoformat()
        }
    ]
    for act in activities_sample:
        db["activity_logs"].insert_one(act)

    logger.info("Sample database initialization successfully completed!")
