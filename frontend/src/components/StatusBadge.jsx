import React from "react";
import { STATUS_LABEL } from "../lib/api.js";

export default function StatusBadge({ status }) {
  const code = String(status || "DITERIMA").toUpperCase();
  return (
    <span className={`badge-status st-${code}`}>
      {STATUS_LABEL[code] || code}
    </span>
  );
}
