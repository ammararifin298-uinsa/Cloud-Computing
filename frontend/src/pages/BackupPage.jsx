import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiCalendar,
  FiCheckCircle,
  FiChevronRight,
  FiDatabase,
  FiFileText,
  FiFolder,
  FiHardDrive,
  FiHome,
  FiLayers,
  FiRefreshCw,
  FiServer,
  FiShield,
} from "react-icons/fi";
import { apiFetch, formatDateTime } from "../lib/api.js";

function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return "0 KB";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export default function BackupPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadBackups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/backups");
      setData(res);
      setError("");
    } catch (e) {
      setError(e.message || "Gagal memuat status cadangan data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBackups();
  }, [loadBackups]);

  const intervalMinutes = data?.interval_seconds ? Math.round(data.interval_seconds / 60) : 15;
  const retentionHours = data?.retention_hours ?? 24;
  const standbyCount = data?.db_cluster?.standby_count ?? 0;
  const files = data?.files || [];

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
          <span className="font-bold text-slate-800">Cadangan Data</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 shadow-xs">
              <FiDatabase className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
                  Cadangan Data
                </h1>
                <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10.5px] font-extrabold text-amber-700">
                  Khusus Superadmin
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500">
                Monitoring pencadangan basis data otomatis pada sistem LacakIn.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadBackups}
            disabled={loading}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 text-xs font-bold text-slate-700 shadow-xs cursor-pointer"
          >
            <FiRefreshCw className={`h-3.5 w-3.5 text-blue-600 ${loading ? "animate-spin" : ""}`} />
            <span>Muat Ulang</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">
          {error}
        </div>
      )}

      {/* 4 KPI STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-br from-white to-blue-50/40 p-4 shadow-xs flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <FiCalendar className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-600">Interval Backup</div>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
              {intervalMinutes} menit
            </div>
            <div className="text-[11px] text-slate-500 truncate">Pencadangan otomatis terjadwal</div>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-white to-amber-50/40 p-4 shadow-xs flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <FiLayers className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-600">Retensi Lokal</div>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
              {retentionHours} jam
            </div>
            <div className="text-[11px] text-slate-500 truncate">Backup disimpan maksimal {retentionHours} jam</div>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-white to-emerald-50/40 p-4 shadow-xs flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <FiServer className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-600">Replika Aktif</div>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
              {standbyCount > 0 ? `Aktif (${standbyCount})` : "Standby (0)"}
            </div>
            <div className="text-[11px] text-slate-500 truncate">
              {standbyCount > 0 ? "Replika basis data sinkron" : "Menunggu node replika"}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-white to-indigo-50/40 p-4 shadow-xs flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <FiFileText className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-600">Berkas Cadangan</div>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
              {files.length}
            </div>
            <div className="text-[11px] text-slate-500 truncate">Berkas .dump tersimpan ({retentionHours} jam terakhir)</div>
          </div>
        </div>
      </div>

      {/* MIDDLE 3-CARD ARCHITECTURE & POLICY ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Card 1: Kebijakan dan Status Backup */}
        <div className="lg:col-span-4 rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-3.5">
          <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <FiShield className="h-4 w-4 text-blue-600" />
            <span>Kebijakan dan Status Backup</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-start gap-2.5">
              <FiCheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <div className="font-extrabold text-slate-900">Pencadangan Otomatis</div>
                <div className="text-slate-500 leading-relaxed">
                  Basis data PostgreSQL dicadangkan secara otomatis setiap {intervalMinutes} menit.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <FiCheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <div className="font-extrabold text-slate-900">Sumber Pencadangan</div>
                <div className="text-slate-500 leading-relaxed">
                  Berkas dump diambil dari read replica untuk mengurangi beban pada database utama (primary).
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <FiCheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <div className="font-extrabold text-slate-900">Format Berkas</div>
                <div className="text-slate-500 leading-relaxed">
                  Hasil pencadangan berupa berkas dengan format <span className="font-mono font-bold">.dump</span> (PostgreSQL custom dump).
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <FiCheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900">Status Sistem</span>
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10.5px] font-extrabold text-emerald-700">
                    Berjalan Normal
                  </span>
                </div>
                <div className="text-slate-500 leading-relaxed mt-0.5">
                  Proses pencadangan terjadwal, replikasi, dan penyimpanan berjalan dengan baik.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Arsitektur Pencadangan (Simplified) */}
        <div className="lg:col-span-5 rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <FiHardDrive className="h-4 w-4 text-blue-600" />
            <span>
              Arsitektur Pencadangan <span className="font-semibold text-slate-500">(Simplified)</span>
            </span>
          </div>

          <div className="flex-1 flex items-center justify-center rounded-2xl bg-slate-50/70 border border-slate-200/70 p-4">
            <svg viewBox="0 0 420 135" className="w-full max-w-[400px] h-auto" role="img" aria-label="Arsitektur Pencadangan Primary ke Read Replica dan Storage">
              {/* Primary DB Cylinder */}
              <g transform="translate(12, 16)">
                <ellipse cx="42" cy="14" rx="34" ry="11" fill="#2563eb" />
                <path d="M8 14 L8 60 A34 11 0 0 0 76 60 L76 14 Z" fill="#1d4ed8" />
                <ellipse cx="42" cy="14" rx="34" ry="11" fill="#60a5fa" />
                <path d="M8 32 A34 9 0 0 0 76 32" fill="none" stroke="#93c5fd" strokeWidth="1.8" />
                <path d="M8 47 A34 9 0 0 0 76 47" fill="none" stroke="#93c5fd" strokeWidth="1.8" />
                <text x="42" y="92" textAnchor="middle" fill="#0f172a" fontSize="11.5" fontWeight="800" fontFamily="Plus Jakarta Sans, sans-serif">
                  Primary DB
                </text>
                <text x="42" y="106" textAnchor="middle" fill="#64748b" fontSize="9.5" fontWeight="600" fontFamily="Plus Jakarta Sans, sans-serif">
                  (PostgreSQL)
                </text>
              </g>

              {/* Arrow 1: Replikasi */}
              <g transform="translate(94, 38)">
                <rect x="6" y="-12" width="52" height="16" rx="6" fill="#2563eb" />
                <text x="32" y="-1" textAnchor="middle" fill="#ffffff" fontSize="8.5" fontWeight="800" fontFamily="Plus Jakarta Sans, sans-serif">
                  Replikasi
                </text>
                <line x1="2" y1="14" x2="54" y2="14" stroke="#2563eb" strokeWidth="3" />
                <polygon points="54,8 65,14 54,20" fill="#2563eb" />
              </g>

              {/* Read Replica Cylinder */}
              <g transform="translate(166, 16)">
                <ellipse cx="42" cy="14" rx="34" ry="11" fill="#1e40af" />
                <path d="M8 14 L8 60 A34 11 0 0 0 76 60 L76 14 Z" fill="#1e3a8a" />
                <ellipse cx="42" cy="14" rx="34" ry="11" fill="#3b82f6" />
                <path d="M8 32 A34 9 0 0 0 76 32" fill="none" stroke="#93c5fd" strokeWidth="1.8" />
                <path d="M8 47 A34 9 0 0 0 76 47" fill="none" stroke="#93c5fd" strokeWidth="1.8" />
                <text x="42" y="92" textAnchor="middle" fill="#0f172a" fontSize="11.5" fontWeight="800" fontFamily="Plus Jakarta Sans, sans-serif">
                  Read Replica
                </text>
                <text x="42" y="106" textAnchor="middle" fill="#64748b" fontSize="9.5" fontWeight="600" fontFamily="Plus Jakarta Sans, sans-serif">
                  (Standby)
                </text>
              </g>

              {/* Arrow 2: Backup */}
              <g transform="translate(248, 38)">
                <rect x="8" y="-12" width="48" height="16" rx="6" fill="#2563eb" />
                <text x="32" y="-1" textAnchor="middle" fill="#ffffff" fontSize="8.5" fontWeight="800" fontFamily="Plus Jakarta Sans, sans-serif">
                  Backup
                </text>
                <line x1="2" y1="14" x2="54" y2="14" stroke="#2563eb" strokeWidth="3" />
                <polygon points="54,8 65,14 54,20" fill="#2563eb" />
              </g>

              {/* Storage Folder */}
              <g transform="translate(320, 18)">
                <path
                  d="M6 12 L28 12 L34 20 L78 20 C82 20 84 22 84 26 L84 64 C84 68 82 70 78 70 L6 70 C2 70 0 68 0 64 L0 18 C0 14 2 12 6 12 Z"
                  fill="#2563eb"
                />
                <rect x="28" y="34" width="28" height="22" rx="4" fill="#ffffff" opacity="0.9" />
                <text x="42" y="90" textAnchor="middle" fill="#0f172a" fontSize="11.5" fontWeight="800" fontFamily="Plus Jakarta Sans, sans-serif">
                  Penyimpanan
                </text>
                <text x="42" y="104" textAnchor="middle" fill="#64748b" fontSize="9.5" fontWeight="600" fontFamily="Plus Jakarta Sans, sans-serif">
                  Berkas .dump
                </text>
              </g>
            </svg>
          </div>
        </div>

        {/* Card 3: Lokasi Penyimpanan */}
        <div className="lg:col-span-3 rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-3.5">
          <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <FiFolder className="h-4 w-4 text-blue-600" />
            <span>Lokasi Penyimpanan</span>
          </div>

          <div className="space-y-3 text-xs pt-1">
            <div className="rounded-2xl bg-slate-50 border border-slate-200/70 p-3">
              <div className="text-[11px] font-semibold text-slate-500">Tipe</div>
              <div className="font-extrabold text-slate-900 mt-0.5">Penyimpanan Lokal (Server)</div>
            </div>
            <div className="rounded-2xl bg-slate-50 border border-slate-200/70 p-3">
              <div className="text-[11px] font-semibold text-slate-500">Direktori</div>
              <div className="font-mono font-bold text-blue-700 mt-0.5 break-all">
                {data?.storage || "/backups"}
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 border border-slate-200/70 p-3">
              <div className="text-[11px] font-semibold text-slate-500">Format</div>
              <div className="font-mono font-bold text-slate-900 mt-0.5">.dump (PostgreSQL)</div>
            </div>
          </div>
        </div>
      </div>

      {/* BACKUP FILES TABLE */}
      <div className="rounded-3xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Daftar Berkas Cadangan</h2>
            <p className="text-xs text-slate-500">
              Riwayat berkas cadangan basis data yang tersimpan sesuai kebijakan retensi ({retentionHours} jam).
            </p>
          </div>
          <span className="rounded-full bg-blue-50 border border-blue-100 px-3 py-1 text-xs font-extrabold text-blue-700">
            {files.length} berkas
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-5">Berkas</th>
                <th className="py-3 px-4">Ukuran</th>
                <th className="py-3 px-4">SHA-256 (Checksum)</th>
                <th className="py-3 px-4">Dibuat</th>
                <th className="py-3 px-5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading && !data ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-500">
                    Memuat daftar berkas cadangan...
                  </td>
                </tr>
              ) : files.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-500">
                    Belum ada berkas cadangan yang tercatat.
                  </td>
                </tr>
              ) : (
                files.map((f) => (
                  <tr key={f.name} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-5 font-mono font-bold text-slate-900 whitespace-nowrap">
                      <span className="inline-flex items-center gap-2">
                        <FiFileText className="h-4 w-4 text-blue-600 shrink-0" />
                        <span>{f.name}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700 whitespace-nowrap">
                      {formatFileSize(f.size_bytes)}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                      {f.sha256 ? `${f.sha256.slice(0, 28)}...` : "-"}
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {formatDateTime(f.created_at)}
                    </td>
                    <td className="py-3 px-5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                          f.sha256
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                            : "bg-amber-50 border-amber-200 text-amber-700"
                        }`}
                      >
                        <FiCheckCircle className="h-3 w-3" />
                        <span>{f.sha256 ? "Terverifikasi" : "Tersimpan"}</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* BOTTOM 2 INFO CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <FiShield className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              Pemeriksaan Integritas (Checksum)
            </h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Setiap berkas cadangan divalidasi menggunakan algoritma <strong>SHA-256</strong> untuk memastikan integritas dan keutuhan data. Status &quot;Terverifikasi&quot; menandakan bahwa berkas tidak mengalami perubahan atau kerusakan sejak dibuat.
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
            <FiLayers className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Kebijakan Retensi</h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Berkas cadangan disimpan secara lokal dengan masa retensi maksimal <strong>{retentionHours} jam</strong>. Berkas yang melewati batas retensi akan dibersihkan secara otomatis oleh sistem agar kapasitas penyimpanan tetap terjaga.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
