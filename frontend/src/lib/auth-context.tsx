"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getToken, removeToken } from "./api";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  userEmail: string | null;
  setAuthenticated: (email?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  userEmail: null,
  setAuthenticated: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();

    const initTimer = window.setTimeout(() => {
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          setUserEmail(payload.email || payload.sub || null);
          setIsAuthenticated(true);
        } catch {
          removeToken();
        }
      }
      setIsLoading(false);
    }, 0);

    return () => {
      window.clearTimeout(initTimer);
    };
  }, []);

  const setAuthenticated = useCallback((email?: string) => {
    setIsAuthenticated(true);
    if (email) setUserEmail(email);
    else {
      const token = getToken();
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          setUserEmail(payload.email || payload.sub || null);
        } catch { /* ignore */ }
      }
    }
  }, []);

  const logout = useCallback(() => {
    removeToken();
    setIsAuthenticated(false);
    setUserEmail(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, isLoading, userEmail, setAuthenticated, logout }}
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
