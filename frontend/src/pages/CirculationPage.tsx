"use client";

import React, { useEffect, useState } from "react";
import {
  Repeat,
  RotateCcw,
  BookOpen,
  Clock,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Send,
  Calendar,
  X,
  Plus
} from "lucide-react";
import api from "@/services/api";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";

interface CirculationPageProps {
  initialTab?: "active" | "overdue" | "history";
}

export default function CirculationPage({ initialTab = "active" }: CirculationPageProps) {
  const { role } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"active" | "overdue" | "history">(initialTab);
  const [loading, setLoading] = useState(true);

  // Data lists
  const [activeLoans, setActiveLoans] = useState<any[]>([]);
  const [overdueLoans, setOverdueLoans] = useState<any[]>([]);
  const [historyList, setHistoryList] = useState<any[]>([]);

  // Search filter
  const [search, setSearch] = useState("");

  // Issue Book Modal State
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [issueForm, setIssueForm] = useState({
    student_usn: "",
    book_id: "",
    custom_due_date: "",
    notes: ""
  });

  // Return Book Modal State
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnForm, setReturnForm] = useState({
    transaction_id: "",
    fine_collected: 0.0,
    notes: ""
  });
  const [lookupResult, setLookupResult] = useState<any>(null);

  const fetchCirculationData = async () => {
    try {
      setLoading(true);
      const [activeRes, overdueRes, historyRes] = await Promise.all([
        api.get("/circulation/active"),
        api.get("/circulation/overdue"),
        api.get("/circulation/history", { params: { limit: 50 } })
      ]);

      if (activeRes.success) setActiveLoans(activeRes.data || []);
      if (overdueRes.success) setOverdueLoans(overdueRes.data || []);
      if (historyRes.success) setHistoryList(historyRes.data || []);
    } catch (err: any) {
      showToast(err.message || "Failed to load circulation records", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCirculationData();
  }, []);

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post("/circulation/issue", {
        student_usn: issueForm.student_usn.trim(),
        book_id: issueForm.book_id.trim(),
        custom_due_date: issueForm.custom_due_date || undefined,
        notes: issueForm.notes || undefined
      });

      if (res.success) {
        showToast(res.message || "Book successfully issued", "success");
        setIsIssueModalOpen(false);
        setIssueForm({ student_usn: "", book_id: "", custom_due_date: "", notes: "" });
        fetchCirculationData();
      }
    } catch (err: any) {
      showToast(err.message || "Could not issue book", "error");
    }
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post("/circulation/return", {
        transaction_id: returnForm.transaction_id.trim(),
        fine_collected: Number(returnForm.fine_collected) || 0.0,
        notes: returnForm.notes || undefined
      });

      if (res.success) {
        showToast(res.message || "Book successfully returned", "success");
        setIsReturnModalOpen(false);
        setReturnForm({ transaction_id: "", fine_collected: 0.0, notes: "" });
        setLookupResult(null);
        fetchCirculationData();
      }
    } catch (err: any) {
      showToast(err.message || "Failed to process return", "error");
    }
  };

  const handleRenew = async (txnId: string) => {
    try {
      const res = await api.post("/circulation/renew", { transaction_id: txnId, additional_days: 14 });
      if (res.success) {
        showToast(res.message, "success");
        fetchCirculationData();
      }
    } catch (err: any) {
      showToast(err.message || "Renewal failed", "error");
    }
  };

  const handleQuickReturnClick = (item: any) => {
    setReturnForm({
      transaction_id: item.transaction_id || item._id,
      fine_collected: item.days_overdue > 0 ? (item.calculated_fine || item.days_overdue * 5.0) : 0.0,
      notes: "Returned via desk counter"
    });
    setLookupResult(item);
    setIsReturnModalOpen(true);
  };

  const filterItems = (list: any[]) => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (item) =>
        item.book_title?.toLowerCase().includes(q) ||
        item.student_name?.toLowerCase().includes(q) ||
        item.student_usn?.toLowerCase().includes(q) ||
        item.transaction_id?.toLowerCase().includes(q)
    );
  };

  return (
    <div className="space-y-6">
      {/* Header and Quick Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Circulation Desk</h2>
          <p className="text-xs text-slate-500 font-medium">Issue, return, and track book loans across the campus</p>
        </div>

        {role !== "student" && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsReturnModalOpen(true)}
              className="flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-900 border border-slate-200 font-bold text-xs px-4 py-2.5 rounded-xl shadow-2xs transition-all"
            >
              <RotateCcw size={15} /> Return Book
            </button>
            <button
              onClick={() => setIsIssueModalOpen(true)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all"
            >
              <BookOpen size={15} /> Issue Book
            </button>
          </div>
        )}
      </div>

      {/* Tabs & Search */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab("active")}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === "active" ? "bg-white text-emerald-800 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Active Borrowings ({activeLoans.length})
            </button>
            <button
              onClick={() => setActiveTab("overdue")}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === "overdue" ? "bg-white text-rose-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Overdue Tracker ({overdueLoans.length})
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === "history" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Loan History ({historyList.length})
            </button>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by student, USN, or book..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Tables View */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-xs">Loading circulation records...</div>
        ) : activeTab === "active" ? (
          /* Active Loans Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Txn ID</th>
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Book Title</th>
                  <th className="py-3.5 px-4">Issued On</th>
                  <th className="py-3.5 px-4">Due Date</th>
                  <th className="py-3.5 px-4">Status / Time Left</th>
                  {role !== "student" && <th className="py-3.5 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filterItems(activeLoans).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No active book borrowings currently.
                    </td>
                  </tr>
                ) : (
                  filterItems(activeLoans).map((item) => (
                    <tr key={item.transaction_id || item._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-500 text-[11px]">{item.transaction_id}</td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{item.student_name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{item.student_usn}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-800 max-w-[200px] truncate">{item.book_title}</p>
                        <p className="text-[10px] text-slate-400 font-mono">ID: {item.book_id}</p>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{String(item.issue_date).slice(0, 10)}</td>
                      <td className="py-3 px-4 font-semibold text-slate-700">{String(item.due_date).slice(0, 10)}</td>
                      <td className="py-3 px-4">
                        {item.is_overdue || item.days_overdue > 0 ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700">
                            {item.days_overdue}d Overdue
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700">
                            {item.remaining_days} days left
                          </span>
                        )}
                      </td>
                      {role !== "student" && (
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleRenew(item.transaction_id || item._id)}
                              className="px-2.5 py-1 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-bold text-xs transition-colors"
                            >
                              Renew
                            </button>
                            <button
                              onClick={() => handleQuickReturnClick(item)}
                              className="px-2.5 py-1 rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 font-bold text-xs transition-colors"
                            >
                              Return
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : activeTab === "overdue" ? (
          /* Overdue Tracker Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Txn ID</th>
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Book Title</th>
                  <th className="py-3.5 px-4">Due Date</th>
                  <th className="py-3.5 px-4">Days Overdue</th>
                  <th className="py-3.5 px-4">Accrued Fine</th>
                  {role !== "student" && <th className="py-3.5 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filterItems(overdueLoans).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No overdue books at this time. All books are returned or on schedule!
                    </td>
                  </tr>
                ) : (
                  filterItems(overdueLoans).map((item) => (
                    <tr key={item.transaction_id || item._id} className="hover:bg-rose-50/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-500 text-[11px]">{item.transaction_id}</td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{item.student_name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{item.student_usn}</p>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{item.book_title}</td>
                      <td className="py-3 px-4 text-slate-500">{String(item.due_date).slice(0, 10)}</td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700">
                          {item.days_overdue} days
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-rose-600 text-xs">
                        ₹{item.fine_amount || (item.days_overdue * 5.0)}
                      </td>
                      {role !== "student" && (
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                showToast(`Overdue reminder SMS/Email triggered for ${item.student_name}`, "info");
                              }}
                              className="px-2.5 py-1 rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 font-bold text-xs transition-colors flex items-center gap-1"
                            >
                              <Send size={12} /> Notice
                            </button>
                            <button
                              onClick={() => handleQuickReturnClick(item)}
                              className="px-2.5 py-1 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-bold text-xs transition-colors"
                            >
                              Receive Return
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* History Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Txn ID</th>
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Book Title</th>
                  <th className="py-3.5 px-4">Issued On</th>
                  <th className="py-3.5 px-4">Returned On</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Fine Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filterItems(historyList).map((item) => (
                  <tr key={item.transaction_id || item._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-500 text-[11px]">{item.transaction_id}</td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{item.student_name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{item.student_usn}</p>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{item.book_title}</td>
                    <td className="py-3 px-4 text-slate-500">{String(item.issue_date).slice(0, 10)}</td>
                    <td className="py-3 px-4 text-slate-500">{item.return_date ? String(item.return_date).slice(0, 10) : "-"}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {item.fine_amount > 0 ? (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.fine_paid ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                          ₹{item.fine_amount} ({item.fine_paid ? "Settled" : "Unpaid"})
                        </span>
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Issue Book Modal */}
      {isIssueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Issue Book to Student</h3>
                <p className="text-xs text-slate-500">Record a circulation loan in the system</p>
              </div>
              <button
                onClick={() => setIsIssueModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleIssueSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Student USN *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1MS21CS001"
                  value={issueForm.student_usn}
                  onChange={(e) => setIssueForm({ ...issueForm, student_usn: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">Sample USNs: 1MS21CS001, 1MS21CS002, 1MS22EC024</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Book ID or ISBN *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BK100231 or 978-0062457714"
                  value={issueForm.book_id}
                  onChange={(e) => setIssueForm({ ...issueForm, book_id: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">Sample Book IDs: BK100231, BK100236, BK100244</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Custom Due Date (Optional)</label>
                <input
                  type="date"
                  value={issueForm.custom_due_date}
                  onChange={(e) => setIssueForm({ ...issueForm, custom_due_date: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">Defaults to 14 days configured by system settings.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Remarks</label>
                <input
                  type="text"
                  placeholder="Standard loan, book in good condition"
                  value={issueForm.notes}
                  onChange={(e) => setIssueForm({ ...issueForm, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsIssueModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
                >
                  Confirm Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return Book Modal */}
      {isReturnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Return Borrowed Book</h3>
                <p className="text-xs text-slate-500">Record check-in and assess overdue fines</p>
              </div>
              <button
                onClick={() => setIsReturnModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleReturnSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Transaction ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TXN-2024-001 or TXN-2024-004"
                  value={returnForm.transaction_id}
                  onChange={(e) => setReturnForm({ ...returnForm, transaction_id: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {lookupResult && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                  <p className="font-bold text-slate-900">{lookupResult.book_title}</p>
                  <p className="text-slate-600">Borrowed by: {lookupResult.student_name} ({lookupResult.student_usn})</p>
                  {lookupResult.days_overdue > 0 && (
                    <p className="text-rose-600 font-bold">
                      {lookupResult.days_overdue} days overdue • Fine: ₹{lookupResult.fine_amount || lookupResult.days_overdue * 5.0}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Fine Collected (₹)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={returnForm.fine_collected}
                  onChange={(e) => setReturnForm({ ...returnForm, fine_collected: parseFloat(e.target.value) || 0.0 })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">If zero, any accrued overdue fine will be marked as unpaid.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Return Remarks</label>
                <input
                  type="text"
                  placeholder="Book returned in acceptable condition"
                  value={returnForm.notes}
                  onChange={(e) => setReturnForm({ ...returnForm, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsReturnModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all"
                >
                  Accept Return
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
