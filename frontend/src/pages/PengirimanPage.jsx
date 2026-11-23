import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import StatusBadge from "../components/StatusBadge.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { STATUS_LABEL, apiFetch, formatDateTime, formatRupiah, hasRole } from "../lib/api.js";

export default function PengirimanPage() {
  const { user, showToast } = useAuth();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [cursor, setCursor] = useState(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (append = false, cur = null) => {
    setLoading(true);
    setError("");
    const p = new URLSearchParams({ limit: "25" });
    if (q.trim()) p.set("q", q.trim());
    if (status) p.set("status", status);
    if (cur) {
      p.set("cursor_updated_at", cur.updated_at);
      p.set("cursor_code", cur.code);
    }
    try {
      const r = await apiFetch(`/api/shipments?${p}`);
      setItems((prev) => (append ? [...prev, ...r.items] : r.items));
      setTotal(r.total_count);
      setCursor(r.next_cursor);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [q, status]);

  useEffect(() => {
    const t = setTimeout(() => load(false), 300);
    return () => clearTimeout(t);
  }, [load]);

  const remove = async (code) => {
    if (!window.confirm(`Hapus pengiriman ${code}?`)) return;
    try {
      await apiFetch(`/api/shipments/${encodeURIComponent(code)}`, { method: "DELETE" });
      showToast(`${code} dihapus`, "success");
      load(false);
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const exportCsv = () => {
    const rows = [["Resi", "Status", "Lokasi", "Layanan", "Total", "Diperbarui"],
      ...items.map((i) => [i.code, i.current_status, i.current_location, i.service_code, i.total_cost, i.updated_at])];
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "pengiriman.csv";
    a.click();
  };

  const canDelete = hasRole(user, ["admin", "superadmin"]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Daftar Pengiriman</h1>
          <p className="page-sub">{total} paket tercatat.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-secondary" onClick={exportCsv}>Ekspor CSV</button>
          <button className="btn-secondary" onClick={() => window.print()}>Cetak</button>
        </div>
      </div>
      <div className="card-box">
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <input className="form-control" style={{ maxWidth: 280 }} placeholder="Cari resi atau lokasi"
            value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="form-control" style={{ maxWidth: 220 }} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Semua Status</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {error && <div className="degraded-banner">{error}</div>}
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Resi</th><th>Status</th><th>Lokasi</th><th>Layanan</th><th>Total</th><th>Diperbarui</th>{canDelete && <th />}</tr></thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.code}>
                  <td><Link className="mono" to={`/lacak?code=${encodeURIComponent(i.code)}`}>{i.code}</Link></td>
                  <td><StatusBadge status={i.current_status} /></td>
                  <td>{i.current_location}</td>
                  <td>{i.service_code || "-"}</td>
                  <td>{formatRupiah(i.total_cost)}</td>
                  <td>{formatDateTime(i.updated_at)}</td>
                  {canDelete && <td><button className="btn-danger" onClick={() => remove(i.code)}>Hapus</button></td>}
                </tr>
              ))}
              {!loading && items.length === 0 && <tr><td colSpan={7} style={{ textAlign: "center" }}>Tidak ada data.</td></tr>}
            </tbody>
          </table>
        </div>
        {cursor && (
          <div style={{ textAlign: "center", marginTop: 14 }}>
            <button className="btn-secondary" disabled={loading} onClick={() => load(true, cursor)}>
              {loading ? "Memuat..." : "Muat Lebih Banyak"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
