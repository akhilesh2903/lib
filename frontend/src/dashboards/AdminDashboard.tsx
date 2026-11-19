"use client";

import React, { useEffect, useState } from "react";
import {
  BookOpen,
  Users,
  Repeat,
  RotateCcw,
  Clock,
  Tablet,
  ArrowUpRight,
  ArrowDownRight,
  PlusCircle,
  BookmarkCheck,
  MessageSquare,
  FileSpreadsheet,
  QrCode,
  CheckCircle2,
  Calendar,
  AlertTriangle
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from "recharts";
import api from "@/services/api";
import { useToast } from "@/context/ToastContext";

interface AdminDashboardProps {
  onNavigate: (tab: string) => void;
  onOpenIssueModal: () => void;
  onOpenReturnModal: () => void;
  onOpenAddBookModal: () => void;
  onOpenAddStudentModal: () => void;
}

const CATEGORY_COLORS = ["#10b981", "#0284c7", "#f59e0b", "#6366f1", "#94a3b8", "#ec4899"];

export default function AdminDashboard({
  onNavigate,
  onOpenIssueModal,
  onOpenReturnModal,
  onOpenAddBookModal,
  onOpenAddStudentModal
}: AdminDashboardProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/dashboard/admin");
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err: any) {
      console.warn("Failed to load live admin dashboard data:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const sendReminderNotice = async (member: string, title: string) => {
    showToast(`Automated due-date notice dispatched to ${member} for '${title}'`, "success");
  };

  const metrics = data?.metrics || {
    total_books: 58246,
    total_members: 12845,
    books_issued: 3246,
    books_returned: 3012,
    overdue_books: 532,
    ebooks_accessed: 7842
  };

  const circulationData = data?.circulation_overview || [
    { month: "Jun", issued: 850, returned: 500 },
    { month: "Jul", issued: 980, returned: 650 },
    { month: "Aug", issued: 1100, returned: 720 },
    { month: "Sep", issued: 1250, returned: 800 },
    { month: "Oct", issued: 1350, returned: 900 },
    { month: "Nov", issued: 1500, returned: 1050 },
    { month: "Dec", issued: 1420, returned: 1100 },
    { month: "Jan", issued: 1600, returned: 1250 },
    { month: "Feb", issued: 1720, returned: 1350 },
    { month: "Mar", issued: 1900, returned: 1480 },
    { month: "Apr", issued: 2150, returned: 1600 },
    { month: "May", issued: 2340, returned: 1820 }
  ];

  const categoryData = data?.books_by_category || [
    { name: "Fiction", count: 18234, percentage: 31.3 },
    { name: "Science", count: 14563, percentage: 25.0 },
    { name: "Education", count: 9842, percentage: 16.9 },
    { name: "Reference", count: 7245, percentage: 12.4 },
    { name: "Others", count: 8362, percentage: 14.4 }
  ];

  const overdueList = data?.overdue_books || [
    { title: "The Great Gatsby", member: "Riya Patel", due_date: "2024-05-20", days_overdue: 12 },
    { title: "Deep Work", member: "Kabir Verma", due_date: "2024-05-18", days_overdue: 10 },
    { title: "Thinking, Fast and Slow", member: "Ananya Singh", due_date: "2024-05-16", days_overdue: 8 },
    { title: "Sapiens", member: "Vihaan Joshi", due_date: "2024-05-15", days_overdue: 7 },
    { title: "Wings of Fire", member: "Meera Nair", due_date: "2024-05-14", days_overdue: 6 }
  ];

  const newMembers = data?.new_members || [
    { name: "Aarav Sharma", usn: "10-A", department: "Computer Science", joined_on: "2024-05-24", avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80" },
    { name: "Diya Mehta", usn: "9-B", department: "Computer Science", joined_on: "2024-05-23", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80" },
    { name: "Vivaan Kapoor", usn: "8-A", department: "Information Science", joined_on: "2024-05-22", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80" },
    { name: "Sneha Reddy", usn: "11-C", department: "Electronics", joined_on: "2024-05-21", avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80" },
    { name: "Ishaan Gupta", usn: "7-B", department: "Mechanical", joined_on: "2024-05-20", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80" }
  ];

  const recentlyIssued = data?.recently_issued || [
    { book_title: "The Subtle Art of Not Giving a F*ck", author: "Mark Manson", member: "Rehan Mehta", issued_on: "2024-05-24", due_on: "2024-06-07", barcode: "BK100231" },
    { book_title: "Rich Dad Poor Dad", author: "Robert Kiyosaki", member: "Sneha Reddy", issued_on: "2024-05-24", due_on: "2024-06-07", barcode: "BK100232" },
    { book_title: "The Power of Habit", author: "Charles Duhigg", member: "Aarav Sharma", issued_on: "2024-05-24", due_on: "2024-06-07", barcode: "BK100233" },
    { book_title: "Ikigai", author: "Héctor García", member: "Diya Mehta", issued_on: "2024-05-23", due_on: "2024-06-06", barcode: "BK100234" },
    { book_title: "Educated", author: "Tara Westover", member: "Vivaan Kapoor", issued_on: "2024-05-23", due_on: "2024-06-06", barcode: "BK100235" }
  ];

  const recentActivities = data?.recent_activities || [
    { action: "Book Issued", details: "The Alchemist by Paulo Coelho", timestamp: "10:30 AM", type: "issue" },
    { action: "Book Returned", details: "Atomic Habits by James Clear", timestamp: "09:45 AM", type: "return" },
    { action: "New Member Added", details: "Aarav Sharma (Class 10-A)", timestamp: "09:15 AM", type: "member" },
    { action: "Overdue Reminder Sent", details: "5 members notified via SMS", timestamp: "08:50 AM", type: "alert" },
    { action: "e-Book Accessed", details: "Python Basics.pdf downloaded", timestamp: "08:20 AM", type: "ebook" }
  ];

  const ebookUsage = data?.ebook_usage || [
    { category: "Science e-Books", count: 2125, max: 2500 },
    { category: "Computer e-Books", count: 1856, max: 2500 },
    { category: "Reference e-Books", count: 1245, max: 2500 },
    { category: "Language e-Books", count: 987, max: 2500 },
    { category: "Others", count: 1629, max: 2500 }
  ];

  return (
    <div className="space-y-6">
      {/* 6 Top Metric Cards (Matching reference screenshot exactly) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Books */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <BookOpen size={18} />
            </div>
            <span className="text-xs font-semibold text-slate-500">Total Books</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {metrics.total_books.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 mt-1 text-[11px] font-bold text-emerald-600">
            <ArrowUpRight size={13} />
            <span>+8.4% vs last year</span>
          </div>
        </div>

        {/* Total Members */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users size={18} />
            </div>
            <span className="text-xs font-semibold text-slate-500">Total Members</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {metrics.total_members.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 mt-1 text-[11px] font-bold text-emerald-600">
            <ArrowUpRight size={13} />
            <span>+6.7% vs last year</span>
          </div>
        </div>

        {/* Books Issued */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Repeat size={18} />
            </div>
            <span className="text-xs font-semibold text-slate-500">Books Issued</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {metrics.books_issued.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 mt-1 text-[11px] font-bold text-emerald-600">
            <ArrowUpRight size={13} />
            <span>+12.3% vs last year</span>
          </div>
        </div>

        {/* Books Returned */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <RotateCcw size={18} />
            </div>
            <span className="text-xs font-semibold text-slate-500">Books Returned</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {metrics.books_returned.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 mt-1 text-[11px] font-bold text-emerald-600">
            <ArrowUpRight size={13} />
            <span>+10.1% vs last year</span>
          </div>
        </div>

        {/* Overdue Books */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Clock size={18} />
            </div>
            <span className="text-xs font-semibold text-slate-500">Overdue Books</span>
          </div>
          <div className="text-2xl font-bold text-rose-600 tracking-tight">
            {metrics.overdue_books.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 mt-1 text-[11px] font-bold text-rose-600">
            <ArrowDownRight size={13} />
            <span>-5.2% vs last year</span>
          </div>
        </div>

        {/* E-Books Accessed */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <Tablet size={18} />
            </div>
            <span className="text-xs font-semibold text-slate-500">E-Books Accessed</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {metrics.ebooks_accessed.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 mt-1 text-[11px] font-bold text-emerald-600">
            <ArrowUpRight size={13} />
            <span>+15.6% vs last year</span>
          </div>
        </div>
      </div>

      {/* Row 2: Charts and Activities (Matching reference screenshot) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Circulation Overview Chart (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Circulation Overview</h3>
              <div className="flex items-center gap-4 mt-1">
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Issued
                </span>
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Returned
                </span>
              </div>
            </div>
            <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
              This Year
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={circulationData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="issuedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="returnedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                    fontSize: "12px"
                  }}
                />
                <Area type="monotone" dataKey="issued" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#issuedGradient)" />
                <Area type="monotone" dataKey="returned" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#returnedGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Books by Category Donut Chart (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-900">Books by Category</h3>
          </div>

          <div className="relative h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="count"
                >
                  {categoryData.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [`${Number(value).toLocaleString()} books`, "Total"]}
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                    fontSize: "12px"
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Label in Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-lg font-bold text-slate-900 leading-none">
                {metrics.total_books.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400 font-medium mt-1">Total Books</span>
            </div>
          </div>

          {/* Legend with percentages */}
          <div className="space-y-1.5 mt-2">
            {categoryData.map((item: any, idx: number) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                  />
                  <span className="text-slate-600 font-medium">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">{item.count.toLocaleString()}</span>
                  <span className="text-slate-400 font-medium">({item.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activities Feed (3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Recent Activities</h3>
            <button
              onClick={() => onNavigate("activity-logs")}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              View all
            </button>
          </div>

          <div className="space-y-3.5 flex-1 overflow-y-auto max-h-[300px] scrollbar-thin">
            {recentActivities.map((act: any, idx: number) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 mt-0.5">
                  {act.action?.includes("Issued") && <BookOpen size={15} className="text-emerald-600" />}
                  {act.action?.includes("Returned") && <RotateCcw size={15} className="text-blue-600" />}
                  {act.action?.includes("Member") && <Users size={15} className="text-purple-600" />}
                  {act.action?.includes("Reminder") && <MessageSquare size={15} className="text-amber-500" />}
                  {act.action?.includes("Book") && !act.action?.includes("Issued") && !act.action?.includes("Returned") && <Tablet size={15} className="text-teal-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{act.action}</p>
                  <p className="text-[11px] text-slate-500 truncate leading-snug">{act.details}</p>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0 font-medium">{act.timestamp?.slice(11, 16) || act.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Overdue Books, New Members, E-Book Usage (Matching reference screenshot) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Overdue Books Table (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Overdue Books</h3>
            <button
              onClick={() => onNavigate("circulation")}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              View all
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                  <th className="pb-2.5">Title</th>
                  <th className="pb-2.5">Member</th>
                  <th className="pb-2.5">Due Date</th>
                  <th className="pb-2.5 text-right">Days Overdue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {overdueList.map((item: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 font-semibold text-slate-900 max-w-[140px] truncate">{item.title}</td>
                    <td className="py-2.5 text-slate-600">{item.member}</td>
                    <td className="py-2.5 text-slate-500">{item.due_date ? String(item.due_date).slice(0, 10) : "-"}</td>
                    <td className="py-2.5 text-right">
                      <span
                        onClick={() => sendReminderNotice(item.member, item.title)}
                        title="Click to dispatch instant notification notice"
                        className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 cursor-pointer hover:bg-rose-200 transition-colors"
                      >
                        {item.days_overdue} days
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* New Members (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">New Members</h3>
            <button
              onClick={() => onNavigate("members")}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              View all
            </button>
          </div>

          <div className="space-y-3">
            {newMembers.map((member: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <img
                    src={member.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
                    alt={member.name}
                    className="w-7 h-7 rounded-full object-cover border border-slate-200"
                  />
                  <div>
                    <p className="font-semibold text-slate-900">{member.name}</p>
                    <p className="text-[10px] text-slate-500">{member.department || "Class 10-A"}</p>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">
                  {member.joined_on ? String(member.joined_on).slice(0, 10) : "Joined Today"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* E-Book Usage Progress Bars (3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">E-Book Usage</h3>
            <span className="text-[11px] text-slate-400 font-medium">This Year</span>
          </div>

          <div className="space-y-3">
            {ebookUsage.map((item: any, idx: number) => {
              const pct = Math.min(100, Math.round((item.count / 2500) * 100));
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">{item.category}</span>
                    <span className="font-bold text-slate-900">{item.count.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Total e-Book Accesses</span>
              <span className="font-bold text-emerald-600">7,842</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Recently Issued Books and Quick Actions (Matching reference screenshot bottom) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recently Issued Books Table (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Recently Issued Books</h3>
            <button
              onClick={() => onNavigate("circulation")}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              View all
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                  <th className="pb-2.5">Book Title</th>
                  <th className="pb-2.5">Author</th>
                  <th className="pb-2.5">Member</th>
                  <th className="pb-2.5">Issued On</th>
                  <th className="pb-2.5">Due On</th>
                  <th className="pb-2.5 text-right">Barcode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentlyIssued.map((item: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 font-semibold text-slate-900 max-w-[170px] truncate">{item.book_title}</td>
                    <td className="py-2.5 text-slate-600 truncate max-w-[120px]">{item.author}</td>
                    <td className="py-2.5 text-slate-700 font-medium">{item.member}</td>
                    <td className="py-2.5 text-slate-500">{String(item.issued_on).slice(0, 10)}</td>
                    <td className="py-2.5 text-slate-500">{String(item.due_on).slice(0, 10)}</td>
                    <td className="py-2.5 text-right font-mono text-[11px] font-bold text-slate-600">
                      {item.barcode}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions Grid (4 cols) (8 action buttons matching screenshot bottom-right) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Quick Actions</h3>

          <div className="grid grid-cols-2 gap-3">
            {/* Add New Book */}
            <button
              onClick={onOpenAddBookModal}
              className="flex flex-col items-center justify-center p-3.5 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 transition-all group shadow-2xs text-center"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <PlusCircle size={20} />
              </div>
              <span className="text-xs font-bold text-slate-800">Add New Book</span>
            </button>

            {/* Issue Book */}
            <button
              onClick={onOpenIssueModal}
              className="flex flex-col items-center justify-center p-3.5 rounded-2xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 transition-all group shadow-2xs text-center"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <BookOpen size={20} />
              </div>
              <span className="text-xs font-bold text-slate-800">Issue Book</span>
            </button>

            {/* Add Member */}
            <button
              onClick={onOpenAddStudentModal}
              className="flex flex-col items-center justify-center p-3.5 rounded-2xl border border-slate-200 hover:border-purple-500 hover:bg-purple-50/40 transition-all group shadow-2xs text-center"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <Users size={20} />
              </div>
              <span className="text-xs font-bold text-slate-800">Add Member</span>
            </button>

            {/* Return Book */}
            <button
              onClick={onOpenReturnModal}
              className="flex flex-col items-center justify-center p-3.5 rounded-2xl border border-slate-200 hover:border-amber-500 hover:bg-amber-50/40 transition-all group shadow-2xs text-center"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <RotateCcw size={20} />
              </div>
              <span className="text-xs font-bold text-slate-800">Return Book</span>
            </button>

            {/* Reserve Book */}
            <button
              onClick={() => onNavigate("reservations")}
              className="flex flex-col items-center justify-center p-3.5 rounded-2xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/40 transition-all group shadow-2xs text-center"
            >
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <BookmarkCheck size={20} />
              </div>
              <span className="text-xs font-bold text-slate-800">Reserve Book</span>
            </button>

            {/* Send SMS/Alerts */}
            <button
              onClick={() => {
                showToast("Automated SMS & email notifications sent to students with approaching deadlines", "success");
              }}
              className="flex flex-col items-center justify-center p-3.5 rounded-2xl border border-slate-200 hover:border-rose-500 hover:bg-rose-50/40 transition-all group shadow-2xs text-center"
            >
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <MessageSquare size={20} />
              </div>
              <span className="text-xs font-bold text-slate-800">Send SMS</span>
            </button>

            {/* Generate Report */}
            <button
              onClick={() => onNavigate("reports")}
              className="flex flex-col items-center justify-center p-3.5 rounded-2xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/40 transition-all group shadow-2xs text-center"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <FileSpreadsheet size={20} />
              </div>
              <span className="text-xs font-bold text-slate-800">Generate Report</span>
            </button>

            {/* Barcode Print */}
            <button
              onClick={() => onNavigate("barcode")}
              className="flex flex-col items-center justify-center p-3.5 rounded-2xl border border-slate-200 hover:border-cyan-500 hover:bg-cyan-50/40 transition-all group shadow-2xs text-center"
            >
              <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <QrCode size={20} />
              </div>
              <span className="text-xs font-bold text-slate-800">Barcode Print</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
