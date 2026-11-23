import React, { useEffect, useState } from "react";
import { apiFetch, formatDateTime } from "../lib/api.js";

export default function BackupPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/api/backups").then(setData).catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Cadangan Data</h1>
          <p className="page-sub">Status pencadangan basis data otomatis.</p>
        </div>
      </div>
      {error && <div className="degraded-banner">{error}</div>}
      {data && (
        <>
          <div className="grid-3" style={{ marginBottom: 18 }}>
            <div className="card-box"><div className="page-sub">Interval</div><div className="page-title">{Math.round(data.interval_seconds / 60)} menit</div></div>
            <div className="card-box"><div className="page-sub">Retensi Lokal</div><div className="page-title">{data.retention_hours} jam</div></div>
            <div className="card-box"><div className="page-sub">Replika Aktif</div><div className="page-title">{data.db_cluster?.standby_count ?? 0}</div></div>
          </div>
          <div className="card-box">
            <p className="page-sub" style={{ marginBottom: 10 }}>{data.storage}</p>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Berkas</th><th>Ukuran</th><th>SHA-256</th><th>Dibuat</th></tr></thead>
                <tbody>
                  {data.files.map((f) => (
                    <tr key={f.name}>
                      <td className="mono">{f.name}</td>
                      <td>{(f.size_bytes / 1024).toFixed(1)} KB</td>
                      <td className="mono">{f.sha256 ? f.sha256.slice(0, 16) + "…" : "-"}</td>
                      <td>{formatDateTime(f.created_at)}</td>
                    </tr>
                  ))}
                  {data.files.length === 0 && <tr><td colSpan={4} style={{ textAlign: "center" }}>Belum ada berkas cadangan.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
