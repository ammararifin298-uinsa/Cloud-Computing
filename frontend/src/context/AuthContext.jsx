import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  apiFetch,
  clearSession,
  getStoredToken,
  getStoredUser,
  registerApiHandlers,
  saveSession,
} from "../lib/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(() => getStoredUser());
  const [degradedMessage, setDegradedMessage] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = "info") => {
    setToast({ message, type, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const logout = useCallback(() => {
    clearSession();
    setToken("");
    setUser(null);
  }, []);

  useEffect(() => {
    registerApiHandlers({
      onUnauthorized: () => {
        setToken("");
        setUser(null);
        showToast("Sesi login Anda telah berakhir. Silakan masuk kembali.", "error");
      },
      onDegraded: (msg) => setDegradedMessage(msg),
    });
  }, [showToast]);

  const refreshMe = useCallback(async () => {
    if (!getStoredToken()) return null;
    try {
      const me = await apiFetch("/api/auth/me");
      saveSession(null, me);
      setUser({
        id: me.id,
        role: me.role,
        full_name: me.full_name,
        employee_code: me.employee_code,
        avatar_url: me.avatar_url || null,
      });
      return me;
    } catch {
      return null;
    }
  }, []);

  const login = useCallback((accessToken, userData) => {
    saveSession(accessToken, userData);
    setToken(accessToken);
    setUser({
      id: userData.id,
      role: userData.role,
      full_name: userData.full_name,
      employee_code: userData.employee_code,
      avatar_url: userData.avatar_url || null,
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: Boolean(token && user),
        degradedMessage,
        setDegradedMessage,
        toast,
        showToast,
        login,
        logout,
        refreshMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus digunakan di dalam AuthProvider");
  return ctx;
}
