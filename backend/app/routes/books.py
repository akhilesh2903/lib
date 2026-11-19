from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Depends, status
from app.database.connection import get_db
from app.schemas.book import BookCreate, BookUpdate
from app.middleware.auth_middleware import get_current_user, require_librarian_or_admin
from app.utils.helpers import serialize_doc, serialize_docs, generate_unique_id
from app.services.log_service import log_activity

router = APIRouter(prefix="/books", tags=["Books"])


@router.get("")
def get_books(
    search: Optional[str] = None,
    category: Optional[str] = None,
    available_only: Optional[bool] = False,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100)
):
    db = get_db()
    all_books = list(db["books"].find())

    filtered = []
    for b in all_books:
        # Search query matching
        if search:
            q = search.lower().strip()
            title_match = q in b.get("title", "").lower()
            author_match = q in b.get("author", "").lower()
            isbn_match = q in b.get("isbn", "").lower()
            book_id_match = q in b.get("book_id", "").lower()
            if not (title_match or author_match or isbn_match or book_id_match):
                continue

        # Category filter
        if category and category.lower() != "all":
            if b.get("category", "").lower() != category.lower():
                continue

        # Availability filter
        if available_only:
            if b.get("available_quantity", 0) <= 0:
                continue

        filtered.append(b)

    # Sort descending by date added
    filtered.sort(key=lambda x: x.get("created_at", ""), reverse=True)

    total_count = len(filtered)
    start_idx = (page - 1) * limit
    paged_items = filtered[start_idx:start_idx + limit]

    return {
        "success": True,
        "data": serialize_docs(paged_items),
        "pagination": {
            "page": page,
            "limit": limit,
            "total_items": total_count,
            "total_pages": max(1, (total_count + limit - 1) // limit)
        }
    }


# Common academic & library catalog metadata database for instant offline & fast lookup
OFFLINE_ISBN_CATALOG = {
    "9780134494166": {
        "title": "Clean Architecture: A Craftsman's Guide to Software Structure and Design",
        "author": "Robert C. Martin",
        "publisher": "Prentice Hall",
        "edition": "1st Edition",
        "publication_year": 2017,
        "category": "Computer Science",
        "description": "By applying universal rules of software architecture, you can dramatically improve developer productivity throughout the life of any software system.",
        "cover_image": "https://images.unsplash.com/photo-1532012164546-f432f2e3777f?w=300&auto=format&fit=crop&q=80",
        "shelf_number": "Rack CS-04, Shelf 2"
    },
    "9780132350884": {
        "title": "Clean Code: A Handbook of Agile Software Craftsmanship",
        "author": "Robert C. Martin",
        "publisher": "Prentice Hall",
        "edition": "1st Edition",
        "publication_year": 2008,
        "category": "Computer Science",
        "description": "Even bad code can function. But if code isn't clean, it can bring a development organization to its knees.",
        "cover_image": "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=300&auto=format&fit=crop&q=80",
        "shelf_number": "Rack CS-05, Shelf 1"
    },
    "9780262033848": {
        "title": "Introduction to Algorithms (CLRS)",
        "author": "Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein",
        "publisher": "MIT Press",
        "edition": "4th Edition",
        "publication_year": 2022,
        "category": "Computer Science",
        "description": "A comprehensive textbook and standard reference on modern data structures and computer algorithms.",
        "cover_image": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=300&auto=format&fit=crop&q=80",
        "shelf_number": "Rack CS-03, Shelf 3"
    },
    "9780131103627": {
        "title": "The C Programming Language",
        "author": "Brian W. Kernighan & Dennis M. Ritchie",
        "publisher": "Prentice Hall",
        "edition": "2nd Edition",
        "publication_year": 1988,
        "category": "Computer Science",
        "description": "The definitive classic guide to C programming, written directly by the creators of C and Unix.",
        "cover_image": "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=300&auto=format&fit=crop&q=80",
        "shelf_number": "Rack CS-01, Shelf 1"
    },
    "9781449373320": {
        "title": "Designing Data-Intensive Applications",
        "author": "Martin Kleppmann",
        "publisher": "O'Reilly Media",
        "edition": "1st Edition",
        "publication_year": 2017,
        "category": "Computer Science",
        "description": "The big ideas behind reliable, scalable, and maintainable systems in modern cloud architectures.",
        "cover_image": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=300&auto=format&fit=crop&q=80",
        "shelf_number": "Rack CS-09, Shelf 4"
    },
    "9780134685991": {
        "title": "Effective Java",
        "author": "Joshua Bloch",
        "publisher": "Addison-Wesley",
        "edition": "3rd Edition",
        "publication_year": 2018,
        "category": "Computer Science",
        "description": "Definitive guide to best practices in the Java programming language from a principal Java architect.",
        "cover_image": "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=300&auto=format&fit=crop&q=80",
        "shelf_number": "Rack CS-06, Shelf 2"
    },
    "9780131177055": {
        "title": "Working Effectively with Legacy Code",
        "author": "Michael C. Feathers",
        "publisher": "Prentice Hall",
        "edition": "1st Edition",
        "publication_year": 2004,
        "category": "Computer Science",
        "description": "Strategies and mechanics for safely modifying, refactoring, and adding tests to complex legacy systems.",
        "cover_image": "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=300&auto=format&fit=crop&q=80",
        "shelf_number": "Rack CS-08, Shelf 3"
    },
    "9780201633610": {
        "title": "Design Patterns: Elements of Reusable Object-Oriented Software",
        "author": "Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides (Gang of Four)",
        "publisher": "Addison-Wesley",
        "edition": "1st Edition",
        "publication_year": 1994,
        "category": "Computer Science",
        "description": "Captures a wealth of experience about the design of object-oriented software through 23 classic design patterns.",
        "cover_image": "https://images.unsplash.com/photo-1516259762381-22954d7d3ad2?w=300&auto=format&fit=crop&q=80",
        "shelf_number": "Rack CS-02, Shelf 2"
    },
    "9780136006633": {
        "title": "Artificial Intelligence: A Modern Approach",
        "author": "Stuart Russell & Peter Norvig",
        "publisher": "Pearson",
        "edition": "4th Edition",
        "publication_year": 2020,
        "category": "Science",
        "description": "The leading textbook in Artificial Intelligence, covering search, logic, probabilistic models, machine learning, and robotics.",
        "cover_image": "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=300&auto=format&fit=crop&q=80",
        "shelf_number": "Rack AI-01, Shelf 1"
    }
}


@router.get("/lookup/isbn/{raw_isbn}")
def lookup_isbn_metadata(raw_isbn: str):
    """
    Auto-fetches book metadata by ISBN scanned via handheld barcode scanner or camera.
    Returns title, author, publisher, year, category, description, and suggested rack location.
    """
    db = get_db()
    clean_isbn = raw_isbn.replace("-", "").replace(" ", "").strip()

    # 1. Check if book already exists in local database
    existing_book = db["books"].find_one({"$or": [{"isbn": raw_isbn}, {"isbn": clean_isbn}]})
    if existing_book:
        return {
            "success": True,
            "source": "institution_database",
            "message": "Book already registered in library catalog",
            "already_exists": True,
            "data": serialize_doc(existing_book)
        }

    # 2. Check offline pre-loaded library catalog
    if clean_isbn in OFFLINE_ISBN_CATALOG:
        book_info = OFFLINE_ISBN_CATALOG[clean_isbn]
        return {
            "success": True,
            "source": "curated_catalog",
            "message": "Scanned ISBN identified from academic catalog",
            "already_exists": False,
            "data": {
                "isbn": raw_isbn,
                **book_info
            }
        }

    # 3. Query OpenLibrary / Google Books API if online
    try:
        import urllib.request
        import json
        req_url = f"https://openlibrary.org/api/books?bibkeys=ISBN:{clean_isbn}&jscmd=data&format=json"
        req = urllib.request.Request(req_url, headers={"User-Agent": "AsterLibrarySystem/2.0"})
        with urllib.request.urlopen(req, timeout=3.0) as response:
            payload = json.loads(response.read().decode())
            key = f"ISBN:{clean_isbn}"
            if key in payload:
                item = payload[key]
                authors = ", ".join(a.get("name", "") for a in item.get("authors", [])) or "Academic Author"
                publishers = ", ".join(p.get("name", "") for p in item.get("publishers", [])) or "Academic Press"
                publish_date = item.get("publish_date", "2024")
                year = 2024
                try:
                    import re
                    match = re.search(r"\d{4}", publish_date)
                    if match:
                        year = int(match.group())
                except Exception:
                    pass

                cover = item.get("cover", {}).get("large") or f"https://covers.openlibrary.org/b/isbn/{clean_isbn}-L.jpg"
                subjects = item.get("subjects", [])
                category = "Computer Science"
                if any("fiction" in str(s).lower() for s in subjects):
                    category = "Fiction"
                elif any("science" in str(s).lower() for s in subjects):
                    category = "Science"
                elif any("history" in str(s).lower() for s in subjects):
                    category = "History"
                elif any("business" in str(s).lower() or "finance" in str(s).lower() for s in subjects):
                    category = "Finance"

                return {
                    "success": True,
                    "source": "open_library",
                    "message": "Scanned ISBN successfully resolved via Open Library",
                    "already_exists": False,
                    "data": {
                        "isbn": raw_isbn,
                        "title": item.get("title", f"Book ISBN {raw_isbn}"),
                        "author": authors,
                        "publisher": publishers,
                        "edition": "1st Edition",
                        "publication_year": year,
                        "category": category,
                        "description": item.get("notes") or f"Official academic accession for {item.get('title')}",
                        "cover_image": cover,
                        "shelf_number": f"Rack {category[:2].upper()}-01, Shelf 1"
                    }
                }
    except Exception as e:
        print(f"Online ISBN lookup failed ({e}), returning structured template")

    # 4. Fallback template for any unscanned custom barcode
    return {
        "success": True,
        "source": "barcode_scanner_template",
        "message": "Barcode scanned. Please verify title and specify shelf rack.",
        "already_exists": False,
        "data": {
            "isbn": raw_isbn,
            "title": f"Academic Book ({clean_isbn[-4:]})",
            "author": "Faculty Author",
            "publisher": "Academic Press",
            "edition": "1st Edition",
            "publication_year": 2024,
            "category": "Education",
            "description": f"Accessioned copy scanned with ISBN {raw_isbn}.",
            "cover_image": f"https://covers.openlibrary.org/b/isbn/{clean_isbn}-L.jpg",
            "shelf_number": "Rack ED-01, Shelf 2"
        }
    }


@router.get("/{book_identifier}/rack-status")
def get_book_rack_and_copies_status(book_identifier: str):
    """
    Returns where the book is located (Rack/Shelf Number) and a complete copy status breakdown:
    - Total copies
    - Available copies on shelf ready to borrow
    - Copies currently out for reading (issued to students)
    - Detailed list of students reading the copies with issue & due dates
    """
    db = get_db()
    book = db["books"].find_one({
        "$or": [
            {"_id": book_identifier},
            {"book_id": book_identifier},
            {"isbn": book_identifier}
        ]
    })
    if not book:
        raise HTTPException(status_code=404, detail="Book not found in library catalog")

    book_id = book.get("book_id")

    # Fetch all active loan transactions for this book
    active_txns = list(db["book_transactions"].find({
        "book_id": book_id,
        "status": {"$in": ["issued", "overdue"]}
    }))

    borrowers = []
    from app.utils.helpers import calculate_overdue_days
    from datetime import datetime

    now = datetime.utcnow()
    for tx in active_txns:
        overdue_days = calculate_overdue_days(tx.get("due_date"))
        remaining_days = 0
        due_str = tx.get("due_date")
        if due_str and overdue_days == 0:
            try:
                due_dt = datetime.fromisoformat(due_str.replace("Z", "+00:00")).replace(tzinfo=None)
                remaining_days = max(0, int((due_dt - now).total_seconds() // 86400))
            except Exception:
                pass

        borrowers.append({
            "transaction_id": tx.get("transaction_id"),
            "student_name": tx.get("student_name"),
            "student_usn": tx.get("student_usn"),
            "issue_date": tx.get("issue_date"),
            "due_date": tx.get("due_date"),
            "status": tx.get("status"),
            "is_overdue": overdue_days > 0,
            "overdue_days": overdue_days,
            "remaining_days": remaining_days
        })

    # Location wing description
    shelf_no = book.get("shelf_number", "General Rack")
    floor_wing = "Central Stacks"
    if "CS" in shelf_no or "AI" in shelf_no:
        floor_wing = "2nd Floor - Computing & Technology Wing"
    elif "EE" in shelf_no or "ME" in shelf_no or "CV" in shelf_no:
        floor_wing = "2nd Floor - Engineering Stacks"
    elif "F" in shelf_no or "FC" in shelf_no:
        floor_wing = "1st Floor - Fiction & Literature Hall"
    elif "P" in shelf_no or "PH" in shelf_no or "B" in shelf_no:
        floor_wing = "3rd Floor - Humanities & Reference Section"

    total_copies = book.get("total_quantity", 0)
    avail_copies = book.get("available_quantity", 0)
    issued_copies = len(borrowers) if len(borrowers) > 0 else book.get("issued_quantity", 0)

    return {
        "success": True,
        "data": {
            "book": serialize_doc(book),
            "rack_number": shelf_no,
            "floor_wing": floor_wing,
            "copy_breakdown": {
                "total_copies": total_copies,
                "available_on_shelf": avail_copies,
                "out_for_reading": issued_copies,
                "availability_rate_pct": round((avail_copies / max(total_copies, 1)) * 100, 1)
            },
            "status_label": "In Stock on Shelf" if avail_copies > 0 else "All Copies Out for Reading",
            "active_borrowers": borrowers
        }
    }



@router.get("/{book_identifier}")
def get_book(book_identifier: str):
    db = get_db()
    book = db["books"].find_one({
        "$or": [
            {"_id": book_identifier},
            {"book_id": book_identifier},
            {"isbn": book_identifier}
        ]
    })
    if not book:
        raise HTTPException(status_code=404, detail=f"Book '{book_identifier}' not found in catalog")
    return {"success": True, "data": serialize_doc(book)}


@router.post("", status_code=status.HTTP_201_CREATED)
def create_book(payload: BookCreate, current_user: dict = Depends(require_librarian_or_admin)):
    db = get_db()
    # Check ISBN uniqueness
    existing = db["books"].find_one({"isbn": payload.isbn.strip()})
    if existing:
        raise HTTPException(status_code=400, detail=f"A book with ISBN '{payload.isbn}' is already registered: '{existing.get('title')}'")

    book_id = payload.book_id or f"BK{generate_unique_id('')[1:]}"
    if not book_id.startswith("BK"):
        book_id = f"BK{book_id}"

    new_book = {
        "_id": str(book_id),
        "book_id": str(book_id),
        "isbn": payload.isbn.strip(),
        "title": payload.title.strip(),
        "author": payload.author.strip(),
        "publisher": payload.publisher or "Aster Academic Press",
        "edition": payload.edition or "1st Edition",
        "publication_year": payload.publication_year or datetime.utcnow().year,
        "category": payload.category.strip(),
        "description": payload.description or "",
        "cover_image": payload.cover_image or "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&auto=format&fit=crop&q=80",
        "total_quantity": payload.total_quantity,
        "available_quantity": payload.total_quantity,
        "issued_quantity": 0,
        "shelf_number": payload.shelf_number or "General Shelf",
        "is_ebook": payload.is_ebook,
        "ebook_url": payload.ebook_url,
        "added_by_name": current_user.get("name", "Librarian"),
        "added_by_id": str(current_user.get("_id")),
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }

    db["books"].insert_one(new_book)

    log_activity(
        user_id=str(current_user.get("_id")),
        user_name=current_user.get("name"),
        user_role=current_user.get("role"),
        action="Book Added",
        details=f"Added '{new_book['title']}' ({new_book['book_id']}) to inventory"
    )

    return {"success": True, "message": "Book successfully added to catalog", "data": serialize_doc(new_book)}


@router.put("/{book_identifier}")
def update_book(book_identifier: str, payload: BookUpdate, current_user: dict = Depends(require_librarian_or_admin)):
    db = get_db()
    book = db["books"].find_one({
        "$or": [
            {"_id": book_identifier},
            {"book_id": book_identifier}
        ]
    })
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    update_fields = {}
    for k, v in payload.dict(exclude_unset=True).items():
        if v is not None:
            update_fields[k] = v

    if "total_quantity" in update_fields:
        diff = update_fields["total_quantity"] - book.get("total_quantity", 0)
        new_avail = book.get("available_quantity", 0) + diff
        if new_avail < 0:
            raise HTTPException(status_code=400, detail=f"Cannot reduce total copies below currently issued count ({book.get('issued_quantity', 0)} issued).")
        update_fields["available_quantity"] = new_avail

    update_fields["updated_at"] = datetime.utcnow().isoformat()
    db["books"].update_one({"_id": book["_id"]}, {"$set": update_fields})

    log_activity(
        user_id=str(current_user.get("_id")),
        user_name=current_user.get("name"),
        user_role=current_user.get("role"),
        action="Book Updated",
        details=f"Updated details for '{book.get('title')}' ({book.get('book_id')})"
    )

    updated_book = db["books"].find_one({"_id": book["_id"]})
    return {"success": True, "message": "Book information updated", "data": serialize_doc(updated_book)}


@router.delete("/{book_identifier}")
def delete_book(book_identifier: str, current_user: dict = Depends(require_librarian_or_admin)):
    db = get_db()
    book = db["books"].find_one({
        "$or": [
            {"_id": book_identifier},
            {"book_id": book_identifier}
        ]
    })
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    # Prevent deletion if active issues exist
    active_issues = db["book_transactions"].count_documents({
        "book_id": book.get("book_id"),
        "status": {"$in": ["issued", "overdue"]}
    })
    if active_issues > 0 or book.get("issued_quantity", 0) > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete book '{book.get('title')}': {active_issues} copy/copies are currently issued to students."
        )

    db["books"].delete_one({"_id": book["_id"]})

    log_activity(
        user_id=str(current_user.get("_id")),
        user_name=current_user.get("name"),
        user_role=current_user.get("role"),
        action="Book Removed",
        details=f"Deleted '{book.get('title')}' ({book.get('book_id')}) from catalog"
    )

    return {"success": True, "message": f"Book '{book.get('title')}' successfully deleted"}
