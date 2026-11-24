import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiActivity,
  FiAward,
  FiBell,
  FiBriefcase,
  FiCalendar,
  FiCamera,
  FiCheckCircle,
  FiChevronRight,
  FiClock,
  FiCreditCard,
  FiDownload,
  FiEdit2,
  FiEye,
  FiEyeOff,
  FiHome,
  FiInfo,
  FiKey,
  FiLock,
  FiMail,
  FiMapPin,
  FiMonitor,
  FiPhone,
  FiSave,
  FiShield,
  FiTrash2,
  FiUser,
  FiUsers,
  FiX,
  FiZap,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext.jsx";
import { ROLE_LABEL, apiFetch, formatDateTime } from "../lib/api.js";

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
  const fileRef = useRef(null);
  const [me, setMe] = useState(null);
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState("profile"); // profile | security | prefs | activity
  const [editModal, setEditModal] = useState(false);
  const [confirmRemoveAvatar, setConfirmRemoveAvatar] = useState(false);

  const [showCurPw, setShowCurPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    username: "",
    phone: "",
    email: "",
    current_password: "",
    new_password: "",
  });

  const [prefs, setPrefs] = useState({
    notifResi: true,
    notifSistem: true,
    compactTable: false,
  });

  useEffect(() => {
    apiFetch("/api/auth/me")
      .then((m) => {
        setMe(m);
        setForm((f) => ({
          ...f,
          full_name: m.full_name || "",
          username: m.username || "",
          phone: m.phone || "",
          email: m.email || "",
        }));
      })
      .catch((e) => showToast(e.message, "error"));
  }, [showToast]);

  const save = async (extra = {}, successMsg = "Profil berhasil diperbarui") => {
    setBusy(true);
    try {
      const body = {
        full_name: form.full_name.trim(),
        username: form.username.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        ...extra,
      };
      if (form.new_password) {
        body.new_password = form.new_password;
        body.current_password = form.current_password;
      }
      const out = await apiFetch("/api/auth/me", { method: "PATCH", body });
      login(out.access_token, out.user);
      setMe(out.user);
      setForm((f) => ({ ...f, current_password: "", new_password: "" }));
      showToast(successMsg, "success");
      setEditModal(false);
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const onAvatar = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      showToast("Ukuran foto profil maksimal 5 MB", "error");
      return;
    }
    await save({ avatar_base64: await toBase64(f), avatar_content_type: f.type }, "Foto profil berhasil diperbarui");
    e.target.value = "";
  };

  const removeAvatar = () => {
    setConfirmRemoveAvatar(true);
  };

  const doRemoveAvatar = async () => {
    setConfirmRemoveAvatar(false);
    await save({ remove_avatar: true }, "Foto profil dihapus");
  };

  if (!me) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-sm font-medium text-slate-500">
        Memuat informasi akun pegawai...
      </div>
    );
  }

  const initials = (me.full_name || "U")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="space-y-5 pb-8">
      {/* BREADCRUMB & HEADER */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          <Link to="/" className="hover:text-blue-600 no-underline text-slate-500">
            <FiHome className="h-3.5 w-3.5" />
          </Link>
          <FiChevronRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="font-bold text-slate-800">Profil Saya</span>
        </div>

        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 shadow-xs">
            <FiUser className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
              Profil Saya
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Kelola informasi pribadi, kepegawaian, keamanan akun, dan preferensi Anda.
            </p>
          </div>
        </div>
      </div>

      {/* 4 TOP NAVIGATION TABS */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: "profile", label: "Informasi Profil", icon: FiUser },
          { id: "security", label: "Keamanan Akun", icon: FiShield },
          { id: "prefs", label: "Preferensi", icon: FiBell },
          { id: "activity", label: "Riwayat Aktivitas", icon: FiClock },
        ].map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`inline-flex min-h-[42px] items-center gap-2 rounded-xl px-4 text-xs sm:text-sm font-bold transition-all cursor-pointer ${active
                ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
            >
              <Icon className="h-4 w-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* MAIN GRID: LEFT 8 COLS + RIGHT 4 COLS */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* LEFT CONTENT */}
        <div className="xl:col-span-8 space-y-5">
          {/* BLUE GRADIENT EMPLOYEE HERO BANNER */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1346ad] via-[#1d63dc] to-[#2b7bf0] p-6 sm:p-7 text-white shadow-lg flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-5 min-w-0">
              {/* Avatar + Camera Upload */}
              <div className="relative shrink-0">
                <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white/80 bg-white/20 text-2xl font-extrabold text-white shadow-md overflow-hidden">
                  {me.avatar_url ? (
                    <img src={me.avatar_url} alt={me.full_name} className="h-full w-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={onAvatar}
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => fileRef.current?.click()}
                  title="Ganti Foto Profil"
                  className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 hover:bg-blue-400 text-white ring-2 ring-white shadow-md cursor-pointer"
                >
                  <FiCamera className="h-4 w-4" />
                </button>
              </div>

              <div className="min-w-0 space-y-2">
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight truncate">
                  {me.full_name}
                </h2>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-0.5 text-xs font-extrabold text-emerald-700 shadow-xs">
                  <FiCheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{me.is_active ? "Akun Aktif" : "Menunggu Aktivasi"}</span>
                </span>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-blue-100 font-semibold pt-0.5">
                  <span className="inline-flex items-center gap-1.5 font-mono">
                    <FiUser className="h-3.5 w-3.5 text-sky-300" />
                    {me.employee_code}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <FiBriefcase className="h-3.5 w-3.5 text-sky-300" />
                    {ROLE_LABEL[me.role] || me.role}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <FiMapPin className="h-3.5 w-3.5 text-sky-300" />
                    {me.station || "Kantor Pusat Jawa Timur"}
                  </span>
                </div>
              </div>
            </div>

            {me.avatar_url && (
              <button
                type="button"
                disabled={busy}
                onClick={removeAvatar}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl bg-white/15 hover:bg-rose-500/80 border border-white/25 px-3 text-xs font-bold text-white transition-colors cursor-pointer"
              >
                <FiTrash2 className="h-3.5 w-3.5" />
                <span>Hapus Foto</span>
              </button>
            )}
          </div>

          {/* TAB 1: INFORMASI PROFIL */}
          {activeTab === "profile" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: Informasi Pribadi */}
              <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                    <FiUser className="h-4 w-4 text-blue-600" />
                    <span>Informasi Pribadi</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditModal(true)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 cursor-pointer"
                  >
                    <FiEdit2 className="h-3 w-3 text-blue-600" />
                    <span>Ubah Data</span>
                  </button>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Nama Lengkap</span>
                    <span className="font-bold text-slate-900 text-right">{me.full_name}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Nama Pengguna</span>
                    <span className="font-mono font-bold text-slate-900">@{me.username}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">NIK</span>
                    <span className="font-mono font-bold text-slate-900">{me.nik_masked}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Status Akun</span>
                    <span className="font-bold text-emerald-700">
                      {me.is_active ? "Terverifikasi" : "Menunggu"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Kontak dan Alamat */}
              <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                    <FiMapPin className="h-4 w-4 text-blue-600" />
                    <span>Kontak dan Alamat</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditModal(true)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 cursor-pointer"
                  >
                    <FiEdit2 className="h-3 w-3 text-blue-600" />
                    <span>Ubah Data</span>
                  </button>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Nomor Handphone</span>
                    <span className="font-bold text-slate-900">{me.phone || "-"}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Email</span>
                    <span className="font-bold text-slate-900 truncate">{me.email || "-"}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Wilayah Kerja</span>
                    <span className="font-bold text-slate-900 text-right">Provinsi Jawa Timur</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Data Kepegawaian */}
              <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                    <FiBriefcase className="h-4 w-4 text-blue-600" />
                    <span>Data Kepegawaian</span>
                  </div>
                  <span className="text-[10.5px] font-semibold text-slate-400">
                    (Dikelola Admin)
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Kode Pegawai</span>
                    <span className="font-mono font-bold text-slate-900">{me.employee_code}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Jabatan</span>
                    <span className="font-bold text-blue-700">{ROLE_LABEL[me.role] || me.role}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Gerai / Penempatan</span>
                    <span className="font-bold text-slate-900">{me.station || "-"}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Tanggal Bergabung</span>
                    <span className="font-bold text-slate-900">
                      {me.created_at ? formatDateTime(me.created_at) : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-500">Status Kepegawaian</span>
                    <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                      {me.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 4: Ringkasan Peran dan Akses */}
              <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-3.5">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-extrabold text-slate-900">
                  <FiShield className="h-4 w-4 text-blue-600" />
                  <span>Ringkasan Akses Modul</span>
                </div>

                <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
                  <div className="flex items-center gap-2">
                    <FiCheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Akses Dashboard dan Daftar Pengiriman</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiCheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Pelacakan Resi dan Kalkulator Tarif Jawa Timur</span>
                  </div>
                  {["superadmin", "admin"].includes(me.role) && (
                    <div className="flex items-center gap-2">
                      <FiCheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>Manajemen Pegawai dan Verifikasi Pengajuan Kurir</span>
                    </div>
                  )}
                  {me.role === "superadmin" && (
                    <div className="flex items-center gap-2">
                      <FiCheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>Cadangan Data dan Pemulihan Bencana (DR)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: KEAMANAN AKUN */}
          {activeTab === "security" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save({}, "Kata sandi dan profil berhasil diperbarui");
              }}
              className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm space-y-4"
            >
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <FiKey className="h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Ubah Kata Sandi</h3>
                  <p className="text-xs text-slate-500">
                    Gunakan kata sandi yang kuat minimal 6 karakter untuk menjaga keamanan akun Anda.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="pf-curpw" className="block text-xs font-bold text-slate-700 mb-1.5">
                    Kata Sandi Saat Ini
                  </label>
                  <div className="relative flex items-center">
                    <FiLock className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      id="pf-curpw"
                      type={showCurPw ? "text" : "password"}
                      value={form.current_password}
                      onChange={set("current_password")}
                      placeholder="Masukkan kata sandi saat ini"
                      required
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-10 text-sm font-medium focus:border-blue-500 focus:bg-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurPw((v) => !v)}
                      className="absolute right-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showCurPw ? <FiEye className="h-4 w-4" /> : <FiEyeOff className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="pf-newpw" className="block text-xs font-bold text-slate-700 mb-1.5">
                    Kata Sandi Baru (Min. 6 Karakter)
                  </label>
                  <div className="relative flex items-center">
                    <FiKey className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      id="pf-newpw"
                      type={showNewPw ? "text" : "password"}
                      minLength={6}
                      value={form.new_password}
                      onChange={set("new_password")}
                      placeholder="Masukkan kata sandi baru"
                      required
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-10 text-sm font-medium focus:border-blue-500 focus:bg-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw((v) => !v)}
                      className="absolute right-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showNewPw ? <FiEye className="h-4 w-4" /> : <FiEyeOff className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-5 text-xs font-extrabold text-white shadow-sm cursor-pointer disabled:opacity-60"
                >
                  <FiSave className="h-4 w-4" />
                  <span>{busy ? "Menyimpan..." : "Perbarui Kata Sandi"}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: PREFERENSI */}
          {activeTab === "prefs" && (
            <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <FiBell className="h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Preferensi Notifikasi dan Tampilan</h3>
                  <p className="text-xs text-slate-500">Sesuaikan pengalaman penggunaan panel LacakIn.</p>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  {
                    key: "notifResi",
                    title: "Notifikasi Pembaruan Resi",
                    desc: "Tampilkan pemberitahuan saat ada perubahan status pengiriman terbaru.",
                  },
                  {
                    key: "notifSistem",
                    title: "Peringatan Kesehatan Sistem",
                    desc: "Tampilkan informasi apabila layanan operasional berada dalam mode pemulihan.",
                  },
                  {
                    key: "compactTable",
                    title: "Tampilan Tabel Ringkas",
                    desc: "Gunakan kerapatan baris lebih ringkas pada daftar pengiriman.",
                  },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-extrabold text-slate-900">{item.title}</div>
                      <div className="text-[11.5px] text-slate-500 mt-0.5">{item.desc}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={prefs[item.key]}
                      onChange={(e) => {
                        setPrefs((p) => ({ ...p, [item.key]: e.target.checked }));
                        showToast("Preferensi disimpan", "success");
                      }}
                      className="h-5 w-5 rounded border-slate-300 text-blue-600 cursor-pointer"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: RIWAYAT AKTIVITAS */}
          {activeTab === "activity" && (
            <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <FiActivity className="h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Riwayat Aktivitas Akun</h3>
                  <p className="text-xs text-slate-500">Catatan sesi masuk dan pembaruan profil terakhir.</p>
                </div>
              </div>

              <div className="space-y-3 border-l-2 border-blue-100 pl-4 text-xs">
                <div>
                  <div className="font-bold text-slate-900">Sesi Masuk Aktif</div>
                  <div className="text-slate-500 mt-0.5">
                    Masuk sebagai {me.full_name} ({ROLE_LABEL[me.role] || me.role}) di {me.station || "Jawa Timur"}
                  </div>
                </div>
                {me.created_at && (
                  <div>
                    <div className="font-bold text-slate-900">Akun Terdaftar di Sistem</div>
                    <div className="text-slate-500 mt-0.5">{formatDateTime(me.created_at)}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR COLUMN */}
        <aside className="xl:col-span-4 space-y-4">
          {/* Card 1: Kelengkapan Data Profil */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <FiAward className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Kelengkapan Data Profil</h3>
                <p className="text-[11px] text-slate-500">Pastikan data Anda selalu lengkap dan terbaru.</p>
              </div>
            </div>

            <div>
              <div className="flex justify-end text-xs font-extrabold text-emerald-600 mb-1">
                100%
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full w-full rounded-full bg-emerald-500" />
              </div>
            </div>

            <div className="space-y-2 text-xs pt-1">
              {[
                "Data Pribadi",
                "Kontak dan Alamat",
                "Data Kepegawaian",
                "Verifikasi Identitas",
              ].map((lbl) => (
                <div key={lbl} className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 font-semibold text-slate-700">
                    <FiCheckCircle className="h-4 w-4 text-emerald-500" />
                    {lbl}
                  </span>
                  <span className="font-bold text-emerald-600">Lengkap</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Aksi Cepat */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900 pb-1">
              <FiZap className="h-4 w-4 text-blue-600" />
              <span>Aksi Cepat</span>
            </div>

            <button
              type="button"
              onClick={() => setEditModal(true)}
              className="flex w-full min-h-[42px] items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-blue-50 px-3.5 text-xs font-bold text-slate-800 transition-colors cursor-pointer"
            >
              <span className="inline-flex items-center gap-2.5">
                <FiEdit2 className="h-4 w-4 text-blue-600" />
                Ubah Data Profil
              </span>
              <FiChevronRight className="h-4 w-4 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full min-h-[42px] items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-blue-50 px-3.5 text-xs font-bold text-slate-800 transition-colors cursor-pointer"
            >
              <span className="inline-flex items-center gap-2.5">
                <FiCamera className="h-4 w-4 text-blue-600" />
                Ganti Foto Profil
              </span>
              <FiChevronRight className="h-4 w-4 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("security")}
              className="flex w-full min-h-[42px] items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-blue-50 px-3.5 text-xs font-bold text-slate-800 transition-colors cursor-pointer"
            >
              <span className="inline-flex items-center gap-2.5">
                <FiKey className="h-4 w-4 text-blue-600" />
                Ubah Kata Sandi
              </span>
              <FiChevronRight className="h-4 w-4 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={async () => {
                try {
                  const W = 1012;
                  const H = 638;
                  const canvas = document.createElement("canvas");
                  canvas.width = W;
                  canvas.height = H;
                  const ctx = canvas.getContext("2d");
                  if (!ctx) return;

                  const roundRectPath = (x, y, w, h, r) => {
                    ctx.beginPath();
                    ctx.moveTo(x + r, y);
                    ctx.arcTo(x + w, y, x + w, y + h, r);
                    ctx.arcTo(x + w, y + h, x, y + h, r);
                    ctx.arcTo(x, y + h, x, y, r);
                    ctx.arcTo(x, y, x + w, y, r);
                    ctx.closePath();
                  };

                  // Clip seluruh kartu dengan sudut melengkung (rounded-corner CR80)
                  ctx.clearRect(0, 0, W, H);
                  ctx.save();
                  roundRectPath(2, 2, W - 4, H - 4, 38);
                  ctx.clip();

                  // Card background
                  ctx.fillStyle = "#ffffff";
                  ctx.fillRect(0, 0, W, H);

                  // Top blue gradient banner
                  const grad = ctx.createLinearGradient(0, 0, W, 165);
                  grad.addColorStop(0, "#0b225d");
                  grad.addColorStop(0.6, "#1545ab");
                  grad.addColorStop(1, "#1d4ed8");
                  ctx.fillStyle = grad;
                  ctx.fillRect(0, 0, W, 165);

                  // Decorative circle accent
                  ctx.fillStyle = "rgba(255,255,255,0.08)";
                  ctx.beginPath();
                  ctx.arc(W - 80, 40, 120, 0, Math.PI * 2);
                  ctx.fill();

                  // Brand header text
                  ctx.fillStyle = "#ffffff";
                  ctx.font = "800 40px 'Segoe UI', Arial, sans-serif";
                  ctx.fillText("LacakIn Logistics", 44, 72);
                  ctx.fillStyle = "#bfdbfe";
                  ctx.font = "600 21px 'Segoe UI', Arial, sans-serif";
                  ctx.fillText("Kartu Identitas Pegawai Resmi", 44, 108);

                  // Role badge pill
                  const roleName = String(ROLE_LABEL[me.role] || me.role || "Pegawai").toUpperCase();
                  ctx.font = "800 20px 'Segoe UI', Arial, sans-serif";
                  const roleW = Math.max(120, ctx.measureText(roleName).width + 48);
                  roundRectPath(W - 44 - roleW, 50, roleW, 48, 24);
                  ctx.fillStyle = "rgba(255,255,255,0.18)";
                  ctx.fill();
                  ctx.strokeStyle = "rgba(255,255,255,0.4)";
                  ctx.lineWidth = 2;
                  ctx.stroke();
                  ctx.fillStyle = "#ffffff";
                  ctx.textAlign = "center";
                  ctx.fillText(roleName, W - 44 - roleW / 2, 81);
                  ctx.textAlign = "left";

                  // Avatar box (180x180)
                  const avX = 48;
                  const avY = 200;
                  const avS = 180;
                  let drewImg = false;
                  if (me.avatar_url) {
                    try {
                      const img = await new Promise((resolve, reject) => {
                        const im = new Image();
                        im.crossOrigin = "anonymous";
                        im.onload = () => resolve(im);
                        im.onerror = reject;
                        im.src = me.avatar_url;
                      });
                      ctx.save();
                      roundRectPath(avX, avY, avS, avS, 24);
                      ctx.clip();
                      ctx.drawImage(img, avX, avY, avS, avS);
                      ctx.restore();
                      drewImg = true;
                    } catch {
                      drewImg = false;
                    }
                  }
                  if (!drewImg) {
                    const initials = String(me.full_name || "L")
                      .split(" ")
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();
                    roundRectPath(avX, avY, avS, avS, 24);
                    ctx.fillStyle = "#1d4ed8";
                    ctx.fill();
                    ctx.fillStyle = "#ffffff";
                    ctx.font = "800 64px 'Segoe UI', Arial, sans-serif";
                    ctx.textAlign = "center";
                    ctx.fillText(initials, avX + avS / 2, avY + avS / 2 + 22);
                    ctx.textAlign = "left";
                  }
                  roundRectPath(avX, avY, avS, avS, 24);
                  ctx.strokeStyle = "#bfdbfe";
                  ctx.lineWidth = 4;
                  ctx.stroke();

                  // Main employee info
                  const infoX = 264;
                  ctx.fillStyle = "#0f172a";
                  ctx.font = "800 38px 'Segoe UI', Arial, sans-serif";
                  ctx.fillText(me.full_name || "-", infoX, 248, W - infoX - 44);

                  ctx.fillStyle = "#1d4ed8";
                  ctx.font = "700 24px 'Segoe UI', Arial, sans-serif";
                  ctx.fillText(me.job_title || ROLE_LABEL[me.role] || "Pegawai Operasional", infoX, 288, W - infoX - 44);

                  // Employee code badge
                  const empCode = me.employee_code || "EMP-LACAKIN";
                  ctx.font = "800 24px Consolas, monospace";
                  const codeW = Math.max(150, ctx.measureText(empCode).width + 36);
                  roundRectPath(infoX, 314, codeW, 46, 10);
                  ctx.fillStyle = "#eff6ff";
                  ctx.fill();
                  ctx.strokeStyle = "#93c5fd";
                  ctx.lineWidth = 2;
                  ctx.stroke();
                  ctx.fillStyle = "#1e40af";
                  ctx.fillText(empCode, infoX + 18, 345);

                  // Footer details band
                  ctx.fillStyle = "#f8fafc";
                  ctx.fillRect(0, 418, W, H - 418);
                  ctx.strokeStyle = "#cbd5e1";
                  ctx.lineWidth = 2;
                  ctx.setLineDash([8, 6]);
                  ctx.beginPath();
                  ctx.moveTo(0, 418);
                  ctx.lineTo(W, 418);
                  ctx.stroke();
                  ctx.setLineDash([]);

                  const fields = [
                    { lbl: "UNIT / HUB PENUGASAN", val: me.station || me.hub_name || "DC Rungkut, Surabaya", x: 48, y: 462 },
                    { lbl: "DEPARTEMEN", val: me.department || "Operasional", x: 540, y: 462 },
                    { lbl: "NO. TELEPON", val: me.phone || "-", x: 48, y: 548 },
                    { lbl: "STATUS KEPEGAWAIAN", val: `${me.employment_status || "PKWTT"} - Aktif`, x: 540, y: 548 },
                  ];
                  fields.forEach((f) => {
                    ctx.fillStyle = "#64748b";
                    ctx.font = "700 17px 'Segoe UI', Arial, sans-serif";
                    ctx.fillText(f.lbl, f.x, f.y);
                    ctx.fillStyle = "#0f172a";
                    ctx.font = "700 23px 'Segoe UI', Arial, sans-serif";
                    ctx.fillText(f.val, f.x, f.y + 32, 440);
                  });

                  // Tutup clip & gambar border melengkung di keempat sudut
                  ctx.restore();
                  roundRectPath(2, 2, W - 4, H - 4, 38);
                  ctx.strokeStyle = "#cbd5e1";
                  ctx.lineWidth = 4;
                  ctx.stroke();

                  const url = canvas.toDataURL("image/png");
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `kartu-pegawai-${empCode}.png`;
                  a.click();
                  showToast(`Kartu pegawai ${empCode} berhasil diunduh (PNG).`, "success");
                } catch {
                  showToast("Gagal membuat gambar kartu pegawai.", "error");
                }
              }}
              className="flex w-full min-h-[42px] items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-blue-50 px-3.5 text-xs font-bold text-slate-800 transition-colors cursor-pointer"
            >
              <span className="inline-flex items-center gap-2.5">
                <FiDownload className="h-4 w-4 text-blue-600" />
                Unduh Kartu Pegawai (PNG)
              </span>
              <FiChevronRight className="h-4 w-4 text-slate-400" />
            </button>
          </div>

          {/* Card 3: Informasi Akun */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
              <FiInfo className="h-4 w-4 text-blue-600" />
              <span>Informasi Akun</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Tanggal Bergabung</span>
                <span className="font-bold text-slate-800">
                  {me.created_at ? formatDateTime(me.created_at) : "-"}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Perangkat</span>
                <span className="font-bold text-slate-800">Browser Web LacakIn</span>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2.5 text-xs font-bold text-emerald-700">
              <FiShield className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>Akun Anda aman dan terlindungi.</span>
            </div>
          </div>
        </aside>
      </div>

      {/* EDIT PROFILE MODAL */}
      {editModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
            className="w-full max-w-[460px] rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">Ubah Data Profil</h3>
              <button
                type="button"
                onClick={() => setEditModal(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Lengkap *</label>
                <input
                  required
                  value={form.full_name}
                  onChange={set("full_name")}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 font-medium"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Pengguna (Username) *</label>
                <input
                  required
                  value={form.username}
                  onChange={set("username")}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nomor Handphone *</label>
                <input
                  required
                  value={form.phone}
                  onChange={set("phone")}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Alamat Email *</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditModal(false)}
                className="min-h-[40px] rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-700 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-5 text-xs font-extrabold text-white cursor-pointer"
              >
                <FiSave className="h-3.5 w-3.5" />
                <span>{busy ? "Menyimpan..." : "Simpan Perubahan"}</span>
              </button>
            </div>
          </form>
        </div>
      )}
      {confirmRemoveAvatar && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-[380px] rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                <FiTrash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Hapus Foto Profil?</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Foto profil akan dikembalikan ke inisial nama Anda.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmRemoveAvatar(false)}
                className="min-h-[40px] rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-700 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={doRemoveAvatar}
                className="min-h-[40px] rounded-xl bg-rose-600 hover:bg-rose-700 px-4 text-xs font-extrabold text-white cursor-pointer"
              >
                Ya, Hapus Foto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
