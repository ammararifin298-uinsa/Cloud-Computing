import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiBarChart2,
  FiEye,
  FiEyeOff,
  FiHeadphones,
  FiHome,
  FiInfo,
  FiLock,
  FiLogIn,
  FiMail,
  FiShield,
  FiX,
  FiZap,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext.jsx";
import { apiFetch } from "../lib/api.js";

const REMEMBER_IDENT_KEY = "lacakin_remember_ident";

export default function LoginPage() {
  const { login, showToast } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState(() => localStorage.getItem(REMEMBER_IDENT_KEY) || "");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  // Modal Lupa Password
  const [forgotOpen, setForgotOpen] = useState(false);
  const [fpIdent, setFpIdent] = useState("");
  const [fpVerif, setFpVerif] = useState("");
  const [fpNewPass, setFpNewPass] = useState("");
  const [fpConfirmPass, setFpConfirmPass] = useState("");
  const [fpShowPass, setFpShowPass] = useState(false);
  const [fpLoading, setFpLoading] = useState(false);
  const [fpError, setFpError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfoMessage("");
    try {
      const cleanIdent = identifier.trim();
      const out = await apiFetch("/api/auth/login", {
        method: "POST",
        body: { identifier: cleanIdent, password },
      });
      if (rememberMe) {
        localStorage.setItem(REMEMBER_IDENT_KEY, cleanIdent);
      } else {
        localStorage.removeItem(REMEMBER_IDENT_KEY);
      }
      login(out.access_token, out.user, rememberMe);
      showToast(`Selamat datang, ${out.user.full_name}`, "success");
      navigate("/");
    } catch (err) {
      setError(err.message || "Identitas atau kata sandi salah.");
    } finally {
      setLoading(false);
    }
  };

  function handleForgotPassword() {
    setError("");
    setFpError("");
    setFpIdent(identifier.trim());
    setFpVerif("");
    setFpNewPass("");
    setFpConfirmPass("");
    setForgotOpen(true);
  }

  async function handleResetSubmit(e) {
    e.preventDefault();
    setFpError("");
    if (fpNewPass.length < 6) {
      setFpError("Kata sandi baru minimal 6 karakter.");
      return;
    }
    if (fpNewPass !== fpConfirmPass) {
      setFpError("Konfirmasi kata sandi tidak cocok.");
      return;
    }
    setFpLoading(true);
    try {
      const out = await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        body: {
          identifier: fpIdent.trim(),
          verification: fpVerif.trim(),
          new_password: fpNewPass,
        },
      });
      setIdentifier(fpIdent.trim());
      setPassword("");
      setForgotOpen(false);
      setInfoMessage(out.message || "Kata sandi berhasil diperbarui. Silakan login.");
      showToast("Kata sandi berhasil diatur ulang", "success");
    } catch (err) {
      setFpError(err.message || "Gagal mengatur ulang kata sandi.");
    } finally {
      setFpLoading(false);
    }
  }

  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-gradient-to-br from-[#1b5be0] via-[#dbeafe] to-[#0c2d7a] flex flex-col justify-between">
      {/* Decorative Sweeping Background Waves */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 32% 28%, rgba(255,255,255,0.92) 0%, rgba(219,234,254,0.85) 38%, rgba(37,99,235,0.45) 78%, rgba(10,27,78,0.9) 100%)",
        }}
      />
      <svg
        viewBox="0 0 1440 900"
        className="pointer-events-none hidden lg:block absolute inset-0 h-full w-full object-cover"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M0,0 L420,0 C220,180 90,390 0,620 Z"
          fill="#1d4ed8"
          opacity="0.35"
        />
        <path
          d="M1440,0 L920,0 C1120,160 1290,340 1440,560 Z"
          fill="#1e40af"
          opacity="0.45"
        />
        <path
          d="M0,900 L0,710 C320,690 540,790 880,760 C1140,735 1300,640 1440,610 L1440,900 Z"
          fill="#071946"
        />
        <path
          d="M360,900 C540,790 790,740 1180,720 L1440,710 L1440,900 Z"
          fill="#1d4ed8"
          opacity="0.55"
        />
      </svg>

      {/* Main Content Container */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1320px] flex-1 flex-col lg:flex-row items-center justify-center lg:justify-between gap-5 lg:gap-8 px-4 py-6 sm:px-8 lg:py-10">
        {/* Compact Mobile & Tablet Brand Header + 4 Feature Cards (Shown above Login Card on < lg) */}
        <div className="flex lg:hidden flex-col w-full max-w-[460px] space-y-3.5">
          <div className="flex items-center justify-between gap-3">
            <Link to="/beranda" className="inline-flex items-center gap-2.5 no-underline">
              <img src="/logo.svg" alt="Logo LacakIn" className="h-10 w-10 rounded-xl shadow-md" />
              <div>
                <div className="text-xl font-extrabold tracking-tight text-[#0b1f52] leading-none">
                  LacakIn
                </div>
                <div className="text-[11px] font-semibold text-slate-600 mt-0.5">
                  Logistics dan Tracking System
                </div>
              </div>
            </Link>
            <Link
              to="/beranda"
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-white/85 px-3 py-1.5 text-xs font-bold text-[#0f2354] shadow-xs border border-blue-100 no-underline"
            >
              <FiHome className="h-3.5 w-3.5 text-blue-600" />
              Beranda
            </Link>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#081a4b] leading-tight">
              Selamat Datang di <span className="text-blue-600">LacakIn</span>
            </h1>
            <p className="text-xs font-medium text-slate-700 mt-1">
              Kelola pengiriman dengan lebih mudah, cepat, dan efisien.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { icon: FiZap, top: "Akses", bottom: "Cepat" },
              { icon: FiShield, top: "Aman dan", bottom: "Terpercaya" },
              { icon: FiBarChart2, top: "Real-Time", bottom: "Tracking" },
              { icon: FiHeadphones, top: "Dukungan", bottom: "24/7" },
            ].map((b) => {
              const Icon = b.icon;
              return (
                <div
                  key={`mob-${b.top}-${b.bottom}`}
                  className="flex flex-col items-center justify-center rounded-2xl bg-white/80 backdrop-blur-md border border-white/90 px-2.5 py-2.5 text-center shadow-xs"
                >
                  <div className="mb-1 flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="text-[11px] font-extrabold text-[#0b1f52] leading-tight">
                    {b.top} {b.bottom}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* LEFT HERO SECTION (Desktop Only) */}
        <div className="hidden lg:flex order-2 lg:order-1 w-full lg:w-[56%] flex-col justify-between space-y-6">
          {/* Top Brand Logo & Back to Home Link (Desktop) */}
          <div className="hidden lg:flex flex-wrap items-center justify-between gap-4">
            <Link
              to="/beranda"
              className="inline-flex items-center gap-3.5 no-underline group"
            >
              <img
                src="/logo.svg"
                alt="Logo LacakIn"
                className="h-12 w-12 rounded-2xl shadow-lg group-hover:scale-105 transition-transform"
              />
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0b1f52] leading-none">
                  LacakIn
                </div>
                <div className="text-xs sm:text-sm font-semibold text-slate-600 mt-1">
                  Logistics dan Tracking System
                </div>
              </div>
            </Link>

            <Link
              to="/beranda"
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full bg-white/80 hover:bg-white backdrop-blur-md px-3.5 py-1.5 text-xs font-bold text-[#0f2354] shadow-sm border border-blue-100 no-underline transition-colors"
            >
              <FiHome className="h-3.5 w-3.5 text-blue-600" />
              Beranda Publik
            </Link>
          </div>

          {/* Headline & Subtitle */}
          <div className="space-y-3 pt-1">
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#081a4b] leading-[1.12]">
              Selamat Datang
              <br />
              di <span className="text-blue-600">LacakIn</span>
            </h1>
            <p className="text-sm sm:text-lg font-medium text-slate-700 max-w-lg leading-relaxed">
              Kelola pengiriman dengan lebih mudah, cepat, dan efisien.
            </p>
          </div>

          {/* 4 Glassmorphic Feature Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl">
            {[
              { icon: FiZap, top: "Akses", bottom: "Cepat" },
              { icon: FiShield, top: "Aman dan", bottom: "Terpercaya" },
              { icon: FiBarChart2, top: "Real-Time", bottom: "Tracking" },
              { icon: FiHeadphones, top: "Dukungan", bottom: "24/7" },
            ].map((b) => {
              const Icon = b.icon;
              return (
                <div
                  key={b.top + b.bottom}
                  className="flex flex-col items-center justify-center rounded-2xl bg-white/75 backdrop-blur-md border border-white/90 px-3 py-3.5 text-center shadow-sm"
                >
                  <div className="mb-1.5 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-xs font-extrabold text-[#0b1f52] leading-tight">
                    {b.top}
                  </div>
                  <div className="text-xs font-extrabold text-[#0b1f52] leading-tight">
                    {b.bottom}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Operasional Showcase Visual */}
          <div className="relative pt-2 space-y-2.5">
            <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-2 backdrop-blur-md shadow-2xl w-full max-w-xl">
              <img
                src="/images/login-warehouse-hero.webp"
                alt="Operasional Gudang dan Armada LacakIn Jawa Timur"
                className="aspect-[3/2] w-full rounded-xl object-cover"
              />
            </div>
            <p className="text-sm font-extrabold italic text-sky-200">
              LacakIn: PastiIn Sampainya, TenangIn Hatinya.
            </p>
          </div>
        </div>

        {/* RIGHT FLOATING WHITE LOGIN CARD */}
        <div className="order-1 lg:order-2 w-full max-w-[460px] lg:w-[42%] rounded-[28px] bg-white shadow-2xl shadow-blue-950/25 border border-blue-100/80 overflow-hidden">
          {/* Card Body */}
          <div className="p-6 sm:p-8 space-y-5">
            {/* 3D Shield with Padlock Illustration */}
            <div className="text-center space-y-2">
              <div className="mx-auto flex h-24 w-28 items-center justify-center">
                <svg viewBox="0 0 140 110" className="h-24 w-28 drop-shadow-md" aria-hidden="true">
                  <defs>
                    <linearGradient id="shieldBlue" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#60a5fa" />
                      <stop offset="50%" stopColor="#2563eb" />
                      <stop offset="100%" stopColor="#1e3a8a" />
                    </linearGradient>
                  </defs>
                  {/* Orbital Ring */}
                  <ellipse
                    cx="70"
                    cy="58"
                    rx="58"
                    ry="20"
                    fill="none"
                    stroke="#93c5fd"
                    strokeWidth="2"
                    transform="rotate(-14 70 58)"
                  />
                  <circle cx="18" cy="70" r="3.5" fill="#60a5fa" />
                  <circle cx="122" cy="44" r="3" fill="#3b82f6" />

                  {/* Shield Body */}
                  <path
                    d="M70 10 L108 24 L108 54 C108 79 91 96 70 104 C49 96 32 79 32 54 L32 24 Z"
                    fill="url(#shieldBlue)"
                    stroke="#bfdbfe"
                    strokeWidth="2.5"
                  />
                  {/* White Padlock Inside Shield */}
                  <rect x="55" y="52" width="30" height="24" rx="5" fill="#ffffff" />
                  <path
                    d="M61 52 L61 43 C61 37.5 65 34 70 34 C75 34 79 37.5 79 43 L79 52"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                  />
                  <circle cx="70" cy="62" r="3" fill="#1d4ed8" />
                  <rect x="68.5" y="63" width="3" height="6" rx="1.5" fill="#1d4ed8" />
                </svg>
              </div>

              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                Masuk Akun LacakIn
              </h2>
              <p className="text-xs sm:text-[13px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                Masuk untuk mengakses dashboard operasional dan manajemen pengiriman.
              </p>
            </div>

            {/* Login Form (autofill disabled so inputs stay empty by default) */}
            <form onSubmit={handleSubmit} autoComplete="off" className="space-y-3.5">
              {/* Email / Username */}
              <div className="relative flex items-center">
                <div className="pointer-events-none absolute left-3.5 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <FiMail className="h-4 w-4" />
                </div>
                <input
                  id="login-ident"
                  name="lacakin_ident"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Username, Kode Pegawai, atau NIK"
                  required
                  autoComplete="off"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-14 pr-4 text-base sm:text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Password */}
              <div className="relative flex items-center">
                <div className="pointer-events-none absolute left-3.5 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <FiLock className="h-4 w-4" />
                </div>
                <input
                  id="login-pass"
                  name="lacakin_secret"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Kata sandi"
                  required
                  autoComplete="new-password"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-14 pr-12 text-base sm:text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? "Sembunyikan password" : "Tampilkan password"}
                  className="absolute right-3 inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                >
                  {showPass ? <FiEye className="h-4 w-4" /> : <FiEyeOff className="h-4 w-4" />}
                </button>
              </div>

              {/* Remember Me & Lupa Password */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="inline-flex items-center gap-2 text-xs sm:text-[13px] font-semibold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Ingat Saya</span>
                </label>

                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs sm:text-[13px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  Lupa Password?
                </button>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-700"
                >
                  {error}
                </div>
              )}

              {infoMessage && (
                <div
                  role="status"
                  className="rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-xs font-semibold text-blue-800 leading-relaxed"
                >
                  {infoMessage}
                </div>
              )}

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] hover:from-[#1d4ed8] hover:to-[#1e40af] px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-blue-600/25 transition-all cursor-pointer disabled:opacity-60"
              >
                <FiLogIn className="h-4 w-4" />
                <span>{loading ? "Memverifikasi..." : "Login Sekarang"}</span>
              </button>
            </form>

            {/* Official Staff Warning Note */}
            <div className="flex items-start gap-3 rounded-2xl bg-slate-50 border border-slate-200/80 p-3.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 mt-0.5">
                <FiInfo className="h-4 w-4" />
              </div>
              <div className="text-xs leading-relaxed">
                <div className="font-extrabold text-slate-800">
                  Hanya untuk pegawai resmi LacakIn
                </div>
                <div className="text-slate-500">
                  Pastikan Anda menggunakan akun yang terdaftar.{" "}
                  <Link
                    to="/register"
                    className="font-bold text-blue-600 hover:text-blue-700 no-underline"
                  >
                    Daftar Kurir Baru
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Lupa Password */}
      {forgotOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-xs"
          onClick={() => !fpLoading && setForgotOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Atur Ulang Kata Sandi</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verifikasi username/kode pegawai dan NIK atau email terdaftar Anda.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setForgotOpen(false)}
                disabled={fpLoading}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleResetSubmit} autoComplete="off" className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Username atau Kode Pegawai <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={fpIdent}
                  onChange={(e) => setFpIdent(e.target.value)}
                  placeholder="Contoh: kurir_mtr1 atau KUR-0002"
                  required
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Verifikasi NIK atau Email Terdaftar <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={fpVerif}
                  onChange={(e) => setFpVerif(e.target.value)}
                  placeholder="Masukkan 16 digit NIK atau email akun"
                  required
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Kata Sandi Baru <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={fpShowPass ? "text" : "password"}
                    value={fpNewPass}
                    onChange={(e) => setFpNewPass(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-3 pr-10 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setFpShowPass((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {fpShowPass ? <FiEye className="h-4 w-4" /> : <FiEyeOff className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Konfirmasi Kata Sandi Baru <span className="text-rose-500">*</span>
                </label>
                <input
                  type={fpShowPass ? "text" : "password"}
                  value={fpConfirmPass}
                  onChange={(e) => setFpConfirmPass(e.target.value)}
                  placeholder="Ulangi kata sandi baru"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
                />
              </div>

              {fpError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                  {fpError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setForgotOpen(false)}
                  disabled={fpLoading}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={fpLoading}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-blue-700 cursor-pointer disabled:opacity-60"
                >
                  {fpLoading ? "Menyimpan..." : "Simpan Kata Sandi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
