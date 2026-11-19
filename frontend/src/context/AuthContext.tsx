"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import api from "@/services/api";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "super_admin" | "librarian" | "student";
  avatar_url?: string;
  student_profile?: any;
  librarian_profile?: any;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: "super_admin" | "librarian" | "student" | null;
  loading: boolean;
  login: (identifier: string, pass: string, rememberMe?: boolean) => Promise<boolean>;
  logout: () => void;
  switchRoleDemo: (targetRole: "super_admin" | "librarian" | "student") => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Only restore session on page refresh if user explicitly chose "Remember Me"
    const isRemembered = localStorage.getItem("lms_remember_me") === "true";
    const savedToken = localStorage.getItem("lms_token");
    const savedUser = localStorage.getItem("lms_user");

    if (isRemembered && savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem("lms_token");
        localStorage.removeItem("lms_user");
        localStorage.removeItem("lms_remember_me");
      }
    } else {
      // By default, reset session so page refresh ALWAYS reveals the Login Page
      localStorage.removeItem("lms_token");
      localStorage.removeItem("lms_user");
      setToken(null);
      setUser(null);
    }
    setLoading(false);
  }, []);

  const login = async (identifier: string, pass: string, rememberMe: boolean = false): Promise<boolean> => {
    try {
      const res = await api.post("/auth/login", {
        username_or_email: identifier,
        password: pass,
      });

      if (res.access_token && res.user) {
        setToken(res.access_token);
        setUser(res.user);

        // Always save token so API requests work during current session
        localStorage.setItem("lms_token", res.access_token);
        localStorage.setItem("lms_user", JSON.stringify(res.user));

        if (rememberMe) {
          localStorage.setItem("lms_remember_me", "true");
        } else {
          localStorage.removeItem("lms_remember_me");
        }

        return true;
      }
      return false;
    } catch (err) {
      throw err;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("lms_token");
    localStorage.removeItem("lms_user");
    localStorage.removeItem("lms_remember_me");
  };

  const switchRoleDemo = async (targetRole: "super_admin" | "librarian" | "student") => {
    let identifier = "admin@aster.edu";
    let password = "Admin@123";

    if (targetRole === "librarian") {
      identifier = "librarian@aster.edu";
      password = "Library@123";
    } else if (targetRole === "student") {
      identifier = "1MS21CS001";
      password = "Student@123";
    }

    await login(identifier, password, false);
  };

  const refreshProfile = async () => {
    try {
      const res = await api.get("/auth/me");
      if (res.success && res.data) {
        setUser(res.data);
        localStorage.setItem("lms_user", JSON.stringify(res.data));
      }
    } catch {
      // Ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: user ? user.role : null,
        loading,
        login,
        logout,
        switchRoleDemo,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
