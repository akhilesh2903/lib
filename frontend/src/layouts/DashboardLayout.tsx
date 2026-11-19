"use client";

import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  BookOpen,
  Library,
  Repeat,
  BookmarkCheck,
  Users,
  Shield,
  Smartphone,
  Coins,
  BarChart3,
  Bell,
  QrCode,
  Settings,
  Search,
  ChevronDown,
  LogOut,
  UserCheck,
  Menu,
  X,
  CheckCircle,
  Clock,
  Sparkles,
  KeyRound
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import api from "@/services/api";

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenQuickIssue?: () => void;
  onOpenQuickReturn?: () => void;
  onOpenAddBook?: () => void;
}

export default function DashboardLayout({
  children,
  activeTab,
  setActiveTab,
  onOpenQuickIssue,
  onOpenQuickReturn,
  onOpenAddBook
}: DashboardLayoutProps) {
  const { user, role, logout, switchRoleDemo } = useAuth();
  const { showToast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [academicYear, setAcademicYear] = useState("2024 - 25");
  const [globalSearch, setGlobalSearch] = useState("");
  const [todaySummary, setTodaySummary] = useState({
    books_issued: 6,
    reservations: 2,
    new_members: 10,
    overdue_books: 3,
    fine_collected: 15.0
  });
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);

  useEffect(() => {
    // Fetch summary for bottom widget
    api.get("/dashboard/admin")
      .then((res) => {
        if (res.success && res.data?.today_summary) {
          setTodaySummary(res.data.today_summary);
        }
      })
      .catch(() => undefined);

    // Fetch user notifications
    api.get("/notifications")
      .then((res) => {
        if (res.success) {
          setNotifications(res.data || []);
          setUnreadNotifsCount(res.unread_count || 0);
        }
      })
      .catch(() => undefined);
  }, [activeTab, role]);

  const handleRoleSwitch = async (newRole: "super_admin" | "librarian" | "student") => {
    try {
      await switchRoleDemo(newRole);
      showToast(`Switched portal view to ${newRole.replace("_", " ").toUpperCase()}`, "success");
      setUserDropdownOpen(false);
    } catch {
      showToast("Failed to switch demo account", "error");
    }
  };

  const markAllRead = async () => {
    try {
      await api.put("/notifications/read-all/mark");
      setUnreadNotifsCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      showToast("All notifications marked as read", "info");
    } catch {
      // Offline fallback
      setUnreadNotifsCount(0);
    }
  };

  // Role-tailored navigation items
  const getNavItems = () => {
    if (role === "student") {
      return [
        { id: "dashboard", label: "My Dashboard", icon: LayoutDashboard },
        { id: "catalog", label: "Book Catalog", icon: BookOpen },
        { id: "my-books", label: "My Borrowed Books", icon: Repeat },
        { id: "my-history", label: "Reading History", icon: Library },
        { id: "reservations", label: "My Reservations", icon: BookmarkCheck },
        { id: "fines", label: "My Fines", icon: Coins },
        { id: "profile", label: "Student Profile", icon: Users }
      ];
    }

    if (role === "librarian") {
      return [
        { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
        { id: "catalog", label: "Catalog", icon: BookOpen },
        { id: "circulation", label: "Circulation", icon: Repeat },
        { id: "reservations", label: "Reservations", icon: BookmarkCheck },
        { id: "members", label: "Members", icon: Users },
        { id: "fines", label: "Fine Management", icon: Coins },
        { id: "reports", label: "Reports & Analytics", icon: BarChart3 },
        { id: "barcode", label: "Barcode Printing", icon: QrCode }
      ];
    }

    // Default: Super Admin
    return [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "catalog", label: "Catalog", icon: BookOpen },
      { id: "circulation", label: "Circulation", icon: Repeat },
      { id: "reservations", label: "Reservations", icon: BookmarkCheck },
      { id: "members", label: "Members (Students)", icon: Users },
      { id: "librarians", label: "Librarians Staff", icon: Shield },
      { id: "fines", label: "Fine Management", icon: Coins },
      { id: "reports", label: "Reports & Analytics", icon: BarChart3 },
      { id: "barcode", label: "Barcode Printing", icon: QrCode },
      { id: "activity-logs", label: "Audit Activity Logs", icon: Clock },
      { id: "settings", label: "System Settings", icon: Settings }
    ];
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col lg:flex-row antialiased">
      {/* Mobile Top Header */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm">
            <BookOpen size={20} />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-sm leading-tight">School Library</h1>
            <p className="text-[11px] text-slate-500 font-medium">Management System</p>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Sidebar matching reference image */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between transition-transform duration-300 lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full overflow-y-auto px-4 py-5 scrollbar-thin">
          {/* Brand Logo Header */}
          <div className="flex items-center gap-3 px-2 pb-6 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <BookOpen size={22} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base leading-tight tracking-tight">School Library</h2>
              <p className="text-xs text-slate-500 font-medium">Management System</p>
            </div>
          </div>

          {/* Role Badge Indicator */}
          <div className="mt-4 px-2">
            <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                  {role ? role.replace("_", " ") : "Access"}
                </span>
              </div>
              <span className="text-[10px] bg-white text-emerald-700 font-semibold px-2 py-0.5 rounded shadow-2xs">
                v2.0
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="mt-5 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20 font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Icon size={18} className={isActive ? "text-white" : "text-slate-400"} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.id === "circulation" && todaySummary.books_issued > 0 && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        isActive ? "bg-white text-emerald-700" : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {todaySummary.books_issued}
                    </span>
                  )}
                  {item.id === "fines" && todaySummary.overdue_books > 0 && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        isActive ? "bg-white text-rose-700" : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {todaySummary.overdue_books}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Today's Summary Card (Matching bottom-left of screenshot) */}
          <div className="mt-8 pt-4 border-t border-slate-100">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60 shadow-2xs">
              <h4 className="text-xs font-bold text-slate-800 mb-3 tracking-wide flex items-center justify-between">
                <span>Today's Summary</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-600">
                    <BookOpen size={14} className="text-emerald-600" />
                    <span>Books Issued</span>
                  </div>
                  <span className="font-bold text-slate-900">{todaySummary.books_issued}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-600">
                    <BookmarkCheck size={14} className="text-blue-600" />
                    <span>Reservations</span>
                  </div>
                  <span className="font-bold text-slate-900">{todaySummary.reservations}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Users size={14} className="text-purple-600" />
                    <span>New Members</span>
                  </div>
                  <span className="font-bold text-slate-900">{todaySummary.new_members}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Clock size={14} className="text-rose-500" />
                    <span>Overdue Books</span>
                  </div>
                  <span className="font-bold text-rose-600">{todaySummary.overdue_books}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Coins size={14} className="text-amber-500" />
                    <span>Fine Collected</span>
                  </div>
                  <span className="font-bold text-emerald-700">₹{todaySummary.fine_collected.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* User Mini Bar at bottom of sidebar */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-semibold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : "US"}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-900 truncate">{user?.name || "Library User"}</p>
                <p className="text-[10px] text-slate-500 capitalize">{role ? role.replace("_", " ") : "Guest"}</p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out to Login Page"
              className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <LogOut size={14} />
              <span>Exit</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar (Matching reference image) */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 py-3.5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight capitalize">
              {activeTab === "dashboard" ? "Dashboard" : activeTab.replace("-", " ")}
            </h2>
            <p className="text-xs text-slate-500 font-medium">Overview of library operations and insights</p>
          </div>

          {/* Quick Role Switcher Pill (Great for interactive testing of all 3 portals) */}
          <div className="hidden xl:flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-medium">
            <span className="text-[11px] text-slate-400 px-2 flex items-center gap-1">
              <Sparkles size={12} className="text-emerald-500" /> Switch Role:
            </span>
            <button
              onClick={() => handleRoleSwitch("super_admin")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                role === "super_admin"
                  ? "bg-white text-emerald-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Super Admin
            </button>
            <button
              onClick={() => handleRoleSwitch("librarian")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                role === "librarian"
                  ? "bg-white text-emerald-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Librarian
            </button>
            <button
              onClick={() => handleRoleSwitch("student")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                role === "student"
                  ? "bg-white text-emerald-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Student
            </button>
          </div>

          {/* Center-Right Controls */}
          <div className="flex items-center gap-4">
            {/* Academic Year Selector */}
            <div className="hidden md:flex items-center gap-2 text-xs font-medium text-slate-600">
              <span className="text-slate-400">Academic Year</span>
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="2024 - 25">2024 - 25</option>
                <option value="2025 - 26">2025 - 26</option>
                <option value="2026 - 27">2026 - 27</option>
              </select>
            </div>

            {/* Global Search Bar with Search Icon */}
            <div className="relative hidden sm:block w-64 lg:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by title, author, ISBN..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && globalSearch.trim()) {
                    setActiveTab("catalog");
                  }
                }}
                className="w-full bg-slate-50 border border-slate-200/90 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="relative p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                aria-label="Notifications"
              >
                <Bell size={19} />
                {unreadNotifsCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
                )}
              </button>

              {/* Notification Popover Dropdown */}
              {notifDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200/80 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-sm">Notifications</h4>
                      {unreadNotifsCount > 0 && (
                        <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {unreadNotifsCount} new
                        </span>
                      )}
                    </div>
                    {unreadNotifsCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="mt-3 max-h-72 overflow-y-auto space-y-2.5 divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">No notifications at this time</div>
                    ) : (
                      notifications.slice(0, 6).map((notif) => (
                        <div key={notif.notification_id || notif._id} className="pt-2 first:pt-0">
                          <p className="text-xs font-semibold text-slate-900 leading-snug">{notif.title}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{notif.message}</p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            {new Date(notif.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Prominent Sign Out Button to return to Login */}
            <button
              onClick={logout}
              title="Sign out and return to Login page"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all shrink-0"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>

            {/* Profile Chip with Role Avatar (Matching top-right of screenshot) */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shadow-2xs">
                  {user?.name ? user.name.slice(0, 2).toUpperCase() : "AD"}
                </div>
                <div className="text-left hidden md:block">
                  <p className="text-xs font-bold text-slate-900 leading-tight">{user?.name || "Admin User"}</p>
                  <p className="text-[10px] text-slate-500 font-medium capitalize">
                    {role ? role.replace("_", " ") : "Librarian"}
                  </p>
                </div>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              {/* Profile Dropdown Menu */}
              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200/80 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900">{user?.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setActiveTab(role === "student" ? "profile" : "settings");
                        setUserDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      <UserCheck size={15} className="text-slate-400" />
                      <span>My Profile</span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab("settings");
                        setUserDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      <KeyRound size={15} className="text-slate-400" />
                      <span>Security & Password</span>
                    </button>
                  </div>

                  <div className="pt-1 border-t border-slate-100">
                    <button
                      onClick={logout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-semibold transition-colors"
                    >
                      <LogOut size={15} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content View */}
        <main className="flex-1 p-6 md:p-8 max-w-[1600px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
