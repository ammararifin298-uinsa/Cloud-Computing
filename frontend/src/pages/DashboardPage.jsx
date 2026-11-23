import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/Icons.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { apiFetch, formatDateTime, STATUS_LABEL } from "../lib/api.js";

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setData(await apiFetch("/api/dashboard"));
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const map = {};
  (data?.by_status || []).forEach((r) => (map[r.status] = r.total));
  const total = Object.values(map).reduce((a, n) => a + Number(n || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard Operasional</h1>
          <p className="page-sub">Ringkasan pengiriman aktif dan catatan checkpoint terbaru.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link to="/kirim" className="btn-primary">
            <Icon name="package-plus" size={16} />
            Buat Pesanan
          </Link>
          <button type="button" className="btn-secondary" onClick={load}>
            <Icon name="refresh" size={15} />
            Muat Ulang
          </button>
        </div>
      </div>

      {error && <div className="degraded-banner">{error}</div>}

      <div className="grid-4" style={{ marginBottom: 22 }}>
        <div className="kpi-card">
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>Total Pengiriman</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>{total}</div>
          </div>
          <div className="kpi-icon kpi-blue"><Icon name="box" /></div>
        </div>
        <div className="kpi-card">
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>Dalam Perjalanan / Dikirim</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4, color: "#0d9488" }}>
              {(map.DALAM_PERJALANAN || 0) + (map.DIKIRIM || 0)}
            </div>
          </div>
          <div className="kpi-icon kpi-teal"><Icon name="truck" /></div>
        </div>
        <div className="kpi-card">
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>Selesai Diterima</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4, color: "#16a34a" }}>{map.SELESAI || 0}</div>
          </div>
          <div className="kpi-icon kpi-green"><Icon name="check-circle" /></div>
        </div>
        <div className="kpi-card">
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>Aktivitas 1 Jam Terakhir</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4, color: "var(--brand)" }}>
              {data?.events_last_hour ?? 0}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Total event: {data?.total_events ?? 0}</div>
          </div>
          <div className="kpi-icon kpi-amber"><Icon name="activity" /></div>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="card-box">
          <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>Distribusi Status Pengiriman</h2>
          {(data?.by_status || []).map((r) => {
            const pct = total ? Math.round((r.total / total) * 100) : 0;
            return (
              <div key={r.status} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                  <span style={{ fontWeight: 600 }}>{STATUS_LABEL[r.status] || r.status}</span>
                  <strong>{r.total} ({pct}%)</strong>
                </div>
                <div style={{ height: 8, background: "var(--line)", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: "var(--brand)", borderRadius: 99 }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="card-box">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800 }}>10 Checkpoint Terbaru</h2>
            <Link to="/pengiriman" style={{ fontSize: 13, fontWeight: 700, color: "var(--brand)", textDecoration: "none" }}>
              Lihat Semua →
            </Link>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Resi</th><th>Status</th><th>Lokasi</th><th>Waktu</th></tr>
              </thead>
              <tbody>
                {(data?.latest || []).map((e, i) => (
                  <tr key={i}>
                    <td>
                      <Link className="mono" style={{ color: "var(--brand)", fontWeight: 700, textDecoration: "none" }} to={`/lacak?code=${encodeURIComponent(e.shipment_code)}`}>
                        {e.shipment_code}
                      </Link>
                    </td>
                    <td><StatusBadge status={e.status} /></td>
                    <td>{e.location}</td>
                    <td style={{ whiteSpace: "nowrap", color: "var(--muted)", fontSize: 12 }}>{formatDateTime(e.recorded_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
