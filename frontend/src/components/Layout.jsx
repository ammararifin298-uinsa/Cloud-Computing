import React, { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { ROLE_LABEL, hasRole } from "../lib/api.js";
import { Icon } from "./Icons.jsx";
import Toast from "./Toast.jsx";

export function PublicLayout() {
  const { isAuthenticated, degradedMessage, setDegradedMessage } = useAuth();

  return (
    <div className="pub-shell">
      <header className="pub-header">
        <div className="pub-header-inner">
          <Link to="/lacak" className="pub-brand">
            <img src="/logo.svg" alt="Logo LacakIn" />
            <span>LacakIn</span>
          </Link>

          <nav className="pub-nav" aria-label="Navigasi publik">
            <NavLink to="/lacak">
              <Icon name="search" size={15} />
              Lacak Paket
            </NavLink>
            <NavLink to="/tarif">
              <Icon name="calculator" size={15} />
              Cek Tarif
            </NavLink>
            {isAuthenticated ? (
              <NavLink to="/" className="btn-nav-primary">
                <Icon name="dashboard" size={15} />
                Panel Operasional
              </NavLink>
            ) : (
              <>
                <NavLink to="/register">Daftar Kurir</NavLink>
                <NavLink to="/login" className="btn-nav-primary">
                  Masuk Pegawai
                </NavLink>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="pub-content">
        {degradedMessage && (
          <div className="degraded-banner" role="alert">
            <span>{degradedMessage}</span>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: "4px 10px", fontSize: 12 }}
              onClick={() => setDegradedMessage(null)}
            >
              Tutup
            </button>
          </div>
        )}
        <Outlet />
      </main>

      <footer className="pub-footer">
        LacakIn — Layanan Pengiriman dan Pelacakan Paket Jawa Timur
      </footer>
      <Toast />
    </div>
  );
}

export function AppLayout() {
  const { user, logout, degradedMessage, setDegradedMessage } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const navigate = useNavigate();

  const doLogout = () => {
    setConfirmLogout(false);
    logout();
    navigate("/lacak");
  };

  const navItems = [
    { to: "/", label: "Dashboard", icon: "dashboard", roles: ["superadmin", "admin", "supervisor", "operator", "kurir"], end: true },
    { to: "/kirim", label: "Buat Pesanan", icon: "package-plus", roles: ["superadmin", "admin", "operator"] },
    { to: "/checkpoint", label: "Input Checkpoint", icon: "scan", roles: ["superadmin", "admin", "operator", "kurir"] },
    { to: "/pengiriman", label: "Daftar Pengiriman", icon: "truck", roles: ["superadmin", "admin", "supervisor", "operator", "kurir"] },
    { to: "/lacak", label: "Lacak Resi", icon: "search", roles: ["superadmin", "admin", "supervisor", "operator", "kurir"] },
    { to: "/tarif", label: "Kalkulator Tarif", icon: "calculator", roles: ["superadmin", "admin", "supervisor", "operator", "kurir"] },
    { to: "/pegawai", label: "Manajemen Pegawai", icon: "users", roles: ["superadmin", "admin"] },
    { to: "/backup", label: "Cadangan Data", icon: "database", roles: ["superadmin", "admin"] },
    { to: "/profil", label: "Profil Saya", icon: "user", roles: ["superadmin", "admin", "supervisor", "operator", "kurir"] },
  ].filter((item) => hasRole(user, item.roles));

  const initials = (user?.full_name || "U")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="app-shell">
      <div className="mobile-topbar">
        <Link to="/" className="pub-brand" style={{ fontSize: 16 }}>
          <img src="/logo.svg" alt="LacakIn" style={{ width: 30, height: 30 }} />
          <span>LacakIn</span>
        </Link>
        <button type="button" className="btn-secondary" onClick={() => setMenuOpen((v) => !v)}>
          <Icon name="menu" size={16} />
          {menuOpen ? "Tutup" : "Menu"}
        </button>
      </div>

      {menuOpen && <div className="sidebar-backdrop" onClick={() => setMenuOpen(false)} />}

      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <Link to="/" className="brand" onClick={() => setMenuOpen(false)}>
          <img src="/logo.svg" alt="Logo LacakIn" style={{ width: 38, height: 38 }} />
          <div>
            <div className="brand-name">LacakIn</div>
            <div className="brand-sub">Operasional Logistik</div>
          </div>
        </Link>

        <div className="nav-label">Menu Utama</div>
        <nav className="nav" aria-label="Navigasi utama">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <Icon name={item.icon} size={17} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="side-footer">
          {user && (
            <div className="side-user">
              <div className="avatar-circle">
                {user.avatar_url ? <img src={user.avatar_url} alt={user.full_name} /> : initials}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 12.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {user.full_name}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>
                  {ROLE_LABEL[user.role] || user.role} · {user.employee_code}
                </div>
              </div>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: "6px 8px" }}
                title="Keluar"
                onClick={() => setConfirmLogout(true)}
              >
                <Icon name="logout" size={15} />
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className="app-main">
        {degradedMessage && (
          <div className="degraded-banner" role="alert">
            <span>{degradedMessage}</span>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: "4px 10px", fontSize: 12 }}
              onClick={() => setDegradedMessage(null)}
            >
              Tutup
            </button>
          </div>
        )}
        <Outlet />
      </main>

      {confirmLogout && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Konfirmasi Keluar">
          <div className="card-box" style={{ width: "100%", maxWidth: 380, textAlign: "center" }}>
            <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 8 }}>Keluar dari Akun?</h3>
            <p style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 20 }}>
              Anda perlu masuk kembali untuk mengakses panel operasional pegawai.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button type="button" className="btn-secondary" onClick={() => setConfirmLogout(false)}>
                Batal
              </button>
              <button type="button" className="btn-danger" style={{ padding: "9px 18px" }} onClick={doLogout}>
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast />
    </div>
  );
}
