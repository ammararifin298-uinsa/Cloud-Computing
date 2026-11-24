import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EastJavaMap } from "@/components/shared/EastJavaMap";
import { motion } from "motion/react";
import {
  FiAlertCircle,
  FiArrowRight,
  FiCalendar,
  FiCheckCircle,
  FiMap,
  FiMapPin,
  FiPackage,
  FiPieChart,
  FiPlus,
  FiTrendingUp,
  FiTruck,
  FiZap,
} from "react-icons/fi";
import StatusBadge from "../components/StatusBadge.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { apiFetch, formatDateTime, hasRole, STATUS_LABEL } from "../lib/api.js";

function DeliveryVanIllustration() {
  return (
    <svg viewBox="0 0 260 130" className="w-[210px] sm:w-[245px] h-auto shrink-0 drop-shadow-lg" aria-hidden="true">
      {/* Ground shadow */}
      <ellipse cx="132" cy="116" rx="108" ry="8" fill="rgba(7,24,66,0.35)" />
      {/* Pin */}
      <g transform="translate(205, 8)">
        <path d="M16 0C7.2 0 0 7.2 0 16c0 11 16 26 16 26s16-15 16-26C32 7.2 24.8 0 16 0z" fill="#ffffff" />
        <circle cx="16" cy="15" r="6" fill="#2563eb" />
      </g>
      {/* Van Cargo Body */}
      <rect x="66" y="34" width="112" height="64" rx="10" fill="#f8fafc" />
      <rect x="74" y="42" width="96" height="44" rx="6" fill="#eaf3fe" />
      <text x="122" y="69" textAnchor="middle" fill="#0b72d9" fontWeight="800" fontSize="15" fontFamily="Plus Jakarta Sans, sans-serif">
        LacakIn
      </text>
      {/* Van Cab */}
      <path d="M68 48 L36 48 Q26 48 22 60 L14 82 Q12 88 18 96 L68 96 Z" fill="#e2e8f0" />
      <path d="M62 54 L40 54 Q33 54 30 62 L24 76 L62 76 Z" fill="#1e3a8a" />
      <rect x="16" y="83" width="8" height="5" rx="2" fill="#facc15" />
      {/* Wheels */}
      <circle cx="46" cy="99" r="14" fill="#1e293b" />
      <circle cx="46" cy="99" r="6" fill="#cbd5e1" />
      <circle cx="148" cy="99" r="14" fill="#1e293b" />
      <circle cx="148" cy="99" r="6" fill="#cbd5e1" />
      {/* Cardboard Boxes */}
      <g transform="translate(174, 78)">
        <rect x="0" y="10" width="28" height="24" rx="3" fill="#d99a5b" stroke="#b5783d" strokeWidth="1.5" />
        <line x1="14" y1="10" x2="14" y2="34" stroke="#b5783d" strokeWidth="1.5" />
        <rect x="24" y="2" width="30" height="32" rx="3" fill="#e5ac70" stroke="#b5783d" strokeWidth="1.5" />
        <line x1="39" y1="2" x2="39" y2="34" stroke="#b5783d" strokeWidth="1.5" />
      </g>
    </svg>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [shipments, setShipments] = useState([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [dashRes, shipRes] = await Promise.all([
        apiFetch("/api/dashboard"),
        apiFetch("/api/shipments?limit=10"),
      ]);
      setData(dashRes);
      setShipments(shipRes.items || []);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const stats = useMemo(() => {
    const map = {};
    (data?.by_status || []).forEach((r) => (map[r.status] = Number(r.total || 0)));
    const total = Object.values(map).reduce((a, n) => a + n, 0);
    const selesai = map.SELESAI || 0;
    const perjalanan = (map.DALAM_PERJALANAN || 0) + (map.DIKIRIM || 0);
    const diproses = (map.BOOKED || 0) + (map.DITERIMA || 0) + (map.DISIMPAN || 0);
    const tertunda = (map.GAGAL_KIRIM || 0) + (map.RETUR || 0) + (map.BATAL || 0);

    const groups = [
      { key: "Selesai", value: selesai, color: "#22c55e" },
      { key: "Dalam Perjalanan", value: perjalanan, color: "#2563eb" },
      { key: "Diproses", value: diproses, color: "#f59e0b" },
      { key: "Tertunda", value: tertunda, color: "#ef4444" },
    ];
    return { total, selesai, perjalanan, diproses, tertunda, groups };
  }, [data]);

  const [hoveredTrendIdx, setHoveredTrendIdx] = useState(null);

  // Real 7-day trend points from backend (/api/dashboard -> trend_7d)
  const trendData = useMemo(() => {
    const raw = Array.isArray(data?.trend_7d) ? data.trend_7d : [];
    if (raw.length > 0) {
      const dayFmt = new Intl.DateTimeFormat("id-ID", { weekday: "short" });
      const fullFmt = new Intl.DateTimeFormat("id-ID", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
      return raw.map((item) => {
        const dt = new Date(`${item.date}T00:00:00+07:00`);
        return {
          day: dayFmt.format(dt).replace(".", ""),
          fullDate: fullFmt.format(dt),
          count: Number(item.total || 0),
        };
      });
    }
    const days = ["Sel", "Rab", "Kam", "Jum", "Sab", "Min", "Sen"];
    return days.map((day) => ({ day, fullDate: day, count: 0 }));
  }, [data]);

  const rawMax = Math.max(...trendData.map((d) => d.count), 0);
  const maxTrend = rawMax <= 4 ? 4 : Math.ceil(rawMax / 4) * 4;
  const chartW = 440;
  const chartH = 164;
  const padLeft = 36;
  const padRight = 18;
  const padTop = 24;
  const padBottom = 24;
  const plotW = chartW - padLeft - padRight;
  const plotH = chartH - padTop - padBottom;

  const points = trendData.map((d, i) => {
    const x = padLeft + (i * plotW) / Math.max(trendData.length - 1, 1);
    const y = padTop + plotH - (d.count / maxTrend) * plotH;
    return { ...d, x, y };
  });
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const baselineY = padTop + plotH;
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${baselineY} L ${points[0].x.toFixed(1)} ${baselineY} Z`;
  const total7d = trendData.reduce((acc, d) => acc + d.count, 0);
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    ratio,
    value: Math.round(maxTrend * ratio),
    y: padTop + plotH - ratio * plotH,
  }));

  // Donut arcs
  const r = 15.915;
  let offset = 0;
  const donutArcs = stats.groups
    .filter((g) => g.value > 0 && stats.total > 0)
    .map((g) => {
      const pct = (g.value / stats.total) * 100;
      const seg = { ...g, pct, offset };
      offset += pct;
      return seg;
    });

  const todayLabel = new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());

  const role = user?.role || "kurir";
  const ROLE_HERO = {
    superadmin: {
      badge: "Superadmin · Kendali Penuh",
      title: "Pusat Kendali Sistem LacakIn v2.",
      sub: "Pantau seluruh operasional pengiriman Jawa Timur, manajemen akun pegawai, dan cadangan basis data.",
      actions: [
        { to: "/kirim", label: "Buat Pesanan Baru", primary: true },
        { to: "/pegawai", label: "Manajemen Pegawai" },
        { to: "/backup", label: "Cadangan Data" },
      ],
    },
    admin: {
      badge: "Admin · Operasional dan Kurir",
      title: "Panel Manajemen Operasional dan Kurir.",
      sub: "Kelola pengiriman, verifikasi pendaftaran kurir baru, dan atur operasional gerai di Jawa Timur.",
      actions: [
        { to: "/kirim", label: "Buat Pesanan Baru", primary: true },
        { to: "/pengajuan-kurir", label: "Manajemen Kurir" },
        { to: "/pegawai", label: "Manajemen Pegawai" },
      ],
    },
    supervisor: {
      badge: "Supervisor · Monitoring Wilayah",
      title: "Monitoring Pengiriman Jawa Timur.",
      sub: "Pantau performa pengiriman, distribusi status paket, dan pergerakan resi di seluruh gerai.",
      actions: [
        { to: "/pengiriman", label: "Lihat Daftar Pengiriman", primary: true },
        { to: "/lacak", label: "Lacak Resi" },
      ],
    },
    operator: {
      badge: "Operator · Loket dan Gerai",
      title: "Operasional Loket dan Gerai LacakIn.",
      sub: "Terbitkan resi pengiriman baru dan perbarui status checkpoint paket di gerai penempatan Anda.",
      actions: [
        { to: "/kirim", label: "Buat Pesanan Baru", primary: true },
        { to: "/checkpoint", label: "Input Checkpoint" },
      ],
    },
    kurir: {
      badge: "Kurir Lapangan · Pickup dan Antar",
      title: "Tugas Pickup dan Pengantaran Kurir.",
      sub: "Lihat antrean pesanan online siap pickup, perbarui checkpoint perjalanan, dan unggah foto bukti serah terima.",
      actions: [
        { to: "/checkpoint", label: "Input Checkpoint dan Pickup", primary: true },
        { to: "/pengiriman", label: "Daftar Pengiriman" },
      ],
    },
  };
  const hero = ROLE_HERO[role] || ROLE_HERO.kurir;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-5"
    >
      {error && <div className="degraded-banner">{error}</div>}

      {/* ROW 1: Hero Banner + Ringkasan Hari Ini */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-8 relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#123892] via-[#1c56d1] to-[#2e7cf6] p-6 sm:p-7 text-white shadow-lg shadow-blue-900/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="max-w-lg z-10">
            <span className="inline-block rounded-full bg-white/15 border border-white/20 px-3 py-0.5 text-[11px] font-bold text-sky-200 mb-2.5">
              {hero.badge}
            </span>
            <h1 className="text-2xl sm:text-[26px] font-extrabold leading-tight tracking-tight">
              {hero.title}
            </h1>
            <p className="mt-2 text-sm text-blue-100 leading-relaxed">
              {hero.sub}
            </p>
            <div className="mt-5 flex flex-wrap sm:flex-nowrap items-center gap-2">
              {hero.actions.map((act) => (
                <Link
                  key={act.to}
                  to={act.to}
                  className={
                    act.primary
                      ? "inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-white px-4 text-xs sm:text-[13px] font-bold text-[#123892] shadow-md hover:bg-blue-50 transition-colors no-underline whitespace-nowrap"
                      : "inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-white/30 bg-white/15 px-3.5 text-xs sm:text-[13px] font-bold text-white hover:bg-white/25 transition-colors no-underline whitespace-nowrap"
                  }
                >
                  {act.primary && <FiPlus className="h-4 w-4" />}
                  {act.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="hidden sm:block w-[220px] lg:w-[250px] shrink-0">
            <div className="overflow-hidden rounded-2xl border border-white/25 bg-white/10 p-1.5 backdrop-blur-md shadow-xl">
              <img
                src={
                  user?.role === "kurir"
                    ? "/images/courier-mascot.webp"
                    : user?.role === "operator"
                    ? "/images/login-warehouse-hero.webp"
                    : "/images/hero-delivery-van.webp"
                }
                alt="Operasional LacakIn"
                className={`aspect-[3/2] w-full rounded-xl ${
                  user?.role === "kurir" ? "object-contain bg-[#eef3f9]" : "object-cover"
                }`}
              />
            </div>
          </div>
        </div>

        {/* Ringkasan Hari Ini */}
        <div className="xl:col-span-4 rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 font-extrabold text-slate-900 text-[15px]">
              <FiCalendar className="h-4 w-4 text-blue-600" />
              Ringkasan Hari Ini
            </div>
            <span className="text-xs font-semibold text-slate-400">{todayLabel}</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-2xl font-extrabold text-slate-900">{stats.total}</div>
              <div className="text-[11.5px] font-semibold text-slate-500 mt-0.5">Total Paket</div>
            </div>
            <div className="border-l border-slate-100 pl-3">
              <div className="flex items-center gap-1 text-2xl font-extrabold text-emerald-600">
                <FiCheckCircle className="h-4 w-4 shrink-0" />
                {stats.selesai}
              </div>
              <div className="text-[11.5px] font-semibold text-slate-500 mt-0.5">Selesai</div>
            </div>
            <div className="border-l border-slate-100 pl-3">
              <div className="flex items-center gap-1 text-2xl font-extrabold text-blue-600">
                <FiTruck className="h-4 w-4 shrink-0" />
                {stats.perjalanan}
              </div>
              <div className="text-[11.5px] font-semibold text-slate-500 mt-0.5">Perjalanan</div>
            </div>
          </div>

          {/* Completion Progress Bar */}
          <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-3 space-y-1.5">
            <div className="flex items-center justify-between text-[11.5px]">
              <span className="font-bold text-slate-600">Tingkat Penyelesaian</span>
              <span className="font-extrabold text-emerald-600">
                {stats.total ? `${Math.round((stats.selesai / stats.total) * 100)}%` : "0%"}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: stats.total ? `${Math.round((stats.selesai / stats.total) * 100)}%` : "0%" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ROW 2: Left 8-col (4 Pastel KPIs + Trend Chart + Donut) | Right 4-col (Aktivitas Terbaru) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        <div className="xl:col-span-8 flex flex-col gap-5">
          {/* 4 Pastel KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-blue-100 bg-[#f0f6ff] p-4 flex items-center gap-3.5 shadow-xs">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-700">
                <FiPackage className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-600 truncate">Total Pengiriman</div>
                <div className="text-2xl font-extrabold text-slate-900 leading-tight">{stats.total}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-sky-100 bg-[#f0f9ff] p-4 flex items-center gap-3.5 shadow-xs">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-700">
                <FiTruck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-600 truncate">Dalam Perjalanan</div>
                <div className="text-2xl font-extrabold text-slate-900 leading-tight">{stats.perjalanan}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-[#ecfdf5] p-4 flex items-center gap-3.5 shadow-xs">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                <FiCheckCircle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-600 truncate">Selesai</div>
                <div className="text-2xl font-extrabold text-slate-900 leading-tight">{stats.selesai}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-rose-100 bg-[#fff1f2] p-4 flex items-center gap-3.5 shadow-xs">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-rose-100 text-rose-600">
                <FiAlertCircle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-600 truncate">Tertunda / Retur</div>
                <div className="text-2xl font-extrabold text-slate-900 leading-tight">{stats.tertunda}</div>
              </div>
            </div>
          </div>

          {/* Trend Line Chart + Donut Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 items-stretch">
            {/* Tren Pengiriman */}
            <div className="lg:col-span-7 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div>
                  <div className="flex items-center gap-2 font-extrabold text-slate-900 text-[15px]">
                    <FiTrendingUp className="h-4 w-4 text-blue-600" />
                    Tren Pengiriman (7 Hari Terakhir)
                  </div>
                  <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                    Total {total7d} paket masuk dalam 7 hari terakhir
                  </p>
                </div>
                <span className="rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 shrink-0">
                  {total7d} Paket / 7h
                </span>
              </div>

              <div className="relative">
                <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-auto overflow-visible">
                  <defs>
                    <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity="0.24" />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  {yTicks.map((t) => (
                    <g key={t.ratio}>
                      <line
                        x1={padLeft}
                        y1={t.y}
                        x2={chartW - padRight}
                        y2={t.y}
                        stroke={t.ratio === 0 ? "#cbd5e1" : "#eef2f7"}
                        strokeDasharray={t.ratio === 0 ? undefined : "3 3"}
                      />
                      <text
                        x={padLeft - 8}
                        y={t.y + 3.5}
                        textAnchor="end"
                        fill="#94a3b8"
                        fontSize="10"
                        fontWeight="700"
                      >
                        {t.value}
                      </text>
                    </g>
                  ))}
                  <path d={areaPath} fill="url(#trendGrad)" />
                  <path d={linePath} fill="none" stroke="#2563eb" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                  {points.map((p, idx) => {
                    const isHovered = hoveredTrendIdx === idx;
                    return (
                      <g
                        key={`${p.day}-${idx}`}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredTrendIdx(idx)}
                        onMouseLeave={() => setHoveredTrendIdx(null)}
                      >
                        {isHovered && (
                          <line
                            x1={p.x}
                            y1={padTop}
                            x2={p.x}
                            y2={baselineY}
                            stroke="#bfdbfe"
                            strokeWidth="1.5"
                            strokeDasharray="3 3"
                          />
                        )}
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={isHovered ? "5.5" : "4.2"}
                          fill="#ffffff"
                          stroke="#2563eb"
                          strokeWidth="2.5"
                        />
                        <text
                          x={p.x}
                          y={Math.max(p.y - 10, 12)}
                          textAnchor="middle"
                          fill={isHovered ? "#1d4ed8" : "#334155"}
                          fontSize="10.5"
                          fontWeight="800"
                        >
                          {p.count}
                        </text>
                        <text
                          x={p.x}
                          y={chartH - 5}
                          textAnchor="middle"
                          fill={isHovered ? "#1d4ed8" : "#64748b"}
                          fontSize="11"
                          fontWeight={isHovered ? "800" : "600"}
                        >
                          {p.day}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                {hoveredTrendIdx !== null && points[hoveredTrendIdx] && (
                  <div className="pointer-events-none absolute top-1 right-2 rounded-xl border border-slate-200 bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-md">
                    {points[hoveredTrendIdx].fullDate}:{" "}
                    <span className="text-sky-300">{points[hoveredTrendIdx].count} paket</span>
                  </div>
                )}
              </div>
            </div>

            {/* Distribusi Status Pengiriman (Donut) */}
            <div className="lg:col-span-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center gap-2 font-extrabold text-slate-900 text-[15px] mb-3">
                <FiPieChart className="h-4 w-4 text-blue-600" />
                Distribusi Status
              </div>

              <div className="flex items-center gap-4 my-auto">
                <div className="relative h-[118px] w-[118px] shrink-0">
                  <svg viewBox="0 0 42 42" className="h-full w-full -rotate-90">
                    <circle cx="21" cy="21" r={r} fill="none" stroke="#f1f5f9" strokeWidth="5.5" />
                    {donutArcs.map((seg) => (
                      <circle
                        key={seg.key}
                        cx="21"
                        cy="21"
                        r={r}
                        fill="none"
                        stroke={seg.color}
                        strokeWidth="5.5"
                        strokeDasharray={`${seg.pct} ${100 - seg.pct}`}
                        strokeDashoffset={-seg.offset}
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-extrabold text-slate-900 leading-none">{stats.total}</span>
                    <span className="text-[10px] font-semibold text-slate-400 mt-0.5">Paket</span>
                  </div>
                </div>

                <div className="flex-1 space-y-2 text-xs">
                  {stats.groups.map((g) => {
                    const pct = stats.total ? ((g.value / stats.total) * 100).toFixed(1) : "0.0";
                    return (
                      <div key={g.key} className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-slate-600 font-semibold truncate">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: g.color }} />
                          {g.key}
                        </span>
                        <span className="font-bold text-slate-900">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 4-col: Aktivitas Terbaru Feed */}
        <div className="xl:col-span-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 font-extrabold text-slate-900 text-[15px]">
              <FiZap className="h-4 w-4 text-blue-600" />
              Aktivitas Terbaru
            </div>
            <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-500">
              {data?.events_last_hour ?? 0} / jam
            </span>
          </div>

          <div className="flex-1 divide-y divide-slate-100 my-1">
            {(data?.latest || []).slice(0, 5).map((ev, idx) => {
              const isDone = ev.status === "SELESAI";
              const isTransit = ev.status === "DALAM_PERJALANAN" || ev.status === "DIKIRIM";
              const iconBg = isDone
                ? "bg-emerald-100 text-emerald-600"
                : isTransit
                ? "bg-blue-100 text-blue-600"
                : "bg-amber-100 text-amber-600";
              return (
                <Link
                  key={`${ev.shipment_code}-${idx}`}
                  to={`/lacak?code=${encodeURIComponent(ev.shipment_code)}`}
                  className="flex items-start gap-3 py-3 hover:bg-slate-50/80 rounded-lg px-1.5 -mx-1.5 transition-colors no-underline"
                >
                  <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${iconBg}`}>
                    {isDone ? <FiCheckCircle className="h-4 w-4" /> : isTransit ? <FiTruck className="h-4 w-4" /> : <FiPackage className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="mono text-xs font-extrabold text-slate-900 truncate">
                        {ev.shipment_code}
                      </span>
                      <span className="text-[11px] text-slate-400 shrink-0">
                        {formatDateTime(ev.recorded_at).split(",")[1] || formatDateTime(ev.recorded_at)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 truncate mt-0.5">
                      {STATUS_LABEL[ev.status] || ev.status} · {ev.location}
                    </div>
                  </div>
                </Link>
              );
            })}
            {(!data?.latest || data.latest.length === 0) && (
              <p className="py-8 text-center text-xs text-slate-400">Belum ada aktivitas terbaru.</p>
            )}
          </div>

          <Link
            to="/pengiriman"
            className="mt-3 inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/70 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors no-underline"
          >
            Lihat Semua Aktivitas
          </Link>
        </div>
      </div>

      {/* ROW 3: 10 Pengiriman Terbaru + Peta Sebaran Pengiriman */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        <div className="xl:col-span-7 rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden flex flex-col">
          <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2 font-extrabold text-slate-900 text-[15px]">
              <FiPackage className="h-4 w-4 text-blue-600" />
              10 Pengiriman Terbaru
            </div>
            <Link to="/pengiriman" className="text-xs font-bold text-blue-600 hover:underline no-underline">
              Lihat Semua
            </Link>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>No. Resi</th>
                  <th>Lokasi Terkini</th>
                  <th>Layanan</th>
                  <th>Status</th>
                  <th>Waktu Update</th>
                </tr>
              </thead>
              <tbody>
                {shipments.slice(0, 6).map((s) => (
                  <tr key={s.code}>
                    <td>
                      <Link
                        to={`/lacak?code=${encodeURIComponent(s.code)}`}
                        className="inline-block rounded-lg bg-blue-50 px-2.5 py-1 mono text-xs font-bold text-blue-700 hover:bg-blue-100 no-underline"
                      >
                        {s.code}
                      </Link>
                    </td>
                    <td className="font-semibold text-slate-700 max-w-[200px] truncate">{s.current_location}</td>
                    <td>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                        {s.service_code || "REG"}
                      </span>
                    </td>
                    <td><StatusBadge status={s.current_status} /></td>
                    <td className="text-xs text-slate-500 whitespace-nowrap">{formatDateTime(s.updated_at)}</td>
                  </tr>
                ))}
                {shipments.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", color: "var(--muted)" }}>
                      Belum ada data pengiriman.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Peta Sebaran Pengiriman Jawa Timur */}
        <div className="xl:col-span-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-extrabold text-slate-900 text-[15px]">
              <FiMap className="h-4 w-4 text-blue-600" />
              Peta Sebaran Pengiriman Jawa Timur
            </div>
            <span className="text-[11px] font-bold text-slate-400">Live Network</span>
          </div>

          <EastJavaMap mode="network" heightClass="h-[240px] xl:h-[275px]" />

          <div className="grid grid-cols-3 gap-3 border-t border-slate-100 pt-3">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
                <FiMapPin className="h-4 w-4" />
              </div>
              <div>
                <div className="text-base font-extrabold text-slate-900 leading-none">38</div>
                <div className="text-[10.5px] font-semibold text-slate-500">Kab/Kota Jatim</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-600">
                <FiTrendingUp className="h-4 w-4" />
              </div>
              <div>
                <div className="text-base font-extrabold text-slate-900 leading-none">32</div>
                <div className="text-[10.5px] font-semibold text-slate-500">Hub Aktif</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                <FiPackage className="h-4 w-4" />
              </div>
              <div>
                <div className="text-base font-extrabold text-slate-900 leading-none">{stats.perjalanan}</div>
                <div className="text-[10.5px] font-semibold text-slate-500">Paket Aktif</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
