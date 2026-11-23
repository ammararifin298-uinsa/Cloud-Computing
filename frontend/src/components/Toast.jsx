import React from "react";
import { useAuth } from "../context/AuthContext.jsx";

export default function Toast() {
  const { toast } = useAuth();
  if (!toast) return null;

  const cls =
    toast.type === "success"
      ? "toast-success"
      : toast.type === "error"
      ? "toast-error"
      : "toast-info";

  return (
    <div className={`toast-box ${cls}`} role="status" aria-live="polite">
      {toast.message}
    </div>
  );
}
