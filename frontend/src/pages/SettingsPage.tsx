"use client";

import React, { useEffect, useState } from "react";
import { Settings, Save, Shield, KeyRound, BellRing, Database } from "lucide-react";
import api from "@/services/api";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";

export default function SettingsPage() {
  const { role } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);

  // Settings State
  const [settings, setSettings] = useState({
    borrowing_duration_days: 14,
    fine_per_day: 5.0,
    max_books_per_student: 4,
    renewal_limit: 2,
    library_name: "Aster College Central Library",
    academic_year: "2024 - 25",
    email_alerts_enabled: true
  });

  // Password State
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: ""
  });

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get("/settings");
      if (res.success && res.data) {
        setSettings(res.data);
      }
    } catch {
      // Keep defaults
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.put("/settings", settings);
      if (res.success) {
        showToast("System circulation parameters successfully updated", "success");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to update settings", "error");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      showToast("New passwords do not match", "error");
      return;
    }
    try {
      const res = await api.post("/auth/change-password", {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });
      if (res.success) {
        showToast("Account password updated successfully", "success");
        setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
      }
    } catch (err: any) {
      showToast(err.message || "Password change failed", "error");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">System & Account Settings</h2>
        <p className="text-xs text-slate-500 font-medium">Configure institution borrowing policies, overdue fines, and security</p>
      </div>

      {/* Circulation Policy Configuration (Super Admin) */}
      {role === "super_admin" && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Settings size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Library Circulation Rules</h3>
              <p className="text-[11px] text-slate-500">Fine rates, loan durations, and borrowing quotas</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Standard Borrowing Duration (Days)</label>
              <input
                type="number"
                min="1"
                max="90"
                value={settings.borrowing_duration_days}
                onChange={(e) => setSettings({ ...settings, borrowing_duration_days: parseInt(e.target.value) || 14 })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">Default number of days allocated to students upon checkout.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Overdue Fine Rate (₹ per Day)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={settings.fine_per_day}
                onChange={(e) => setSettings({ ...settings, fine_per_day: parseFloat(e.target.value) || 0.0 })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">Daily fine charged automatically after due date passes.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Max Books Allowed Per Student</label>
              <input
                type="number"
                min="1"
                max="10"
                value={settings.max_books_per_student}
                onChange={(e) => setSettings({ ...settings, max_books_per_student: parseInt(e.target.value) || 4 })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">Maximum active simultaneous checkouts per student card.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Current Academic Year</label>
              <input
                type="text"
                value={settings.academic_year}
                onChange={(e) => setSettings({ ...settings, academic_year: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={settings.email_alerts_enabled}
                onChange={(e) => setSettings({ ...settings, email_alerts_enabled: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              Enable Automatic Email & SMS Due Date Reminders
            </label>

            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
            >
              <Save size={15} /> Save Circulation Rules
            </button>
          </div>
        </form>
      )}

      {/* Security & Password Change */}
      <form onSubmit={handleChangePassword} className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <KeyRound size={18} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">Change Account Password</h3>
            <p className="text-[11px] text-slate-500">Update your account credentials to keep your portal secure</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Current Password *</label>
          <input
            type="password"
            required
            value={passwordForm.current_password}
            onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">New Password *</label>
            <input
              type="password"
              required
              value={passwordForm.new_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Confirm New Password *</label>
            <input
              type="password"
              required
              value={passwordForm.confirm_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all"
          >
            Update Password
          </button>
        </div>
      </form>
    </div>
  );
}
