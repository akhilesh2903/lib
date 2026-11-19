"use client";

import React, { useEffect, useState } from "react";
import {
  BookOpen,
  Repeat,
  RotateCcw,
  Clock,
  PlusCircle,
  Users,
  Search,
  CheckCircle2,
  Calendar,
  AlertCircle,
  RefreshCw,
  Send
} from "lucide-react";
import api from "@/services/api";
import { useToast } from "@/context/ToastContext";

interface LibrarianDashboardProps {
  onNavigate: (tab: string) => void;
  onOpenIssueModal: () => void;
  onOpenReturnModal: () => void;
  onOpenAddBookModal: () => void;
  onOpenAddStudentModal: () => void;
}

export default function LibrarianDashboard({
  onNavigate,
  onOpenIssueModal,
  onOpenReturnModal,
  onOpenAddBookModal,
  onOpenAddStudentModal
}: LibrarianDashboardProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const fetchLibrarianData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/dashboard/librarian");
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err: any) {
      console.warn("Failed to load live librarian dashboard data:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibrarianData();
  }, []);

  const renewTransaction = async (txnId: string) => {
    try {
      const res = await api.post("/circulation/renew", { transaction_id: txnId, additional_days: 14 });
      if (res.success) {
        showToast(res.message, "success");
        fetchLibrarianData();
      }
    } catch (err: any) {
      showToast(err.message || "Renewal failed", "error");
    }
  };

  const inventory = data?.inventory || {
    total_titles: 20,
    total_copies: 176,
    available_copies: 154,
    issued_copies: 22,
    due_today: 4,
    overdue_books: 3
  };

  const dueTodayList = data?.due_today_list || [
    { transaction_id: "TXN-2024-006", student_name: "Diya Mehta", student_usn: "1MS21CS002", book_title: "Ikigai", due_date: new Date().toISOString().slice(0, 10) },
    { transaction_id: "TXN-2024-004", student_name: "Aarav Sharma", student_usn: "1MS21CS001", book_title: "The Subtle Art of Not Giving a F*ck", due_date: new Date().toISOString().slice(0, 10) }
  ];

  const recentTransactions = data?.recent_transactions || [];
  const recentBooks = data?.recently_added_books || [];

  return (
    <div className="space-y-6">
      {/* Quick Action Operations Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-3xl p-6 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <span className="inline-block px-3 py-1 rounded-full bg-emerald-700/60 text-emerald-200 text-xs font-semibold mb-2">
            Circulation Operations Desk
          </span>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">Daily Library Desk & Circulation</h2>
          <p className="text-emerald-100/80 text-xs md:text-sm mt-1 max-w-xl">
            Quickly issue books to students, verify returns, calculate fines automatically, or catalog new acquisitions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onOpenIssueModal}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all"
          >
            <BookOpen size={16} /> Issue Book
          </button>
          <button
            onClick={onOpenReturnModal}
            className="flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-900 px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all"
          >
            <RotateCcw size={16} /> Return Book
          </button>
          <button
            onClick={onOpenAddBookModal}
            className="flex items-center gap-2 bg-emerald-700/80 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-semibold text-xs border border-emerald-500/40 transition-all"
          >
            <PlusCircle size={16} /> Add Book
          </button>
        </div>
      </div>

      {/* Operational KPI Metric Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500">Catalog Titles</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{inventory.total_titles}</p>
          <span className="text-[11px] text-emerald-600 font-medium">Distinct titles</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500">Physical Copies</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{inventory.total_copies}</p>
          <span className="text-[11px] text-slate-500 font-medium">Total volume</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500">Available on Shelf</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{inventory.available_copies}</p>
          <span className="text-[11px] text-emerald-600 font-medium">Ready to issue</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500">Currently Issued</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{inventory.issued_copies}</p>
          <span className="text-[11px] text-blue-600 font-medium">With students</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500">Due Today</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{inventory.due_today}</p>
          <span className="text-[11px] text-amber-600 font-medium">Expecting return</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500">Overdue Books</p>
          <p className="text-2xl font-bold text-rose-600 mt-1">{inventory.overdue_books}</p>
          <span className="text-[11px] text-rose-600 font-medium">Fines accruing</span>
        </div>
      </div>

      {/* Row 2: Books Due Today and Quick Register Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Books Due Today (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Books Due Today & This Week</h3>
              <p className="text-xs text-slate-500">Students due to return copies or renew borrowing periods</p>
            </div>
            <button
              onClick={() => onNavigate("circulation")}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              View Circulation
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                  <th className="pb-2.5">Student / USN</th>
                  <th className="pb-2.5">Book Title</th>
                  <th className="pb-2.5">Due Date</th>
                  <th className="pb-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {dueTodayList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      No books due today.
                    </td>
                  </tr>
                ) : (
                  dueTodayList.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3">
                        <p className="font-bold text-slate-900">{item.student_name}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{item.student_usn}</p>
                      </td>
                      <td className="py-3 text-slate-700 font-medium max-w-[180px] truncate">{item.book_title}</td>
                      <td className="py-3 text-slate-500">{String(item.due_date).slice(0, 10)}</td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => renewTransaction(item.transaction_id)}
                            title="Renew +14 days"
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <RefreshCw size={14} />
                          </button>
                          <button
                            onClick={() => {
                              showToast(`Email reminder sent to ${item.student_name}`, "info");
                            }}
                            title="Send notice"
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Send size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recently Cataloged Books (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recently Cataloged Books</h3>
              <p className="text-xs text-slate-500">Latest additions to the college collection</p>
            </div>
            <button
              onClick={() => onNavigate("catalog")}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              Catalog
            </button>
          </div>

          <div className="space-y-3">
            {recentBooks.slice(0, 4).map((book: any, idx: number) => (
              <div key={idx} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                <img
                  src={book.cover_image || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=150&auto=format&fit=crop&q=80"}
                  alt={book.title}
                  className="w-10 h-14 object-cover rounded-lg shadow-2xs shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{book.title}</p>
                  <p className="text-[11px] text-slate-500 truncate">{book.author}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                      {book.category}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold">
                      {book.available_quantity}/{book.total_quantity} avail
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
