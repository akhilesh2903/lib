"use client";

import React, { useEffect, useState } from "react";
import { BookmarkCheck, Clock, CheckCircle2, XCircle, Search, Calendar, User } from "lucide-react";
import api from "@/services/api";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";

export default function ReservationsPage() {
  const { role } = useAuth();
  const { showToast } = useToast();
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      const res = await api.get("/reservations");
      if (res.success) {
        setReservations(res.data || []);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to load reservations", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const updateStatus = async (resId: string, newStatus: string) => {
    try {
      const res = await api.put(`/reservations/${resId}/status`, { status: newStatus });
      if (res.success) {
        showToast(res.message, "success");
        fetchReservations();
      }
    } catch (err: any) {
      showToast(err.message || "Status update failed", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Book Hold Reservations</h2>
          <p className="text-xs text-slate-500 font-medium">Track and fulfill student book holds and reservation queues</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-xs">Loading reservations...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Reservation ID</th>
                  <th className="py-3.5 px-4">Book Title</th>
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Requested On</th>
                  <th className="py-3.5 px-4">Status</th>
                  {role !== "student" && <th className="py-3.5 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reservations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No active hold reservations at this time.
                    </td>
                  </tr>
                ) : (
                  reservations.map((item) => (
                    <tr key={item.reservation_id || item._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-500">{item.reservation_id}</td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{item.book_title}</p>
                        <p className="text-[10px] text-slate-400 font-mono">Book ID: {item.book_id}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-800">{item.student_name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{item.student_usn}</p>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{String(item.request_date).slice(0, 10)}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            item.status === "approved"
                              ? "bg-emerald-100 text-emerald-800"
                              : item.status === "fulfilled"
                              ? "bg-blue-100 text-blue-800"
                              : item.status === "cancelled"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      {role !== "student" && (
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {item.status === "pending" && (
                              <button
                                onClick={() => updateStatus(item.reservation_id || item._id, "approved")}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors"
                              >
                                Approve Hold
                              </button>
                            )}
                            {item.status === "approved" && (
                              <button
                                onClick={() => updateStatus(item.reservation_id || item._id, "fulfilled")}
                                className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors"
                              >
                                Mark Fulfilled
                              </button>
                            )}
                            {item.status !== "cancelled" && item.status !== "fulfilled" && (
                              <button
                                onClick={() => updateStatus(item.reservation_id || item._id, "cancelled")}
                                className="px-2 py-1 rounded-lg text-slate-600 hover:bg-rose-50 hover:text-rose-600 font-semibold text-xs transition-colors"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
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
    </div>
  );
}
