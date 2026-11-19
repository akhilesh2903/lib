"use client";

import React, { useEffect, useState } from "react";
import { Coins, CheckCircle, Clock, Search, CreditCard, DollarSign, X } from "lucide-react";
import api from "@/services/api";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";

export default function FinesPage() {
  const { role } = useAuth();
  const { showToast } = useToast();
  const [fines, setFines] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(true);

  // Pay modal
  const [payingFine, setPayingFine] = useState<any>(null);
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [refNum, setRefNum] = useState("");

  const fetchFines = async () => {
    try {
      setLoading(true);
      const res = await api.get("/fines", {
        params: { status: filterStatus === "all" ? undefined : filterStatus }
      });
      if (res.success) {
        setFines(res.data || []);
        setSummary(res.summary || {});
      }
    } catch (err: any) {
      showToast(err.message || "Failed to load fines", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFines();
  }, [filterStatus]);

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingFine) return;
    try {
      const res = await api.post(`/fines/${payingFine.fine_id || payingFine.id}/pay`, {
        payment_mode: paymentMode,
        reference_number: refNum
      });
      if (res.success) {
        showToast("Fine settlement recorded successfully", "success");
        setPayingFine(null);
        setRefNum("");
        fetchFines();
      }
    } catch (err: any) {
      showToast(err.message || "Payment recording failed", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Fine & Dues Management</h2>
        <p className="text-xs text-slate-500 font-medium">Overdue penalty assessments, settlements, and payment ledger</p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500">Total Fines Assessed</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">₹{summary.total_amount || 0}</p>
          <span className="text-[11px] text-slate-500 font-medium">{summary.total_fines_count || 0} delinquency records</span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500">Total Collected & Settled</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">₹{summary.paid_amount || 0}</p>
          <span className="text-[11px] text-emerald-600 font-medium">Cleared balances</span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500">Outstanding Balance</p>
          <p className="text-2xl font-bold text-rose-600 mt-1">₹{summary.unpaid_amount || 0}</p>
          <span className="text-[11px] text-rose-600 font-medium">Pending collection</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setFilterStatus("all")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterStatus === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Fines
          </button>
          <button
            onClick={() => setFilterStatus("unpaid")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterStatus === "unpaid" ? "bg-white text-rose-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Pending / Unpaid
          </button>
          <button
            onClick={() => setFilterStatus("paid")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterStatus === "paid" ? "bg-white text-emerald-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Paid / Settled
          </button>
        </div>
      </div>

      {/* Fines Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-xs">Loading fine register...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Fine ID</th>
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Book Title</th>
                  <th className="py-3.5 px-4">Days Overdue</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Status</th>
                  {role !== "student" && <th className="py-3.5 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fines.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No fine records found.
                    </td>
                  </tr>
                ) : (
                  fines.map((item) => (
                    <tr key={item.fine_id || item._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-500">{item.fine_id}</td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{item.student_name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{item.student_usn}</p>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{item.book_title}</td>
                      <td className="py-3 px-4 text-slate-600">{item.days_overdue} days</td>
                      <td className="py-3 px-4 font-bold text-slate-900">₹{item.amount}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            item.status === "paid" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      {role !== "student" && (
                        <td className="py-3 px-4 text-right">
                          {item.status === "unpaid" ? (
                            <button
                              onClick={() => setPayingFine(item)}
                              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors"
                            >
                              Collect ₹{item.amount}
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium">Settled via {item.payment_mode || "Cash"}</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Collect Fine Modal */}
      {payingFine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">Record Fine Settlement</h3>
                <p className="text-xs text-slate-500">Fine ID: {payingFine.fine_id}</p>
              </div>
              <button
                onClick={() => setPayingFine(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePaySubmit} className="space-y-4">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                <span className="text-xs text-emerald-800 font-medium">Amount to Collect</span>
                <p className="text-2xl font-bold text-emerald-700 mt-0.5">₹{payingFine.amount}</p>
                <p className="text-[11px] text-emerald-600 mt-1">{payingFine.student_name} ({payingFine.student_usn})</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Cash">Cash (Counter Desk)</option>
                  <option value="UPI">UPI / QR Payment</option>
                  <option value="Card">Debit / Credit Card</option>
                  <option value="Online">Online College Portal</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reference / Receipt Number</label>
                <input
                  type="text"
                  placeholder="e.g. REC-99210 or UPI Txn ID"
                  value={refNum}
                  onChange={(e) => setRefNum(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPayingFine(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
