"use client";

import React, { useEffect, useState } from "react";
import {
  BookOpen,
  Calendar,
  Clock,
  CheckCircle,
  BookmarkCheck,
  AlertTriangle,
  Search,
  Bell,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Coins
} from "lucide-react";
import api from "@/services/api";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";

interface StudentDashboardProps {
  onNavigate: (tab: string) => void;
}

export default function StudentDashboard({ onNavigate }: StudentDashboardProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/dashboard/student");
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err: any) {
      console.warn("Failed to load live student data:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, []);

  const reserveBook = async (bookId: string, title: string) => {
    try {
      const res = await api.post("/reservations/request", { book_id: bookId });
      if (res.success) {
        showToast(res.message, "success");
        fetchStudentData();
      }
    } catch (err: any) {
      showToast(err.message || "Reservation failed", "error");
    }
  };

  const profile = data?.student_profile || user?.student_profile || {
    name: user?.name || "Aarav Sharma",
    usn: "1MS21CS001",
    department: "Computer Science & Engineering",
    semester: 6,
    email: user?.email || "aarav.sharma@aster.edu",
    phone: "+91 98765 01001",
    profile_picture: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
    max_books_allowed: 4
  };

  const stats = data?.stats || {
    currently_borrowed: 2,
    total_returned: 1,
    overdue_count: 0,
    active_reservations: 1,
    max_allowed: 4
  };

  const activeBorrows = data?.active_borrows || [];
  const readingHistory = data?.reading_history || [];
  const recommendedBooks = data?.recommended_books || [];
  const notifications = data?.notifications || [];
  const fines = data?.fines || [];

  const unpaidFinesTotal = fines
    .filter((f: any) => f.status === "unpaid")
    .reduce((sum: number, f: any) => sum + (f.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Student Welcome & Profile Hero Card */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-800 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <img
              src={profile.profile_picture || "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80"}
              alt={profile.name}
              className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover border-2 border-emerald-400/60 shadow-md"
            />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 text-xs font-semibold backdrop-blur-sm border border-emerald-400/20">
                  Student Member
                </span>
                <span className="font-mono text-xs text-emerald-200 font-bold">{profile.usn}</span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight">Welcome, {profile.name}</h2>
              <p className="text-emerald-100/80 text-xs md:text-sm mt-0.5">
                {profile.department} • Semester {profile.semester} • {profile.email}
              </p>
            </div>
          </div>

          {/* Borrowing Quota Meter */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 w-full md:w-auto min-w-[200px]">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-emerald-100">Borrowing Capacity</span>
              <span className="font-bold text-white">
                {stats.currently_borrowed} / {stats.max_allowed} Books
              </span>
            </div>
            <div className="w-full h-2.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${(stats.currently_borrowed / stats.max_allowed) * 100}%` }}
              />
            </div>
            <p className="text-[11px] text-emerald-200 mt-2 text-right">
              {stats.max_allowed - stats.currently_borrowed} slot(s) available
            </p>
          </div>
        </div>
      </div>

      {/* Unpaid Fine Warning Banner if applicable */}
      {unpaidFinesTotal > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-rose-900">Outstanding Overdue Fine: ₹{unpaidFinesTotal}</p>
              <p className="text-xs text-rose-600">Please clear overdue balances at the library circulation desk to keep borrowing privileges active.</p>
            </div>
          </div>
          <button
            onClick={() => onNavigate("fines")}
            className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition-colors shrink-0"
          >
            View Details
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2 mb-2 text-emerald-600">
            <BookOpen size={18} />
            <span className="text-xs font-semibold text-slate-500">Currently Borrowed</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.currently_borrowed}</p>
          <span className="text-[11px] text-emerald-600 font-medium">Active loans</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2 mb-2 text-blue-600">
            <CheckCircle size={18} />
            <span className="text-xs font-semibold text-slate-500">Total Returned</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.total_returned}</p>
          <span className="text-[11px] text-blue-600 font-medium">Returned on record</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2 mb-2 text-rose-600">
            <Clock size={18} />
            <span className="text-xs font-semibold text-slate-500">Overdue Books</span>
          </div>
          <p className="text-2xl font-bold text-rose-600">{stats.overdue_count}</p>
          <span className="text-[11px] text-rose-600 font-medium">Pending return</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2 mb-2 text-purple-600">
            <BookmarkCheck size={18} />
            <span className="text-xs font-semibold text-slate-500">Reservations</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.active_reservations}</p>
          <span className="text-[11px] text-purple-600 font-medium">Hold requests</span>
        </div>
      </div>

      {/* Row 2: Currently Borrowed Books */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-slate-900">My Currently Borrowed Books</h3>
            <p className="text-xs text-slate-500">Keep track of upcoming return deadlines to avoid fines</p>
          </div>
          <button
            onClick={() => onNavigate("my-books")}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            View All <ArrowRight size={14} />
          </button>
        </div>

        {activeBorrows.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-xs">
            You do not have any borrowed books at the moment. Browse the catalog to borrow books!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeBorrows.map((item: any, idx: number) => {
              const isOverdue = item.is_overdue || item.overdue_days > 0;
              return (
                <div
                  key={idx}
                  className="flex gap-4 p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                >
                  <img
                    src={item.cover_image || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=150&auto=format&fit=crop&q=80"}
                    alt={item.book_title}
                    className="w-16 h-22 object-cover rounded-xl shadow-2xs shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-sm text-slate-900 truncate">{item.book_title}</h4>
                      {isOverdue ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 shrink-0">
                          {item.overdue_days}d OVERDUE
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 shrink-0">
                          {item.remaining_days} days left
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{item.author || "Academic Author"}</p>
                    <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
                      <span>Issued: {String(item.issue_date).slice(0, 10)}</span>
                      <span className="font-bold text-slate-800">Due: {String(item.due_date).slice(0, 10)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Row 3: Recommended Books Carousel & Discovery */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles size={16} className="text-emerald-500" /> Recommended Books for You
            </h3>
            <p className="text-xs text-slate-500">Popular and highly rated titles available right now</p>
          </div>
          <button
            onClick={() => onNavigate("catalog")}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            Explore Catalog <ArrowRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {recommendedBooks.slice(0, 6).map((book: any, idx: number) => (
            <div
              key={idx}
              className="group flex flex-col justify-between p-3 rounded-2xl border border-slate-100 hover:border-emerald-500/40 bg-white hover:shadow-md transition-all"
            >
              <div>
                <img
                  src={book.cover_image || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=150&auto=format&fit=crop&q=80"}
                  alt={book.title}
                  className="w-full h-36 object-cover rounded-xl shadow-2xs mb-2.5 group-hover:scale-102 transition-transform"
                />
                <h5 className="font-bold text-xs text-slate-900 line-clamp-2 leading-snug">{book.title}</h5>
                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{book.author}</p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-emerald-600 font-bold">
                  {book.available_quantity} available
                </span>
                <button
                  onClick={() => reserveBook(book.book_id || book.id, book.title)}
                  className="text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 rounded-lg transition-colors"
                >
                  Reserve
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
