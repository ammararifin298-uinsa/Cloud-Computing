import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/Icons.jsx";
import { apiFetch } from "../lib/api.js";

export default function RegisterPage() {
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(null);

  const [form, setForm] = useState({
    full_name: "",
    nik: "",
    phone: "",
    email: "",
    hub_id: "",
    station: "",
    username: "",
    password: "",
  });

  useEffect(() => {
    apiFetch("/api/reference")
      .then((data) => setHubs(data.hubs || []))
      .catch(() => {});
  }, []);

  const handleHubChange = (val) => {
    const selected = hubs.find((h) => String(h.id) === val);
    setForm((prev) => ({
      ...prev,
      hub_id: val,
      station: selected ? selected.name : prev.station,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const out = await apiFetch("/api/auth/register", {
        method: "POST",
        body: {
          role: "kurir",
          full_name: form.full_name.trim(),
          nik: form.nik.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          station: form.station.trim(),
          hub_id: form.hub_id ? Number(form.hub_id) : null,
          username: form.username.trim(),
          password: form.password,
        },
      });
      setCreated(out);
    } catch (err) {
      setError(err.message || "Pendaftaran gagal. Periksa kembali data yang dimasukkan.");
    } finally {
      setLoading(false);
    }
  };

  if (created) {
    return (
      <div className="card-box" style={{ maxWidth: 560, margin: "24px auto", padding: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#15803d", marginBottom: 8 }}>
          Pendaftaran Berhasil Dikirim
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 16 }}>
          {created.message}
        </p>
        <div
          style={{
            padding: 14,
            borderRadius: 10,
            background: "var(--surface-2)",
            border: "1px solid var(--line)",
            fontSize: 13.5,
            marginBottom: 20,
          }}
        >
          <div>Kode Pegawai: <strong className="mono">{created.user?.employee_code}</strong></div>
          <div>Nama Lengkap: <strong>{created.user?.full_name}</strong></div>
          <div>Status Akun: <strong>Menunggu Persetujuan Admin</strong></div>
        </div>
        <Link to="/login" className="btn-primary">
          Kembali ke Halaman Masuk
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-split">
      <div className="auth-hero">
        <div>
          <img src="/logo.svg" alt="LacakIn" style={{ width: 52, height: 52, marginBottom: 16 }} />
          <h1 style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.25 }}>
            Pendaftaran Akun Kurir Lapangan
          </h1>
          <p style={{ marginTop: 12, opacity: 0.9, fontSize: 14 }}>
            Lengkapi identitas resmi dan gerai penempatan Anda di wilayah Jawa Timur. Setiap pendaftaran akan diverifikasi terlebih dahulu oleh Admin sebelum aktif.
          </p>
        </div>
        <div style={{ marginTop: 28, fontSize: 12.5, opacity: 0.85 }}>
          Pastikan nomor induk kependudukan, nomor ponsel aktif, dan alamat email sesuai dokumen resmi.
        </div>
      </div>

      <form className="auth-form-panel" onSubmit={handleSubmit}>
        <h2 style={{ fontSize: 21, fontWeight: 800, marginBottom: 16 }}>Formulir Pendaftaran Kurir</h2>

        <div className="grid-2" style={{ gap: 12 }}>
          <div className="form-group">
            <label htmlFor="reg-name">Nama Lengkap</label>
            <input
              id="reg-name"
              className="form-control"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="reg-nik">NIK (16 Digit)</label>
            <input
              id="reg-nik"
              className="form-control mono"
              maxLength={16}
              pattern="\d{16}"
              value={form.nik}
              onChange={(e) => setForm({ ...form, nik: e.target.value.replace(/\D/g, "") })}
              required
            />
          </div>
        </div>

        <div className="grid-2" style={{ gap: 12 }}>
          <div className="form-group">
            <label htmlFor="reg-phone">Nomor HP Aktif</label>
            <input
              id="reg-phone"
              className="form-control"
              placeholder="08xxxxxxxxxx"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="reg-email">Alamat Email</label>
            <input
              id="reg-email"
              type="email"
              className="form-control"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="reg-hub">Gerai atau Hub Penempatan</label>
          {hubs.length > 0 ? (
            <select
              id="reg-hub"
              className="form-control"
              value={form.hub_id}
              onChange={(e) => handleHubChange(e.target.value)}
              required
            >
              <option value="">-- Pilih Gerai Penempatan --</option>
              {hubs.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.city_name})
                </option>
              ))}
            </select>
          ) : (
            <input
              id="reg-hub"
              className="form-control"
              placeholder="Nama gerai penempatan"
              value={form.station}
              onChange={(e) => setForm({ ...form, station: e.target.value })}
              required
            />
          )}
        </div>

        <div className="grid-2" style={{ gap: 12 }}>
          <div className="form-group">
            <label htmlFor="reg-user">Nama Pengguna</label>
            <input
              id="reg-user"
              className="form-control"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="reg-pass">Kata Sandi (Min. 6 Karakter)</label>
            <div className="pw-wrap">
              <input
                id="reg-pass"
                type={showPass ? "text" : "password"}
                className="form-control"
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
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
        </div>

        {error && (
          <div
            role="alert"
            style={{
              marginBottom: 14,
              padding: 11,
              borderRadius: 8,
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

        <button type="submit" className="btn-primary" style={{ width: "100%" }} disabled={loading}>
          {loading ? "Mengirim Pendaftaran..." : "Daftar Sekarang"}
        </button>

        <p style={{ marginTop: 16, fontSize: 13, color: "var(--muted)", textAlign: "center" }}>
          Sudah memiliki akun aktif?{" "}
          <Link to="/login" style={{ color: "var(--brand)", fontWeight: 700, textDecoration: "none" }}>
            Masuk di sini
          </Link>
        </p>
      </form>
    </div>
  );
}
