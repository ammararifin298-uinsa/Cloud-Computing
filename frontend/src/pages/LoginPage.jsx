import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Icon } from "../components/Icons.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { apiFetch } from "../lib/api.js";

export default function LoginPage() {
  const { login, showToast } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const out = await apiFetch("/api/auth/login", {
        method: "POST",
        body: { identifier: identifier.trim(), password },
      });
      login(out.access_token, out.user);
      showToast(`Selamat datang, ${out.user.full_name}`, "success");
      navigate("/");
    } catch (err) {
      setError(err.message || "Identitas atau kata sandi salah.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-split">
      <div className="auth-hero">
        <div>
          <img src="/logo.svg" alt="LacakIn" style={{ width: 52, height: 52, marginBottom: 18 }} />
          <h1 style={{ fontSize: 27, fontWeight: 800, lineHeight: 1.22, letterSpacing: "-0.5px" }}>
            Portal Operasional Pegawai LacakIn
          </h1>
          <p style={{ marginTop: 12, opacity: 0.9, fontSize: 14.5 }}>
            Kelola pesanan pengiriman, pembaruan checkpoint perjalanan paket, serta operasional gerai Jawa Timur secara terpadu.
          </p>
        </div>
        <div style={{ marginTop: 28, fontSize: 12.5, opacity: 0.85, borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: 14 }}>
          Gunakan NIK, kode pegawai, atau nama pengguna yang telah diaktifkan oleh Admin.
        </div>
      </div>

      <form className="auth-form-panel" onSubmit={handleSubmit}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Masuk ke Akun Pegawai</h2>
        <p style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 22 }}>
          Akses khusus petugas operasional, kurir, operator, dan pengelola cabang.
        </p>

        <div className="form-group">
          <label htmlFor="login-ident">Nama Pengguna, Kode Pegawai, atau NIK</label>
          <input
            id="login-ident"
            type="text"
            className="form-control"
            placeholder="Masukkan identitas pegawai"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            autoComplete="username"
          />
        </div>

        <div className="form-group">
          <label htmlFor="login-pass">Kata Sandi</label>
          <div className="pw-wrap">
            <input
              id="login-pass"
              type={showPass ? "text" : "password"}
              className="form-control"
              placeholder="Masukkan kata sandi"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              className="pw-toggle"
              onClick={() => setShowPass((v) => !v)}
              aria-label={showPass ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            >
              <Icon name={showPass ? "eye-off" : "eye"} size={17} />
            </button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              marginBottom: 16,
              padding: 12,
              borderRadius: 10,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#991b1b",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        )}

        <button type="submit" className="btn-primary" style={{ width: "100%", padding: "11px 18px" }} disabled={loading}>
          {loading ? "Memverifikasi..." : "Masuk Sekarang"}
        </button>

        <p style={{ marginTop: 20, fontSize: 13.5, color: "var(--muted)", textAlign: "center" }}>
          Kurir baru belum memiliki akun?{" "}
          <Link to="/register" style={{ color: "var(--brand)", fontWeight: 700, textDecoration: "none" }}>
            Ajukan Pendaftaran
          </Link>
        </p>
      </form>
    </div>
  );
}
