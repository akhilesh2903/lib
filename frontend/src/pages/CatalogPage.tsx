"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Search,
  Plus,
  Filter,
  BookOpen,
  Edit2,
  Trash2,
  BookmarkCheck,
  CheckCircle2,
  X,
  QrCode,
  ScanLine,
  MapPin,
  Users,
  Clock,
  Sparkles,
  Layers,
  ArrowRight,
  Info,
  Check
} from "lucide-react";
import api from "@/services/api";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";

interface CatalogPageProps {
  onOpenIssueModal?: (bookId?: string) => void;
}

export default function CatalogPage({ onOpenIssueModal }: CatalogPageProps) {
  const { role } = useAuth();
  const { showToast } = useToast();
  const [books, setBooks] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<any>(null);
  const [barcodeModalBook, setBarcodeModalBook] = useState<any>(null);

  // Rack & Copy Inspection State
  const [inspectingRackStatus, setInspectingRackStatus] = useState<any>(null);
  const [loadingRackStatus, setLoadingRackStatus] = useState(false);

  // Scanner & Auto-Fill State
  const [scannedIsbnInput, setScannedIsbnInput] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    isbn: "",
    category: "Computer Science",
    publisher: "Aster Academic Press",
    edition: "1st Edition",
    publication_year: 2024,
    total_quantity: 5,
    shelf_number: "Rack CS-01, Shelf 1",
    description: "",
    cover_image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&auto=format&fit=crop&q=80"
  });

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const res = await api.get("/books", {
        params: {
          search,
          category: selectedCategory === "all" ? undefined : selectedCategory,
          available_only: availableOnly ? true : undefined,
          limit: 100
        }
      });
      if (res.success) {
        setBooks(res.data || []);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to load books catalog", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get("/books/categories/list");
      if (res.success) {
        setCategories(res.data || []);
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchBooks();
    fetchCategories();
  }, [selectedCategory, availableOnly]);

  // Focus scanner input when Add Book modal opens
  useEffect(() => {
    if (isAddModalOpen) {
      setTimeout(() => {
        scanInputRef.current?.focus();
      }, 150);
    }
  }, [isAddModalOpen]);

  // Scanner Auto-Fill Lookup
  const handleScanLookup = async (isbnToLookup?: string) => {
    const rawIsbn = (isbnToLookup || scannedIsbnInput).trim();
    if (!rawIsbn) {
      showToast("Please enter or scan an ISBN barcode", "error");
      return;
    }

    try {
      setIsScanning(true);
      showToast("Scanning barcode & resolving book metadata...", "info");
      const res = await api.get(`/books/lookup/isbn/${encodeURIComponent(rawIsbn)}`);
      if (res.success && res.data) {
        const item = res.data;
        setFormData((prev) => ({
          ...prev,
          isbn: item.isbn || rawIsbn,
          title: item.title || prev.title,
          author: item.author || prev.author,
          publisher: item.publisher || prev.publisher,
          edition: item.edition || prev.edition,
          publication_year: item.publication_year || prev.publication_year,
          category: item.category || prev.category,
          description: item.description || prev.description,
          cover_image: item.cover_image || prev.cover_image,
          shelf_number: item.shelf_number || prev.shelf_number
        }));
        showToast(
          res.already_exists
            ? "Book already exists in catalog. Details auto-populated."
            : `Metadata autofilled: '${item.title}'`,
          "success"
        );
      }
    } catch (err: any) {
      showToast(err.message || "ISBN lookup failed", "error");
    } finally {
      setIsScanning(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBooks();
  };

  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post("/books", formData);
      if (res.success) {
        showToast(res.message || "Book successfully added to catalog", "success");
        setIsAddModalOpen(false);
        setScannedIsbnInput("");
        fetchBooks();
        fetchCategories();
        // Reset form
        setFormData({
          title: "",
          author: "",
          isbn: "",
          category: "Computer Science",
          publisher: "Aster Academic Press",
          edition: "1st Edition",
          publication_year: 2024,
          total_quantity: 5,
          shelf_number: "Rack CS-01, Shelf 1",
          description: "",
          cover_image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&auto=format&fit=crop&q=80"
        });
      }
    } catch (err: any) {
      showToast(err.message || "Failed to create book", "error");
    }
  };

  const handleUpdateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBook) return;
    try {
      const res = await api.put(`/books/${editingBook.book_id || editingBook.id}`, formData);
      if (res.success) {
        showToast("Book updated successfully", "success");
        setIsEditModalOpen(false);
        setEditingBook(null);
        fetchBooks();
      }
    } catch (err: any) {
      showToast(err.message || "Failed to update book", "error");
    }
  };

  const handleDeleteBook = async (bookId: string, title: string) => {
    if (!confirm(`Are you sure you want to remove '${title}' from the library catalog?`)) return;
    try {
      const res = await api.delete(`/books/${bookId}`);
      if (res.success) {
        showToast(res.message || "Book deleted", "success");
        fetchBooks();
      }
    } catch (err: any) {
      showToast(err.message || "Cannot delete book", "error");
    }
  };

  const handleReserve = async (bookId: string, title: string) => {
    try {
      const res = await api.post("/reservations/request", { book_id: bookId });
      if (res.success) {
        showToast(res.message, "success");
      }
    } catch (err: any) {
      showToast(err.message || "Reservation could not be placed", "error");
    }
  };

  const openEditModal = (book: any) => {
    setEditingBook(book);
    setFormData({
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      category: book.category,
      publisher: book.publisher || "Aster Academic Press",
      edition: book.edition || "1st Edition",
      publication_year: book.publication_year || 2024,
      total_quantity: book.total_quantity,
      shelf_number: book.shelf_number || "Rack A-1",
      description: book.description || "",
      cover_image: book.cover_image || ""
    });
    setIsEditModalOpen(true);
  };

  // Inspect Rack Location & Copies Breakdown
  const inspectRackAndCopies = async (bookId: string) => {
    try {
      setLoadingRackStatus(true);
      const res = await api.get(`/books/${bookId}/rack-status`);
      if (res.success && res.data) {
        setInspectingRackStatus(res.data);
      }
    } catch (err: any) {
      showToast(err.message || "Could not load rack and reading copies status", "error");
    } finally {
      setLoadingRackStatus(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Book Inventory & Rack Locator</h2>
          <p className="text-xs text-slate-500 font-medium">
            Search physical shelf locations, check copies on shelf vs. out for reading, and auto-catalog via barcode scanner
          </p>
        </div>

        {role !== "student" && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all"
          >
            <ScanLine size={16} /> Scan & Add Book
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by book title, author, ISBN, or Rack/Shelf number (e.g. Rack CS-01)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={availableOnly}
                onChange={(e) => setAvailableOnly(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              Available on Shelf Only
            </label>

            <button
              type="submit"
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
            >
              Search
            </button>
          </div>
        </form>

        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-colors ${
              selectedCategory === "all"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Categories ({books.length})
          </button>
          {categories.map((c) => (
            <button
              key={c.category}
              onClick={() => setSelectedCategory(c.category)}
              className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-colors ${
                selectedCategory === c.category
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {c.category} ({c.count})
            </button>
          ))}
        </div>
      </div>

      {/* Book Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-xs">Loading books catalog...</div>
      ) : books.length === 0 ? (
        <div className="py-20 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
          No books found matching the search criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {books.map((book) => {
            const isAvail = book.available_quantity > 0;
            const readingCopies = Math.max(0, (book.total_quantity || 0) - (book.available_quantity || 0));

            return (
              <div
                key={book.book_id || book.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-4 flex gap-4">
                  <img
                    src={book.cover_image || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&auto=format&fit=crop&q=80"}
                    alt={book.title}
                    className="w-20 h-28 object-cover rounded-xl shadow-2xs shrink-0 group-hover:scale-102 transition-transform"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      {book.category}
                    </span>
                    <h4 className="font-bold text-sm text-slate-900 line-clamp-2 mt-1 leading-snug">{book.title}</h4>
                    <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{book.author}</p>
                    <p className="text-[11px] font-mono text-slate-400 mt-1">ISBN: {book.isbn}</p>

                    {/* Prominent Rack Location Tag */}
                    <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">
                      <MapPin size={13} className="text-emerald-600 shrink-0" />
                      <span className="truncate">{book.shelf_number || "General Rack"}</span>
                    </div>
                  </div>
                </div>

                {/* Copies Breakdown Bar */}
                <div className="px-4 py-2 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1 text-emerald-700 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    {book.available_quantity} On Shelf
                  </span>
                  <span className="flex items-center gap-1 text-blue-700 font-bold">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    {readingCopies} Out for Reading
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="px-4 py-3 bg-white border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    onClick={() => inspectRackAndCopies(book.book_id || book.id)}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    <Info size={13} /> View Copies & Rack
                  </button>

                  <div className="flex items-center gap-1">
                    {/* Barcode Modal Button */}
                    <button
                      onClick={() => setBarcodeModalBook(book)}
                      title="View Barcode"
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      <QrCode size={15} />
                    </button>

                    {role === "student" ? (
                      <button
                        onClick={() => handleReserve(book.book_id || book.id, book.title)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors"
                      >
                        Reserve
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => openEditModal(book)}
                          title="Edit Book Details"
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteBook(book.book_id || book.id, book.title)}
                          title="Delete Book"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                        {onOpenIssueModal && isAvail && (
                          <button
                            onClick={() => onOpenIssueModal(book.book_id || book.id)}
                            className="ml-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors"
                          >
                            Issue
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Inspect Rack Location & Reading Copies Modal */}
      {inspectingRackStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-3">
                <img
                  src={inspectingRackStatus.book.cover_image || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=150&auto=format&fit=crop&q=80"}
                  alt={inspectingRackStatus.book.title}
                  className="w-12 h-16 object-cover rounded-xl shadow-2xs shrink-0"
                />
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">{inspectingRackStatus.book.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{inspectingRackStatus.book.author} • ISBN: {inspectingRackStatus.book.isbn}</p>
                </div>
              </div>
              <button
                onClick={() => setInspectingRackStatus(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X size={20} />
              </button>
            </div>

            {/* Physical Shelf Location Banner */}
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 mb-5">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin size={14} className="text-emerald-600" /> Physical Library Location
              </span>
              <p className="text-lg font-bold text-emerald-950 mt-1">
                {inspectingRackStatus.rack_number}
              </p>
              <p className="text-xs text-emerald-700 mt-0.5">
                {inspectingRackStatus.floor_wing}
              </p>
            </div>

            {/* Copies Breakdown Meter */}
            <div className="grid grid-cols-3 gap-3 mb-5 text-center">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 font-semibold">Total Stock</span>
                <p className="text-xl font-bold text-slate-900 mt-0.5">{inspectingRackStatus.copy_breakdown.total_copies}</p>
                <span className="text-[10px] text-slate-400">Physical copies</span>
              </div>

              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200">
                <span className="text-[11px] text-emerald-700 font-semibold">Available on Shelf</span>
                <p className="text-xl font-bold text-emerald-700 mt-0.5">{inspectingRackStatus.copy_breakdown.available_on_shelf}</p>
                <span className="text-[10px] text-emerald-600">Ready to issue</span>
              </div>

              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200">
                <span className="text-[11px] text-blue-700 font-semibold">Out for Reading</span>
                <p className="text-xl font-bold text-blue-700 mt-0.5">{inspectingRackStatus.copy_breakdown.out_for_reading}</p>
                <span className="text-[10px] text-blue-600">Issued to students</span>
              </div>
            </div>

            {/* Active Borrowers List */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Users size={14} className="text-slate-500" /> Copies Currently Out for Reading ({inspectingRackStatus.active_borrowers?.length || 0})
              </h4>

              {inspectingRackStatus.active_borrowers?.length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400">
                  All copies are currently resting on the shelf in {inspectingRackStatus.rack_number}!
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                  {inspectingRackStatus.active_borrowers.map((borrower: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-900">{borrower.student_name}</p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          USN: {borrower.student_usn} • Borrowed on {String(borrower.issue_date).slice(0, 10)}
                        </p>
                      </div>

                      <div className="text-right">
                        {borrower.is_overdue ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                            {borrower.overdue_days}d Overdue
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                            Due in {borrower.remaining_days} days
                          </span>
                        )}
                        <p className="text-[10px] text-slate-400 mt-0.5">Return by {String(borrower.due_date).slice(0, 10)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setInspectingRackStatus(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
              {onOpenIssueModal && inspectingRackStatus.copy_breakdown.available_on_shelf > 0 && role !== "student" && (
                <button
                  type="button"
                  onClick={() => {
                    const id = inspectingRackStatus.book.book_id;
                    setInspectingRackStatus(null);
                    onOpenIssueModal(id);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                >
                  Issue a Copy
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Book Modal with Barcode Scanner & Autofill */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <ScanLine className="text-emerald-600" size={20} /> Add Book via Scanner & Autofill
                </h3>
                <p className="text-xs text-slate-500">Scan book ISBN to auto-populate metadata and assign to a shelf rack</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {/* Barcode Scanner Input Card */}
            <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl mb-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <ScanLine size={15} className="text-emerald-600" /> Scan Barcode / ISBN (Handheld Scanner or Manual)
                </span>
                <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">
                  Instant Autofill
                </span>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    ref={scanInputRef}
                    type="text"
                    placeholder="Scan barcode or enter ISBN e.g. 9780134494166..."
                    value={scannedIsbnInput}
                    onChange={(e) => setScannedIsbnInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleScanLookup();
                      }
                    }}
                    className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <button
                  type="button"
                  disabled={isScanning}
                  onClick={() => handleScanLookup()}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                >
                  <Sparkles size={14} /> {isScanning ? "Scanning..." : "Scan & Autofill"}
                </button>
              </div>

              {/* Quick Scan Demo Chips */}
              <div className="pt-1">
                <p className="text-[10px] font-semibold text-emerald-800 mb-1.5">Or try scanning these popular textbooks:</p>
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setScannedIsbnInput("978-0134494166");
                      handleScanLookup("978-0134494166");
                    }}
                    className="px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-600 hover:text-white transition-colors font-medium"
                  >
                    Scan "Clean Architecture"
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScannedIsbnInput("978-0134685991");
                      handleScanLookup("978-0134685991");
                    }}
                    className="px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-600 hover:text-white transition-colors font-medium"
                  >
                    Scan "Effective Java"
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScannedIsbnInput("978-0136006633");
                      handleScanLookup("978-0136006633");
                    }}
                    className="px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-600 hover:text-white transition-colors font-medium"
                  >
                    Scan "Artificial Intelligence"
                  </button>
                </div>
              </div>
            </div>

            {/* Book Form Fields (Pre-filled by scanner) */}
            <form onSubmit={handleCreateBook} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Book Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Clean Architecture"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Author *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Robert C. Martin"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ISBN Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 978-0134494166"
                    value={formData.isbn}
                    onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="Education">Education</option>
                    <option value="Fiction">Fiction</option>
                    <option value="Science">Science</option>
                    <option value="Philosophy">Philosophy</option>
                    <option value="Self-Help">Self-Help</option>
                    <option value="Biography">Biography</option>
                    <option value="Reference">Reference</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Total Copies Received *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.total_quantity}
                    onChange={(e) => setFormData({ ...formData, total_quantity: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* SPECIFY BOOK RACK NUMBER (Requested by user) */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <MapPin size={14} className="text-emerald-600" /> Specify Physical Rack / Shelf Location *
                  </label>
                  <span className="text-[10px] text-slate-400">Library Floor Map</span>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rack CS-04, Shelf 2 or Floor 2, Row B, Shelf 3"
                  value={formData.shelf_number}
                  onChange={(e) => setFormData({ ...formData, shelf_number: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />

                {/* Quick Shelf Selection Buttons */}
                <div className="flex flex-wrap gap-1.5 pt-1 text-[11px]">
                  <span className="text-[10px] text-slate-400 self-center">Quick Assign:</span>
                  {["Rack CS-01", "Rack CS-04", "Rack AI-01", "Rack EN-02", "Rack FC-03", "Rack SC-01"].map((rack) => (
                    <button
                      key={rack}
                      type="button"
                      onClick={() => setFormData({ ...formData, shelf_number: `${rack}, Shelf 1` })}
                      className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:border-emerald-500 hover:text-emerald-700 transition-colors"
                    >
                      {rack}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Publisher & Edition</label>
                  <input
                    type="text"
                    placeholder="Prentice Hall, 1st Edition"
                    value={`${formData.publisher} • ${formData.edition}`}
                    onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cover Image URL</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={formData.cover_image}
                    onChange={(e) => setFormData({ ...formData, cover_image: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Book Description / Abstract</label>
                <textarea
                  rows={2}
                  placeholder="Summary of book contents..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
                >
                  Save to Catalog & Rack
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Book Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Edit Book: {editingBook?.title}</h3>
                <p className="text-xs text-slate-500">Update catalog metadata, rack location, and inventory copies</p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateBook} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Book Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Author</label>
                  <input
                    type="text"
                    required
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Total Copies</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.total_quantity}
                    onChange={(e) => setFormData({ ...formData, total_quantity: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Rack / Shelf Location</label>
                  <input
                    type="text"
                    value={formData.shelf_number}
                    onChange={(e) => setFormData({ ...formData, shelf_number: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
                >
                  Update Information
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Display Modal */}
      {barcodeModalBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full text-center shadow-2xl border border-slate-100">
            <div className="flex justify-end">
              <button
                onClick={() => setBarcodeModalBook(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl my-4 flex flex-col items-center">
              <QrCode size={120} className="text-slate-900" />
              <p className="font-mono font-bold text-base text-slate-900 mt-3">
                {barcodeModalBook.book_id || "BK100231"}
              </p>
              <p className="text-[11px] font-mono text-slate-500 mt-0.5">ISBN: {barcodeModalBook.isbn}</p>
            </div>

            <h4 className="font-bold text-sm text-slate-900">{barcodeModalBook.title}</h4>
            <p className="text-xs text-slate-500 mt-0.5">{barcodeModalBook.author}</p>
            <p className="text-xs text-emerald-700 font-semibold mt-2">Location: {barcodeModalBook.shelf_number || "Rack A-1"}</p>

            <button
              onClick={() => {
                showToast("Barcode dispatched to printer queue", "success");
                setBarcodeModalBook(null);
              }}
              className="mt-5 w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
            >
              Print Barcode Tag
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
