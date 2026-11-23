import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { ROLE_LABEL, apiFetch } from "../lib/api.js";

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function ProfilPage() {
  const { login, showToast } = useAuth();
  const [me, setMe] = useState(null);
  const [form, setForm] = useState({ full_name: "", phone: "", email: "", current_password: "", new_password: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiFetch("/api/auth/me").then((m) => {
      setMe(m);
      setForm((f) => ({ ...f, full_name: m.full_name, phone: m.phone || "", email: m.email || "" }));
    }).catch((e) => showToast(e.message, "error"));
  }, [showToast]);

  const save = async (extra = {}) => {
    setBusy(true);
    try {
      const body = { full_name: form.full_name, phone: form.phone, email: form.email, ...extra };
      if (form.new_password) {
        body.new_password = form.new_password;
        body.current_password = form.current_password;
      }
      const out = await apiFetch("/api/auth/me", { method: "PATCH", body });
      login(out.access_token, out.user);
      setMe(out.user);
      setForm((f) => ({ ...f, current_password: "", new_password: "" }));
      showToast("Profil diperbarui", "success");
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const onAvatar = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    save({ avatar_base64: await toBase64(f), avatar_content_type: f.type });
  };

  if (!me) return <p>Memuat profil...</p>;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Profil Saya</h1>
          <p className="page-sub">{ROLE_LABEL[me.role]} · {me.employee_code} · NIK {me.nik_masked}</p>
        </div>
      </div>
      <div className="card-box" style={{ maxWidth: 560 }}>
        {me.avatar_url && <img src={me.avatar_url} alt="Foto profil" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", marginBottom: 12 }} />}
        <div className="form-group"><label>Foto Profil</label>
          <input type="file" accept="image/jpeg,image/png,image/webp" className="form-control" onChange={onAvatar} /></div>
        <div className="form-group"><label>Nama Lengkap</label><input className="form-control" value={form.full_name} onChange={set("full_name")} /></div>
        <div className="form-group"><label>No. HP</label><input className="form-control" value={form.phone} onChange={set("phone")} /></div>
        <div className="form-group"><label>Email</label><input className="form-control" value={form.email} onChange={set("email")} /></div>
        <div className="grid-2" style={{ gap: 10 }}>
          <div className="form-group"><label>Kata Sandi Saat Ini</label><input type="password" className="form-control" value={form.current_password} onChange={set("current_password")} /></div>
          <div className="form-group"><label>Kata Sandi Baru</label><input type="password" className="form-control" value={form.new_password} onChange={set("new_password")} /></div>
        </div>
        <button className="btn-primary" disabled={busy} onClick={() => save()}>{busy ? "Menyimpan..." : "Simpan Perubahan"}</button>
      </div>
    </div>
  );
}
