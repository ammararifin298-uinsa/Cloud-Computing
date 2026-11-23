import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { ROLE_LABEL, apiFetch } from "../lib/api.js";

export default function PegawaiPage() {
  const { user, showToast } = useAuth();
  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setUsers(await apiFetch("/api/users"));
      if (user.role === "superadmin") setSettings(await apiFetch("/api/settings"));
    } catch (e) {
      setError(e.message);
    }
  }, [user.role]);

  useEffect(() => { load(); }, [load]);

  const patch = async (id, body) => {
    try {
      await apiFetch(`/api/users/${id}`, { method: "PATCH", body });
      showToast("Data pegawai diperbarui", "success");
      load();
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const toggleSetting = async (key, enabled) => {
    try {
      await apiFetch(`/api/settings/${key}`, { method: "PATCH", body: { enabled } });
      load();
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const pending = users.filter((u) => !u.is_active);
  const roles = user.role === "superadmin" ? ["admin", "supervisor", "operator", "kurir"] : ["supervisor", "operator", "kurir"];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Manajemen Pegawai</h1>
          <p className="page-sub">{pending.length} akun menunggu persetujuan.</p>
        </div>
      </div>
      {error && <div className="degraded-banner">{error}</div>}
      <div className="card-box" style={{ marginBottom: 18 }}>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Kode</th><th>Nama</th><th>NIK</th><th>Gerai</th><th>Jabatan</th><th>Status</th><th /></tr></thead>
            <tbody>
              {users.map((u) => {
                const locked = u.id === user.id || (user.role === "admin" && ["admin", "superadmin"].includes(u.role));
                return (
                  <tr key={u.id}>
                    <td className="mono">{u.employee_code}</td>
                    <td>{u.full_name}</td>
                    <td className="mono">{u.nik_masked}</td>
                    <td>{u.station}</td>
                    <td>
                      {locked ? ROLE_LABEL[u.role] : (
                        <select className="form-control" value={u.role} onChange={(e) => patch(u.id, { role: e.target.value })}>
                          {roles.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                        </select>
                      )}
                    </td>
                    <td>{u.is_active ? "Aktif" : "Menunggu"}</td>
                    <td>
                      {!locked && (
                        <button className={u.is_active ? "btn-danger" : "btn-primary"}
                          onClick={() => patch(u.id, { is_active: !u.is_active })}>
                          {u.is_active ? "Nonaktifkan" : "Setujui"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {settings.length > 0 && (
        <div className="card-box">
          <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>Pengaturan Fitur</h2>
          {settings.map((s) => (
            <label key={s.key} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
              <input type="checkbox" checked={s.enabled} onChange={(e) => toggleSetting(s.key, e.target.checked)} />
              <span><strong>{s.label}</strong><br /><small style={{ color: "var(--muted)" }}>{s.description}</small></span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
