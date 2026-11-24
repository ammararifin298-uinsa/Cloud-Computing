import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiBarChart2,
  FiBell,
  FiCheckCircle,
  FiChevronRight,
  FiDatabase,
  FiHome,
  FiLock,
  FiMapPin,
  FiMonitor,
  FiRefreshCw,
  FiRotateCcw,
  FiServer,
  FiSettings,
  FiShield,
  FiSliders,
  FiTruck,
  FiUser,
  FiUsers,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext.jsx";
import { ROLE_LABEL, apiFetch } from "../lib/api.js";

const DEFAULT_PREFS = {
  autoRefreshDashboard: true,
  refreshIntervalSec: "30",
  soundNotification: false,
  compactDensity: false,
  defaultExportFormat: "pdf_server",
  // Role-specific operational preferences
  autoClaimPickup: true,
  cameraAutoStart: false,
  compressProofPhoto: true,
  showCodReminder: true,
  defaultChannelLoket: true,
  autoPrintResiAfterOrder: false,
  defaultServiceCode: "REG",
  slaWarningHighlight: true,
  courierReviewAlert: true,
  showUuPdpWarning: true,
  defaultReportPeriod: "7d",
  requireDeleteConfirm: true,
};

export default function PengaturanPage() {
  const { user, showToast } = useAuth();
  const [settings, setSettings] = useState([]);
  const [publicStatus, setPublicStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [prefs, setPrefs] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("lacakin_ui_prefs") || "null");
      return saved ? { ...DEFAULT_PREFS, ...saved } : DEFAULT_PREFS;
    } catch {
      return DEFAULT_PREFS;
    }
  });

  const role = user?.role || "operator";
  const isSuperadmin = role === "superadmin";
  const isAdminLevel = role === "superadmin" || role === "admin";
  const isPersistentSession = Boolean(localStorage.getItem("lacakin_token"));

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const pubPromise = apiFetch("/api/settings/public").catch(() => null);
      if (isSuperadmin) {
        const [data, pub] = await Promise.all([apiFetch("/api/settings"), pubPromise]);
        setSettings(Array.isArray(data) ? data : []);
        setPublicStatus(pub);
      } else {
        const pub = await pubPromise;
        setPublicStatus(pub);
      }
    } catch (e) {
      showToast(e.message || "Gagal memuat pengaturan sistem", "error");
    } finally {
      setLoading(false);
    }
  }, [isSuperadmin, showToast]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const toggleFeature = async (key, enabled) => {
    try {
      await apiFetch(`/api/settings/${key}`, { method: "PATCH", body: { enabled } });
      showToast("Pengaturan fitur sistem diperbarui", "success");
      loadSettings();
    } catch (e) {
      showToast(e.message || "Gagal mengubah pengaturan", "error");
    }
  };

  const updatePref = (key, value) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    localStorage.setItem("lacakin_ui_prefs", JSON.stringify(next));
    showToast("Pengaturan tersimpan", "success");
  };

  const resetPrefs = () => {
    setPrefs(DEFAULT_PREFS);
    localStorage.setItem("lacakin_ui_prefs", JSON.stringify(DEFAULT_PREFS));
    showToast("Seluruh preferensi dikembalikan ke pengaturan awal", "success");
  };

  const rolePrefsList =
    role === "kurir"
      ? [
          {
            key: "autoClaimPickup",
            title: "Klaim Otomatis Paket BOOKED",
            desc: "Otomatis menugaskan paket online ke akun Anda saat checkpoint pertama diinput.",
          },
          {
            key: "cameraAutoStart",
            title: "Kamera Scan Aktif Otomatis",
            desc: "Langsung membuka kamera pemindai barcode saat masuk halaman Input Checkpoint.",
          },
          {
            key: "compressProofPhoto",
            title: "Kompresi Foto Bukti Lapangan",
            desc: "Optimalkan ukuran foto sebelum diunggah ke server agar lebih cepat di jaringan seluler.",
          },
          {
            key: "showCodReminder",
            title: "Pengingat Setoran COD Tertunda",
            desc: "Tampilkan pengingat nominal COD yang belum disetor pada halaman Laporan Kurir.",
          },
        ]
      : role === "operator"
      ? [
          {
            key: "defaultChannelLoket",
            title: "Kanal Bawaan Order: Loket",
            desc: "Otomatis memilih kanal Loket saat membuka form Buat Pesanan baru.",
          },
          {
            key: "autoPrintResiAfterOrder",
            title: "Tawarkan Cetak Resi Otomatis",
            desc: "Siapkan tombol cetak resi thermal segera setelah nomor resi LCK diterbitkan.",
          },
          {
            key: "compressProofPhoto",
            title: "Optimasi Foto Bukti Loket",
            desc: "Perkecil ukuran foto serah terima paket sebelum disimpan ke MinIO.",
          },
        ]
      : role === "supervisor"
      ? [
          {
            key: "slaWarningHighlight",
            title: "Sorot Paket Gagal Kirim dan Retur",
            desc: "Beri penanda khusus pada paket bermasalah atau melewati SLA di Daftar Pengiriman.",
          },
          {
            key: "courierReviewAlert",
            title: "Notifikasi Pengajuan Kurir Baru",
            desc: "Tampilkan indikator pada menu Manajemen Kurir saat ada berkas menunggu verifikasi.",
          },
          {
            key: "autoRefreshDashboard",
            title: "Pemantauan SLA Hub Real-Time",
            desc: "Perbarui metrik SLA kurir dan tren 7 hari secara berkala di Dashboard.",
          },
        ]
      : [
          {
            key: "showUuPdpWarning",
            title: "Pelindung Privasi Data Sensitif UU PDP",
            desc: "Tampilkan banner kepatuhan UU PDP saat membuka NIK, NPWP, BPJS, dan rekening pegawai.",
          },
          {
            key: "requireDeleteConfirm",
            title: "Konfirmasi Penghapusan Resi",
            desc: "Wajibkan dialog konfirmasi sebelum melakukan soft delete data pengiriman.",
          },
          {
            key: "slaWarningHighlight",
            title: "Sorot Hub dan Paket di Bawah Target SLA",
            desc: "Tandai cabang atau pengiriman yang membutuhkan perhatian operasional.",
          },
        ];

  return (
    <div className="space-y-5 pb-8">
      {/* BREADCRUMB & HEADER */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          <Link to="/" className="hover:text-blue-600 no-underline text-slate-500">
            <FiHome className="h-3.5 w-3.5" />
          </Link>
          <FiChevronRight className="h-3.5 w-3.5 text-slate-400" />
          <span>Sistem</span>
          <FiChevronRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="font-bold text-slate-800">Pengaturan</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 shadow-xs">
              <FiSettings className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
                  Pengaturan Sistem
                </h1>
                <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[11px] font-extrabold text-blue-700">
                  Peran: {ROLE_LABEL[role] || role}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500">
                Kelola pengaturan operasional peran {ROLE_LABEL[role] || role}, tampilan, pencetakan, dan keamanan akun.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetPrefs}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 text-xs font-bold text-slate-700 cursor-pointer"
            >
              <FiRotateCcw className="h-3.5 w-3.5 text-slate-500" />
              <span>Reset Awal</span>
            </button>
            <button
              type="button"
              onClick={loadSettings}
              disabled={loading}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 text-xs font-bold text-slate-700 cursor-pointer"
            >
              <FiRefreshCw className={`h-3.5 w-3.5 text-blue-600 ${loading ? "animate-spin" : ""}`} />
              <span>Muat Ulang</span>
            </button>
          </div>
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT 7 COLS */}
        <div className="lg:col-span-7 space-y-5">
          {isSuperadmin && (
            <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <FiServer className="h-5 w-5 text-blue-600" />
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">
                      Kontrol Fitur Operasional Global
                    </h2>
                    <p className="text-xs text-slate-500">
                      Aktifkan atau nonaktifkan fitur layanan LacakIn secara terpusat di database.
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10.5px] font-extrabold text-amber-700">
                  Superadmin
                </span>
              </div>

              {settings.length > 0 ? (
                <div className="space-y-3">
                  {settings.map((s) => (
                    <label
                      key={s.key}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 cursor-pointer hover:bg-slate-50"
                    >
                      <div>
                        <div className="text-xs sm:text-sm font-extrabold text-slate-900">
                          {s.label}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">{s.description}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={s.enabled}
                        onChange={(e) => toggleFeature(s.key, e.target.checked)}
                        className="h-5 w-5 rounded border-slate-300 text-blue-600 cursor-pointer shrink-0"
                      />
                    </label>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
                  {loading ? "Memuat daftar pengaturan..." : "Tidak ada pengaturan fitur tersedia."}
                </div>
              )}
            </div>
          )}

          {/* CARD 2: PENGATURAN OPERASIONAL SESUAI PERAN */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <FiSliders className="h-5 w-5 text-blue-600" />
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    Pengaturan Operasional {ROLE_LABEL[role] || role}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Opsi kerja harian yang disesuaikan dengan hak akses peran Anda.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {rolePrefsList.map((item) => (
                <label
                  key={item.key}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3.5 cursor-pointer hover:bg-slate-50"
                >
                  <div>
                    <div className="text-xs font-extrabold text-slate-900">{item.title}</div>
                    <div className="text-[11.5px] text-slate-500 mt-0.5">{item.desc}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(prefs[item.key])}
                    onChange={(e) => updatePref(item.key, e.target.checked)}
                    className="h-5 w-5 rounded border-slate-300 text-blue-600 cursor-pointer shrink-0"
                  />
                </label>
              ))}

              {role === "operator" && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3.5">
                  <div>
                    <div className="text-xs font-extrabold text-slate-900">Layanan Bawaan Order Baru</div>
                    <div className="text-[11.5px] text-slate-500 mt-0.5">Jenis layanan yang terpilih awal saat membuka halaman Buat Pesanan.</div>
                  </div>
                  <select
                    value={prefs.defaultServiceCode}
                    onChange={(e) => updatePref("defaultServiceCode", e.target.value)}
                    className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none shrink-0"
                  >
                    <option value="REG">REG (Reguler)</option>
                    <option value="EXP">EXP (Ekspres)</option>
                    <option value="SDY">SDY (Same Day)</option>
                    <option value="KRG">KRG (Kargo)</option>
                  </select>
                </div>
              )}

              {isAdminLevel && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3.5">
                  <div>
                    <div className="text-xs font-extrabold text-slate-900">Periode Bawaan Halaman Laporan</div>
                    <div className="text-[11.5px] text-slate-500 mt-0.5">Rentang waktu awal yang dimuat otomatis saat membuka menu Laporan.</div>
                  </div>
                  <select
                    value={prefs.defaultReportPeriod}
                    onChange={(e) => updatePref("defaultReportPeriod", e.target.value)}
                    className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none shrink-0"
                  >
                    <option value="7d">7 Hari Terakhir</option>
                    <option value="30d">30 Hari Terakhir</option>
                    <option value="all">Semua Data</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* CARD 3: PREFERENSI TAMPILAN, CETAK, DAN NOTIFIKASI */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5">
              <FiMonitor className="h-5 w-5 text-blue-600" />
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  Preferensi Tampilan, Cetak, dan Notifikasi
                </h2>
                <p className="text-xs text-slate-500">
                  Pengaturan personal yang tersimpan di perangkat Anda.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                {
                  key: "autoRefreshDashboard",
                  title: "Pembaruan Dashboard Otomatis",
                  desc: "Muat ulang statistik pengiriman dan aktivitas terbaru secara berkala.",
                },
                {
                  key: "soundNotification",
                  title: "Notifikasi Aktivitas Baru",
                  desc: "Tampilkan indikator saat terdapat resi baru atau pembaruan checkpoint.",
                },
                {
                  key: "compactDensity",
                  title: "Mode Tabel Ringkas",
                  desc: "Tampilkan lebih banyak baris data pada layar Daftar Pengiriman.",
                },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3.5 cursor-pointer hover:bg-slate-50"
                >
                  <div>
                    <div className="text-xs font-extrabold text-slate-900">{item.title}</div>
                    <div className="text-[11.5px] text-slate-500 mt-0.5">{item.desc}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(prefs[item.key])}
                    onChange={(e) => updatePref(item.key, e.target.checked)}
                    className="h-5 w-5 rounded border-slate-300 text-blue-600 cursor-pointer shrink-0"
                  />
                </label>
              ))}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3.5 space-y-1.5">
                  <div className="text-xs font-extrabold text-slate-900">Interval Pembaruan Data</div>
                  <select
                    value={prefs.refreshIntervalSec}
                    onChange={(e) => updatePref("refreshIntervalSec", e.target.value)}
                    className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="15">Setiap 15 detik</option>
                    <option value="30">Setiap 30 detik</option>
                    <option value="60">Setiap 1 menit</option>
                    <option value="0">Manual saja</option>
                  </select>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3.5 space-y-1.5">
                  <div className="text-xs font-extrabold text-slate-900">Format Laporan Bawaan</div>
                  <select
                    value={prefs.defaultExportFormat}
                    onChange={(e) => updatePref("defaultExportFormat", e.target.value)}
                    className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="pdf_server">PDF Resmi (Unduh Server)</option>
                    <option value="browser_print">Cetak Langsung Browser</option>
                    <option value="csv_utf8">CSV Spreadsheet (UTF-8)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT 5 COLS */}
        <aside className="lg:col-span-5 space-y-4 lg:sticky lg:top-20">
          {/* Card 1: Pintasan Peran & Administrasi */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
              <FiShield className="h-4 w-4 text-blue-600" />
              <span>Pintasan Cepat {ROLE_LABEL[role] || role}</span>
            </div>

            <div className="space-y-2 text-xs">
              <Link
                to="/laporan"
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-blue-50 p-3 text-slate-800 font-bold no-underline transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  <FiBarChart2 className="h-4 w-4 text-blue-600" />
                  <span>Buka Laporan Rekapitulasi</span>
                </span>
                <FiChevronRight className="h-4 w-4 text-slate-400" />
              </Link>

              {(role === "kurir" || role === "operator" || isAdminLevel) && (
                <Link
                  to="/checkpoint"
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-blue-50 p-3 text-slate-800 font-bold no-underline transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    <FiMapPin className="h-4 w-4 text-blue-600" />
                    <span>Input Checkpoint dan Foto Bukti</span>
                  </span>
                  <FiChevronRight className="h-4 w-4 text-slate-400" />
                </Link>
              )}

              {(role === "supervisor" || isAdminLevel) && (
                <Link
                  to="/pengajuan-kurir"
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-blue-50 p-3 text-slate-800 font-bold no-underline transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    <FiTruck className="h-4 w-4 text-blue-600" />
                    <span>Verifikasi dan Manajemen Kurir</span>
                  </span>
                  <FiChevronRight className="h-4 w-4 text-slate-400" />
                </Link>
              )}

              {isAdminLevel && (
                <Link
                  to="/pegawai"
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-blue-50 p-3 text-slate-800 font-bold no-underline transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    <FiUsers className="h-4 w-4 text-blue-600" />
                    <span>Manajemen Pegawai dan UU PDP</span>
                  </span>
                  <FiChevronRight className="h-4 w-4 text-slate-400" />
                </Link>
              )}

              <Link
                to="/profil"
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-blue-50 p-3 text-slate-800 font-bold no-underline transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  <FiLock className="h-4 w-4 text-blue-600" />
                  <span>Ubah Kata Sandi dan Kartu Pegawai</span>
                </span>
                <FiChevronRight className="h-4 w-4 text-slate-400" />
              </Link>

              <Link
                to="/notifikasi"
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-blue-50 p-3 text-slate-800 font-bold no-underline transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  <FiBell className="h-4 w-4 text-blue-600" />
                  <span>Buka Pusat Notifikasi</span>
                </span>
                <FiChevronRight className="h-4 w-4 text-slate-400" />
              </Link>

              {isSuperadmin && (
                <Link
                  to="/backup"
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-blue-50 p-3 text-slate-800 font-bold no-underline transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    <FiDatabase className="h-4 w-4 text-blue-600" />
                    <span>Cadangan Data dan Pemulihan</span>
                  </span>
                  <FiChevronRight className="h-4 w-4 text-slate-400" />
                </Link>
              )}
            </div>
          </div>

          {/* Card 2: Informasi Sesi & Keamanan Akun */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
              <FiUser className="h-4 w-4 text-blue-600" />
              <span>Informasi Sesi Aktif</span>
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-2 flex items-center justify-between gap-2">
                <span className="text-slate-500">Akun Masuk</span>
                <span className="font-extrabold text-slate-900">{user?.full_name || "-"}</span>
              </div>
              <div className="py-2 flex items-center justify-between gap-2">
                <span className="text-slate-500">Kode Pegawai</span>
                <span className="mono font-bold text-blue-700">{user?.employee_code || "-"}</span>
              </div>
              <div className="py-2 flex items-center justify-between gap-2">
                <span className="text-slate-500">Peran Akses</span>
                <span className="font-bold text-slate-800">{ROLE_LABEL[role] || role}</span>
              </div>
              <div className="py-2 flex items-center justify-between gap-2">
                <span className="text-slate-500">Mode Sesi (Ingat Saya)</span>
                <span className="font-bold text-emerald-700">
                  {isPersistentSession ? "Permanen (localStorage)" : "Sementara (sessionStorage)"}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Status Layanan LacakIn v2 */}
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-5 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-800">
              <FiCheckCircle className="h-4 w-4 text-emerald-600" />
              <span>Status Layanan LacakIn v2</span>
            </div>
            <p className="text-xs text-emerald-700 leading-relaxed">
              Seluruh layanan pelacakan, kalkulasi tarif Jawa Timur, dan pencadangan basis data berjalan normal.
            </p>
            {publicStatus && (
              <div className="pt-1 flex flex-wrap gap-1.5 text-[10.5px] font-bold">
                <span className={`rounded-full px-2.5 py-0.5 border ${publicStatus.public_tracking !== false ? "bg-white border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700"}`}>
                  Lacak Publik: {publicStatus.public_tracking !== false ? "Aktif" : "Nonaktif"}
                </span>
                <span className={`rounded-full px-2.5 py-0.5 border ${publicStatus.self_register !== false ? "bg-white border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700"}`}>
                  Daftar Kurir: {publicStatus.self_register !== false ? "Aktif" : "Nonaktif"}
                </span>
                <span className={`rounded-full px-2.5 py-0.5 border ${publicStatus.checkpoint_write !== false ? "bg-white border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700"}`}>
                  Checkpoint: {publicStatus.checkpoint_write !== false ? "Aktif" : "Nonaktif"}
                </span>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
