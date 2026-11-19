"use client";

import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Shield,
  Users,
  ArrowRight,
  Lock,
  Mail,
  Sparkles,
  KeyRound,
  Check,
  Copy,
  ScanLine,
  Building,
  RotateCcw,
  CheckCircle2,
  HelpCircle
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

interface LoginPageProps {
  onLoginSuccess?: () => void;
}

type RoleTab = "super_admin" | "librarian" | "student";

const ROLE_CONFIGS = {
  super_admin: {
    title: "Super Admin Portal",
    subtitle: "Complete institutional control, staff management, loan rules & analytics",
    badge: "Full System Governance",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    themeColor: "emerald",
    defaultId: "admin@aster.edu",
    defaultPass: "Admin@123",
    inputLabel: "Admin Email Address",
    inputPlaceholder: "admin@aster.edu",
    icon: Shield,
    responsibilities: [
      "Create & manage Librarian staff accounts",
      "Configure borrowing limits & overdue fine rates",
      "View system-wide circulation & audit reports",
      "Export PDF & Excel institutional archives"
    ]
  },
  librarian: {
    title: "Librarian Desk Portal",
    subtitle: "Barcode cataloging, rack locator, circulation issue & return desk",
    badge: "Staff Desk & Circulation",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    themeColor: "blue",
    defaultId: "librarian@aster.edu",
    defaultPass: "Library@123",
    inputLabel: "Librarian Email Address",
    inputPlaceholder: "librarian@aster.edu",
    icon: BookOpen,
    responsibilities: [
      "Scan ISBN barcodes with automatic metadata autofill",
      "Assign and inspect physical shelf & rack locations",
      "Issue books to students & accept book returns",
      "Track copies on shelf vs. copies out for reading"
    ]
  },
  student: {
    title: "Student Reading Portal",
    subtitle: "Personalized reading history, active borrowed books & reservation desk",
    badge: "Student Access",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
    themeColor: "purple",
    defaultId: "1MS21CS001",
    defaultPass: "Student@123",
    inputLabel: "Student USN or Email",
    inputPlaceholder: "1MS21CS001 or student@aster.edu",
    icon: Users,
    responsibilities: [
      "Explore library book discovery catalog",
      "View borrowed books with live due countdowns",
      "Reserve unavailable books & monitor queue",
      "Review past reading history & librarian records"
    ]
  }
};

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const { login } = useAuth();
  const { showToast } = useToast();
  
  const [selectedRole, setSelectedRole] = useState<RoleTab>("super_admin");
  const [identifier, setIdentifier] = useState(ROLE_CONFIGS.super_admin.defaultId);
  const [password, setPassword] = useState(ROLE_CONFIGS.super_admin.defaultPass);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Switch role tab updates the inputs to the selected role defaults
  const handleSelectRole = (role: RoleTab) => {
    setSelectedRole(role);
    setIdentifier(ROLE_CONFIGS[role].defaultId);
    setPassword(ROLE_CONFIGS[role].defaultPass);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      showToast("Please enter both username/email and password", "error");
      return;
    }

    try {
      setLoading(true);
      const ok = await login(identifier, password, rememberMe);
      if (ok) {
        showToast(`Signed in successfully as ${ROLE_CONFIGS[selectedRole].title}!`, "success");
        if (onLoginSuccess) onLoginSuccess();
      }
    } catch (err: any) {
      showToast(err.message || "Invalid login credentials. Please check your credentials.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleInstantLogin = async (roleKey: RoleTab) => {
    const config = ROLE_CONFIGS[roleKey];
    setSelectedRole(roleKey);
    setIdentifier(config.defaultId);
    setPassword(config.defaultPass);

    try {
      setLoading(true);
      const ok = await login(config.defaultId, config.defaultPass, rememberMe);
      if (ok) {
        showToast(`Signed in successfully as ${config.title}!`, "success");
        if (onLoginSuccess) onLoginSuccess();
      }
    } catch (err: any) {
      showToast(err.message || "Login failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCredentials = (id: string, pass: string, keyName: string) => {
    setIdentifier(id);
    setPassword(pass);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
    showToast(`Autofilled credentials for ${keyName}`, "info");
  };

  const currentConfig = ROLE_CONFIGS[selectedRole];
  const IconComponent = currentConfig.icon;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center items-center p-4 sm:p-6 antialiased">
      <div className="max-w-2xl w-full">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-600/20">
            <BookOpen size={28} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Aster College Library Portal</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Complete Library Management, Circulation & Multi-Role Authentication System
          </p>
        </div>

        {/* ROLE SELECTION TABS */}
        <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs mb-4 grid grid-cols-3 gap-1.5">
          {/* Super Admin Tab */}
          <button
            type="button"
            onClick={() => handleSelectRole("super_admin")}
            className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-bold text-xs transition-all ${
              selectedRole === "super_admin"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Shield size={16} />
            <span className="hidden sm:inline">Super Admin</span>
            <span className="sm:hidden">Admin</span>
          </button>

          {/* Librarian Tab */}
          <button
            type="button"
            onClick={() => handleSelectRole("librarian")}
            className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-bold text-xs transition-all ${
              selectedRole === "librarian"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <BookOpen size={16} />
            <span className="hidden sm:inline">Librarian (Staff)</span>
            <span className="sm:hidden">Librarian</span>
          </button>

          {/* Student Tab */}
          <button
            type="button"
            onClick={() => handleSelectRole("student")}
            className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-bold text-xs transition-all ${
              selectedRole === "student"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Users size={16} />
            <span>Student</span>
          </button>
        </div>

        {/* MAIN LOGIN CARD */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xl space-y-6">
          {/* Active Role Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm ${
                  selectedRole === "super_admin"
                    ? "bg-emerald-600"
                    : selectedRole === "librarian"
                    ? "bg-blue-600"
                    : "bg-purple-600"
                }`}
              >
                <IconComponent size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 leading-tight">{currentConfig.title}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{currentConfig.subtitle}</p>
              </div>
            </div>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border self-start sm:self-center ${currentConfig.badgeColor}`}>
              {currentConfig.badge}
            </span>
          </div>

          {/* Role Capabilities Quick Chips */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Included Role Features
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-600">
              {currentConfig.responsibilities.map((resp, idx) => (
                <div key={idx} className="flex items-start gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-[11px] leading-snug">{resp}</span>
                </div>
              ))}
            </div>
          </div>

          {/* LOGIN FORM */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {currentConfig.inputLabel}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder={currentConfig.inputPlaceholder}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Password</label>
                <span className="text-[11px] font-mono text-slate-400">
                  Default: {currentConfig.defaultPass}
                </span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                />
              </div>
            </div>

            {/* REMEMBER ME TOGGLE */}
            <div className="flex items-start gap-2 pt-1 pb-1">
              <input
                id="remember_me_checkbox"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 mt-0.5 cursor-pointer"
              />
              <label htmlFor="remember_me_checkbox" className="text-xs text-slate-600 cursor-pointer select-none">
                <span className="font-semibold text-slate-800">Stay signed in across browser refreshes</span>
                <span className="block text-[11px] text-slate-400">
                  (When unchecked, refreshing your browser always returns to this Login Page)
                </span>
              </label>
            </div>

            {/* SUBMIT BUTTON */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 rounded-xl text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
                  selectedRole === "super_admin"
                    ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                    : selectedRole === "librarian"
                    ? "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
                    : "bg-purple-600 hover:bg-purple-700 shadow-purple-600/20"
                }`}
              >
                {loading ? "Authenticating..." : `Sign In as ${ROLE_CONFIGS[selectedRole].title.split(" ")[0]}`}
                <ArrowRight size={15} />
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleInstantLogin(selectedRole)}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Sparkles size={14} className="text-amber-400" />
                Instant 1-Click Login
              </button>
            </div>
          </form>

          {/* ALL AUTHORIZED CREDENTIALS CARDS */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound size={13} className="text-emerald-600" /> Seeded System Accounts (Click to Fill)
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded">
                MongoDB Atlas Active
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Admin Card */}
              <div
                onClick={() => handleCopyCredentials("admin@aster.edu", "Admin@123", "Super Admin")}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                  selectedRole === "super_admin"
                    ? "bg-emerald-50/70 border-emerald-300 shadow-2xs"
                    : "bg-slate-50 border-slate-200 hover:border-emerald-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1">
                    <Shield size={12} className="text-emerald-600" /> Super Admin
                  </span>
                  {copiedKey === "Super Admin" ? (
                    <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-0.5">
                      <Check size={10} /> Filled
                    </span>
                  ) : (
                    <span className="text-[9px] text-slate-400">Fill</span>
                  )}
                </div>
                <p className="text-[11px] font-mono text-slate-600 truncate">admin@aster.edu</p>
                <p className="text-[10px] font-mono text-slate-400">Pass: Admin@123</p>
              </div>

              {/* Librarian Card */}
              <div
                onClick={() => handleCopyCredentials("librarian@aster.edu", "Library@123", "Librarian")}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                  selectedRole === "librarian"
                    ? "bg-blue-50/70 border-blue-300 shadow-2xs"
                    : "bg-slate-50 border-slate-200 hover:border-blue-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-blue-900 flex items-center gap-1">
                    <BookOpen size={12} className="text-blue-600" /> Librarian
                  </span>
                  {copiedKey === "Librarian" ? (
                    <span className="text-[9px] font-bold text-blue-600 flex items-center gap-0.5">
                      <Check size={10} /> Filled
                    </span>
                  ) : (
                    <span className="text-[9px] text-slate-400">Fill</span>
                  )}
                </div>
                <p className="text-[11px] font-mono text-slate-600 truncate">librarian@aster.edu</p>
                <p className="text-[10px] font-mono text-slate-400">Pass: Library@123</p>
              </div>

              {/* Student Card */}
              <div
                onClick={() => handleCopyCredentials("1MS21CS001", "Student@123", "Student")}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                  selectedRole === "student"
                    ? "bg-purple-50/70 border-purple-300 shadow-2xs"
                    : "bg-slate-50 border-slate-200 hover:border-purple-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-purple-900 flex items-center gap-1">
                    <Users size={12} className="text-purple-600" /> Student
                  </span>
                  {copiedKey === "Student" ? (
                    <span className="text-[9px] font-bold text-purple-600 flex items-center gap-0.5">
                      <Check size={10} /> Filled
                    </span>
                  ) : (
                    <span className="text-[9px] text-slate-400">Fill</span>
                  )}
                </div>
                <p className="text-[11px] font-mono text-slate-600 truncate">1MS21CS001</p>
                <p className="text-[10px] font-mono text-slate-400">Pass: Student@123</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-400 mt-5">
          Aster College Library Management System • Powered by FastAPI & MongoDB Atlas
        </p>
      </div>
    </div>
  );
}
