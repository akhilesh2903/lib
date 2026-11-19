from typing import Optional
from pydantic import BaseModel, Field


class BookCreate(BaseModel):
    book_id: Optional[str] = None
    isbn: str
    title: str
    author: str
    publisher: Optional[str] = "Aster Academic Press"
    edition: Optional[str] = "1st Edition"
    publication_year: Optional[int] = 2024
    category: str
    description: Optional[str] = None
    cover_image: Optional[str] = None
    total_quantity: int = Field(default=5, ge=1)
    shelf_number: Optional[str] = "Rack A-1"
    is_ebook: bool = False
    ebook_url: Optional[str] = None


class BookUpdate(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    isbn: Optional[str] = None
    publisher: Optional[str] = None
    edition: Optional[str] = None
    publication_year: Optional[int] = None
    category: Optional[str] = None
    description: Optional[str] = None
    cover_image: Optional[str] = None
    total_quantity: Optional[int] = None
    shelf_number: Optional[str] = None
    is_ebook: Optional[bool] = None
    ebook_url: Optional[str] = None
