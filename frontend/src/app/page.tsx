"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/layouts/DashboardLayout";
import LoginPage from "@/pages/LoginPage";
import AdminDashboard from "@/dashboards/AdminDashboard";
import LibrarianDashboard from "@/dashboards/LibrarianDashboard";
import StudentDashboard from "@/dashboards/StudentDashboard";
import CatalogPage from "@/pages/CatalogPage";
import CirculationPage from "@/pages/CirculationPage";
import MembersPage from "@/pages/MembersPage";
import LibrariansPage from "@/pages/LibrariansPage";
import ReservationsPage from "@/pages/ReservationsPage";
import FinesPage from "@/pages/FinesPage";
import ReportsPage from "@/pages/ReportsPage";
import SettingsPage from "@/pages/SettingsPage";
import ActivityLogsPage from "@/pages/ActivityLogsPage";
import { QrCode, BookOpen, Loader2 } from "lucide-react";

export default function Home() {
  const { user, role, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // Global circulation quick action modal openers
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [addBookModalOpen, setAddBookModalOpen] = useState(false);
  const [addStudentModalOpen, setAddStudentModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mb-3 shadow-lg shadow-emerald-600/20 animate-pulse">
          <BookOpen size={24} />
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
          Loading Aster Library Portal...
        </div>
      </div>
    );
  }

  // Not signed in -> Display Login Page
  if (!user) {
    return <LoginPage onLoginSuccess={() => setActiveTab("dashboard")} />;
  }

  // Render content based on activeTab and role
  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        if (role === "student") {
          return <StudentDashboard onNavigate={setActiveTab} />;
        }
        if (role === "librarian") {
          return (
            <LibrarianDashboard
              onNavigate={setActiveTab}
              onOpenIssueModal={() => setActiveTab("circulation")}
              onOpenReturnModal={() => setActiveTab("circulation")}
              onOpenAddBookModal={() => setActiveTab("catalog")}
              onOpenAddStudentModal={() => setActiveTab("members")}
            />
          );
        }
        // Super Admin Dashboard
        return (
          <AdminDashboard
            onNavigate={setActiveTab}
            onOpenIssueModal={() => setActiveTab("circulation")}
            onOpenReturnModal={() => setActiveTab("circulation")}
            onOpenAddBookModal={() => setActiveTab("catalog")}
            onOpenAddStudentModal={() => setActiveTab("members")}
          />
        );

      case "catalog":
        return <CatalogPage onOpenIssueModal={() => setActiveTab("circulation")} />;

      case "circulation":
      case "my-books":
        return <CirculationPage initialTab="active" />;

      case "my-history":
        return <CirculationPage initialTab="history" />;

      case "members":
      case "profile":
        return <MembersPage />;

      case "librarians":
        return <LibrariansPage />;

      case "reservations":
        return <ReservationsPage />;

      case "fines":
        return <FinesPage />;

      case "reports":
        return <ReportsPage />;

      case "activity-logs":
        return <ActivityLogsPage />;

      case "settings":
        return <SettingsPage />;

      case "barcode":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Barcode & Accession Tags</h2>
              <p className="text-xs text-slate-500 font-medium">Generate standard Code128 and QR stickers for physical book spines</p>
            </div>
            <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-2xs text-center max-w-lg mx-auto">
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl mb-4 flex flex-col items-center">
                <QrCode size={128} className="text-slate-900" />
                <p className="font-mono font-bold text-lg text-slate-900 mt-4 tracking-widest">BK100231 - BK100250</p>
                <p className="text-xs text-slate-500 mt-1">Format: Code128 / QR Matrix • 2.5" x 1.0" Labels</p>
              </div>
              <h3 className="font-bold text-sm text-slate-900">Spine Barcode Batch Generator</h3>
              <p className="text-xs text-slate-500 mt-1">Batch print barcodes for recently added books to shelf racks.</p>
              <button
                onClick={() => window.print()}
                className="mt-5 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
              >
                Print Barcode Sheet (A4 / 24 Labels)
              </button>
            </div>
          </div>
        );

      default:
        return <AdminDashboard onNavigate={setActiveTab} onOpenIssueModal={() => {}} onOpenReturnModal={() => {}} onOpenAddBookModal={() => {}} onOpenAddStudentModal={() => {}} />;
    }
  };

  return (
    <DashboardLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </DashboardLayout>
  );
}
