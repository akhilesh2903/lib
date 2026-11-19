"use client";

import React, { useEffect, useState } from "react";
import { FileText, FileSpreadsheet, Download, BarChart2, BookOpen, Users, Coins } from "lucide-react";
import api from "@/services/api";
import { useToast } from "@/context/ToastContext";

export default function ReportsPage() {
  const { showToast } = useToast();
  const [summaryData, setSummaryData] = useState<any>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    api.get("/reports/summary")
      .then((res) => {
        if (res.success) setSummaryData(res.data);
      })
      .catch(() => undefined);
  }, []);

  const downloadReport = async (type: string, format: "pdf" | "excel") => {
    const key = `${type}-${format}`;
    try {
      setDownloading(key);
      showToast(`Generating ${format.toUpperCase()} report for ${type}...`, "info");

      const endpoint = format === "pdf" ? `/reports/export/pdf?report_type=${type}` : `/reports/export/excel?report_type=${type}`;
      const blob = await api.get(endpoint, { responseType: "blob" });

      // Trigger browser file download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Aster_Library_${type}_report.${format === "pdf" ? "pdf" : "xlsx"}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showToast(`${format.toUpperCase()} report successfully downloaded`, "success");
    } catch (err: any) {
      showToast(err.message || "Failed to download report", "error");
    } finally {
      setDownloading(null);
    }
  };

  const reportCards = [
    {
      id: "transactions",
      title: "Circulation Transactions Register",
      desc: "Detailed audit record of all issues, returns, extensions, and circulation timestamps",
      icon: FileText,
      color: "emerald"
    },
    {
      id: "inventory",
      title: "Complete Book Inventory Catalog",
      desc: "Full catalog inventory with ISBNs, copies, shelf locations, authors, and availability",
      icon: BookOpen,
      color: "blue"
    },
    {
      id: "overdue",
      title: "Overdue Books & Delinquency Register",
      desc: "Summary of past-due borrowings, student contacts, elapsed days, and fine liabilities",
      icon: Users,
      color: "rose"
    },
    {
      id: "fines",
      title: "Fine Collections & Outstanding Balances",
      desc: "Financial report of accrued fines, counter collections, payment modes, and receipts",
      icon: Coins,
      color: "amber"
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Library Reports & Analytics</h2>
        <p className="text-xs text-slate-500 font-medium">Download formal PDF and Excel reports for accreditation and audits</p>
      </div>

      {/* Export Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {reportCards.map((rc) => {
          const Icon = rc.icon;
          return (
            <div
              key={rc.id}
              className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                    <Icon size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{rc.title}</h4>
                    <span className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wider">Accreditation Ready</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{rc.desc}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-3">
                <button
                  disabled={downloading === `${rc.id}-pdf`}
                  onClick={() => downloadReport(rc.id, "pdf")}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors disabled:opacity-50"
                >
                  <Download size={14} /> {downloading === `${rc.id}-pdf` ? "Exporting..." : "Download PDF"}
                </button>
                <button
                  disabled={downloading === `${rc.id}-excel`}
                  onClick={() => downloadReport(rc.id, "excel")}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-colors disabled:opacity-50"
                >
                  <FileSpreadsheet size={14} /> {downloading === `${rc.id}-excel` ? "Exporting..." : "Download Excel"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytical Visuals */}
      {summaryData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          {/* Department Borrows Breakdown */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Department Borrowing Distribution</h3>
            <div className="space-y-3">
              {summaryData.department_borrows?.map((dept: any, idx: number) => {
                const max = Math.max(...summaryData.department_borrows.map((d: any) => d.borrows), 1);
                const pct = Math.round((dept.borrows / max) * 100);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{dept.department}</span>
                      <span className="font-bold text-slate-900">{dept.borrows} loans</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Most Borrowed Books */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Most Popular Borrowed Titles</h3>
            <div className="space-y-3">
              {summaryData.most_borrowed_books?.map((b: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px]">
                      #{idx + 1}
                    </span>
                    <span className="font-bold text-slate-800 max-w-[240px] truncate">{b.title}</span>
                  </div>
                  <span className="font-bold text-emerald-700">{b.issues} total checkouts</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
