import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  FiAlertCircle,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiExternalLink,
  FiHome,
  FiInfo,
  FiLayers,
  FiMapPin,
  FiPackage,
  FiPieChart,
  FiPlus,
  FiPrinter,
  FiRotateCcw,
  FiSearch,
  FiTrash2,
  FiTruck,
  FiUser,
  FiUserCheck,
} from "react-icons/fi";
import StatusBadge from "../components/StatusBadge.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { STATUS_LABEL, apiFetch, formatDateTime, formatRupiah, getStoredToken, hasRole } from "../lib/api.js";

export default function PengirimanPage() {
  const { user, showToast } = useAuth();
  const [items, setItems] = useState([]);
  const [dash, setDash] = useState(null);
  const [total, setTotal] = useState(0);
  const [cursor, setCursor] = useState(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [courierFilter, setCourierFilter] = useState("");
  const [hubFilter, setHubFilter] = useState("");
  const [scopeFilter, setScopeFilter] = useState("");
  const [couriers, setCouriers] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canCreate = hasRole(user, ["superadmin", "admin", "operator"]);
  const canDelete = hasRole(user, ["admin", "superadmin"]);
  const canAssign = hasRole(user, ["superadmin", "admin", "supervisor", "operator"]);
  const isKurir = user?.role === "kurir";

  const loadDash = useCallback(async () => {
    try {
      setDash(await apiFetch("/api/dashboard"));
    } catch {
      /* non-fatal */
    }
  }, []);

  const loadCouriers = useCallback(async () => {
    if (!canAssign) return;
    try {
      const data = await apiFetch("/api/couriers");
      setCouriers(Array.isArray(data) ? data : []);
    } catch {
      /* non-fatal */
    }
  }, [canAssign]);

  useEffect(() => {
    apiFetch("/api/reference")
      .then((d) => setHubs(Array.isArray(d?.hubs) ? d.hubs : []))
      .catch(() => { });
  }, []);

  useEffect(() => {
    loadCouriers();
  }, [loadCouriers]);

  const load = useCallback(
    async (append = false, cur = null) => {
      setLoading(true);
      setError("");
      const p = new URLSearchParams({ limit: "25" });
      if (q.trim()) p.set("q", q.trim());
      if (status) p.set("status", status);
      if (courierFilter) p.set("courier_id", courierFilter);
      if (hubFilter) p.set("hub_id", hubFilter);
      if (isKurir && scopeFilter) p.set("scope", scopeFilter);
      if (cur) {
        p.set("cursor_updated_at", cur.updated_at);
        p.set("cursor_code", cur.code);
      }
      try {
        const r = await apiFetch(`/api/shipments?${p}`);
        setItems((prev) => (append ? [...prev, ...r.items] : r.items));
        setTotal(r.total_count);
        setCursor(r.next_cursor);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    },
    [q, status, courierFilter, hubFilter, isKurir, scopeFilter]
  );

  useEffect(() => {
    loadDash();
  }, [loadDash]);

  useEffect(() => {
    const t = setTimeout(() => load(false), 250);
    return () => clearTimeout(t);
  }, [load]);

  const filteredItems = useMemo(() => {
    if (!serviceFilter) return items;
    return items.filter((i) => (i.service_code || "REG").toUpperCase() === serviceFilter);
  }, [items, serviceFilter]);

  const stats = useMemo(() => {
    const map = {};
    (dash?.by_status || []).forEach((r) => (map[r.status] = Number(r.total || 0)));
    const all = Object.values(map).reduce((a, n) => a + n, 0) || total;
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
    return { all, selesai, perjalanan, diproses, tertunda, groups };
  }, [dash, total]);

  const quickInfo = useMemo(() => {
    if (!items.length) return { topService: "-", topLoc: "-", latestTime: "-" };
    const svcCount = {};
    const locCount = {};
    for (const i of items) {
      const s = i.service_code || "REG";
      svcCount[s] = (svcCount[s] || 0) + 1;
      const l = (i.current_location || "-").split(",")[0];
      locCount[l] = (locCount[l] || 0) + 1;
    }
    const topSvcEntry = Object.entries(svcCount).sort((a, b) => b[1] - a[1])[0];
    const topLocEntry = Object.entries(locCount).sort((a, b) => b[1] - a[1])[0];
    const svcPct = topSvcEntry ? Math.round((topSvcEntry[1] / items.length) * 100) : 0;
    const locPct = topLocEntry ? Math.round((topLocEntry[1] / items.length) * 100) : 0;
    return {
      topService: topSvcEntry ? `${topSvcEntry[0]} (${svcPct}%)` : "-",
      topLoc: topLocEntry ? `${topLocEntry[0]} (${locPct}%)` : "-",
      latestTime: items[0]?.updated_at ? formatDateTime(items[0].updated_at) : "-",
    };
  }, [items]);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [assignTarget, setAssignTarget] = useState(null);
  const [assignCourierId, setAssignCourierId] = useState("");
  const [assigning, setAssigning] = useState(false);

  const openAssignModal = (shipment) => {
    setAssignTarget(shipment);
    setAssignCourierId(shipment.assigned_courier_id ? String(shipment.assigned_courier_id) : "");
  };

  const confirmAssign = async (e) => {
    e.preventDefault();
    if (!assignTarget) return;
    setAssigning(true);
    try {
      await apiFetch(`/api/shipments/${encodeURIComponent(assignTarget.code)}/assign`, {
        method: "POST",
        body: { courier_id: assignCourierId ? Number(assignCourierId) : null },
      });
      showToast(
        assignCourierId
          ? `Kurir berhasil ditugaskan untuk resi ${assignTarget.code}`
          : `Penugasan kurir untuk resi ${assignTarget.code} dilepas`,
        "success"
      );
      setAssignTarget(null);
      load(false);
      loadCouriers();
    } catch (err) {
      showToast(err.message || "Gagal menugaskan kurir", "error");
    } finally {
      setAssigning(false);
    }
  };

  const remove = (code) => {
    setDeleteTarget(code);
  };

  const confirmRemove = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/shipments/${encodeURIComponent(deleteTarget)}`, { method: "DELETE" });
      showToast(`${deleteTarget} berhasil dihapus`, "success");
      setDeleteTarget(null);
      load(false);
      loadDash();
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setDeleting(false);
    }
  };

  const buildFilterSummary = () => {
    const parts = [];
    if (q) parts.push(`Pencarian: ${q}`);
    if (status) parts.push(`Status: ${STATUS_LABEL[status] || status}`);
    if (serviceFilter) parts.push(`Layanan: ${serviceFilter}`);
    if (courierFilter === "UNASSIGNED") parts.push("Kurir: Belum Ditugaskan");
    else if (courierFilter) parts.push(`Kurir ID: ${courierFilter}`);
    if (hubFilter) parts.push(`Hub ID: ${hubFilter}`);
    return parts.length ? parts.join(" | ") : "Semua Data";
  };

  const exportCsv = async () => {
    try {
      const qs = new URLSearchParams();
      if (q) qs.set("q", q);
      if (status) qs.set("status", status);
      if (serviceFilter) qs.set("service_code", serviceFilter);
      if (courierFilter) qs.set("courier_id", courierFilter);
      if (hubFilter) qs.set("hub_id", hubFilter);
      if (scopeFilter) qs.set("scope", scopeFilter);

      const token = getStoredToken();
      const res = await fetch(`/api/shipments/export.csv?${qs.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Gagal mengekspor CSV dari server.");
      const blob = await res.blob();
      const dateStamp = new Date().toISOString().slice(0, 10);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `lacakin-daftar-pengiriman-${dateStamp}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      showToast("Berhasil mengekspor seluruh data pengiriman ke CSV.", "success");
    } catch (e) {
      showToast(e.message || "Gagal mengekspor CSV.", "error");
    }
  };

  const handlePrintReport = () => {
    if (!filteredItems.length) {
      showToast("Tidak ada data pengiriman untuk dicetak.", "error");
      return;
    }
    const esc = (v) =>
      String(v ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    const nowLabel = formatDateTime(new Date().toISOString());
    const totalRevenue = filteredItems.reduce((acc, it) => acc + Number(it.total_cost || 0), 0);
    const doneCount = filteredItems.filter((it) => it.current_status === "SELESAI").length;
    const transitCount = filteredItems.filter((it) =>
      ["DITERIMA", "DISIMPAN", "DALAM_PERJALANAN", "DIKIRIM"].includes(it.current_status)
    ).length;

    const rowsHtml = filteredItems
      .map((i, idx) => {
        const svc = (i.service_code || "REG").toUpperCase();
        const pkg = i.package_type || "Umum";
        const statusText = STATUS_LABEL[i.current_status] || i.current_status;
        const origHub = i.origin_hub_name || i.origin_hub_code || "-";
        const destHub = i.dest_hub_name || i.dest_hub_code || "-";
        const courier = i.assigned_courier_name || "Belum ditugaskan";
        return `
          <tr>
            <td class="num">${idx + 1}</td>
            <td class="mono">${esc(i.code)}</td>
            <td><strong>${esc(svc)}</strong><div class="sub">${esc(pkg)}</div></td>
            <td><span class="badge">${esc(statusText)}</span></td>
            <td>${esc(i.current_location || "-")}</td>
            <td><div>Asal: ${esc(origHub)}</div><div class="sub">Tujuan: ${esc(destHub)}</div></td>
            <td>${esc(courier)}</td>
            <td class="num">${esc(formatRupiah(i.total_cost || 0))}</td>
            <td>${esc(formatDateTime(i.updated_at))}</td>
          </tr>
        `;
      })
      .join("");

    const html = `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>Laporan Daftar Pengiriman - LacakIn</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    body { font-family: "Segoe UI", Arial, sans-serif; color: #0f172a; margin: 0; font-size: 11px; line-height: 1.4; }
    .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #1d4ed8; padding-bottom: 10px; margin-bottom: 12px; }
    .brand { font-size: 18px; font-weight: 800; color: #1d4ed8; letter-spacing: -0.3px; }
    .brand-sub { font-size: 10px; color: #475569; margin-top: 2px; }
    .title { font-size: 15px; font-weight: 800; text-align: right; color: #0f172a; }
    .meta { font-size: 10px; color: #475569; text-align: right; margin-top: 2px; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px; }
    .card { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; background: #f8fafc; }
    .card-label { font-size: 9.5px; text-transform: uppercase; color: #64748b; font-weight: 700; }
    .card-val { font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #1e3a8a; color: #fff; text-align: left; padding: 6px 7px; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.3px; }
    td { border-bottom: 1px solid #e2e8f0; padding: 6px 7px; vertical-align: top; }
    tr:nth-child(even) td { background: #f8fafc; }
    .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .mono { font-family: Consolas, monospace; font-weight: 700; color: #1d4ed8; white-space: nowrap; }
    .sub { font-size: 9.5px; color: #64748b; margin-top: 1px; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 999px; background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; font-weight: 700; font-size: 9.5px; white-space: nowrap; }
    .footer { margin-top: 16px; display: flex; justify-content: space-between; font-size: 10px; color: #64748b; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">LacakIn Logistics</div>
      <div class="brand-sub">Sistem Manajemen Pengiriman dan Pelacakan Jawa Timur</div>
    </div>
    <div>
      <div class="title">LAPORAN DAFTAR PENGIRIMAN PAKET</div>
      <div class="meta">Dicetak: ${esc(nowLabel)} | Petugas: ${esc(user?.full_name || "Admin")} | Filter: ${esc(buildFilterSummary())}</div>
    </div>
  </div>
  <div class="summary">
    <div class="card"><div class="card-label">Total Paket</div><div class="card-val">${filteredItems.length} Paket</div></div>
    <div class="card"><div class="card-label">Selesai Diterima</div><div class="card-val">${doneCount} Paket</div></div>
    <div class="card"><div class="card-label">Dalam Proses / Transit</div><div class="card-val">${transitCount} Paket</div></div>
    <div class="card"><div class="card-label">Total Nilai Pengiriman</div><div class="card-val">${esc(formatRupiah(totalRevenue))}</div></div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="text-align:right">No</th>
        <th>No. Resi</th>
        <th>Layanan dan Paket</th>
        <th>Status</th>
        <th>Lokasi Saat Ini</th>
        <th>Rute Hub</th>
        <th>Kurir</th>
        <th style="text-align:right">Total Biaya</th>
        <th>Diperbarui</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <div class="footer">
    <div>Dokumen ini dihasilkan otomatis oleh sistem LacakIn v2.</div>
    <div>Halaman Laporan Operasional Resmi</div>
  </div>
  <script>window.onload = function () { setTimeout(function () { window.print(); }, 250); };</script>
</body>
</html>`;

    const win = window.open("", "_blank", "width=1120,height=780");
    if (!win) {
      showToast("Pop-up diblokir browser. Izinkan pop-up untuk mencetak PDF.", "error");
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  const resetFilters = () => {
    setQ("");
    setStatus("");
    setServiceFilter("");
    setCourierFilter("");
    setHubFilter("");
    setScopeFilter("");
  };

  const r = 15.915;
  let offset = 0;
  const donutArcs = stats.groups
    .filter((g) => g.value > 0 && stats.all > 0)
    .map((g) => {
      const pct = (g.value / stats.all) * 100;
      const seg = { ...g, pct, offset };
      offset += pct;
      return seg;
    });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-5"
    >
      {/* Breadcrumb & Page Title */}
      <div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-2">
          <Link to="/" className="hover:text-blue-600 inline-flex items-center text-slate-500 no-underline">
            <FiHome className="h-3.5 w-3.5" />
          </Link>
          <span>/</span>
          <span>Operasional</span>
          <span>/</span>
          <span className="text-slate-700 font-bold">Daftar Pengiriman</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-100/80 text-blue-700 shadow-xs">
              <FiLayers className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
                Daftar Pengiriman
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Kelola dan pantau seluruh paket yang tercatat pada sistem.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canCreate && (
              <Link
                to="/kirim"
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] px-4 text-xs sm:text-sm font-bold text-white shadow-sm hover:opacity-95 no-underline"
              >
                <FiPlus className="h-4 w-4" />
                Buat Pesanan
              </Link>
            )}
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <FiDownload className="h-4 w-4 text-slate-500" />
              Ekspor CSV
            </button>
            <button
              type="button"
              onClick={handlePrintReport}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <FiPrinter className="h-4 w-4 text-slate-500" />
              Cetak PDF
            </button>
          </div>
        </div>
      </div>

      {/* Count Headline */}
      <div className="text-lg sm:text-xl font-extrabold text-slate-900">
        <span className="text-blue-600">{total}</span> paket tercatat
      </div>

      {/* 4 Pastel KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-blue-100 bg-[#f0f6ff] p-4 flex items-center gap-3.5 shadow-xs">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-700">
            <FiPackage className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-600 truncate">Total Pengiriman</div>
            <div className="text-2xl font-extrabold text-slate-900 leading-tight">{stats.all}</div>
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

      {/* Top 2-Col Summary Cards + Full-Width Table */}
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
          {/* Distribusi Status */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center gap-2 font-extrabold text-slate-900 text-sm mb-3">
              <FiPieChart className="h-4 w-4 text-blue-600" />
              Distribusi Status
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-5 my-auto">
              <div className="relative h-[108px] w-[108px] shrink-0">
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
                  <span className="text-lg font-extrabold text-slate-900 leading-none">{stats.all}</span>
                  <span className="text-[10px] font-semibold text-slate-400 mt-0.5">Pengiriman</span>
                </div>
              </div>

              <div className="w-full space-y-2 text-xs">
                {stats.groups.map((g) => {
                  const pct = stats.all ? ((g.value / stats.all) * 100).toFixed(1) : "0.0";
                  return (
                    <div key={g.key} className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-slate-600 font-semibold">
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

          {/* Informasi Cepat */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center gap-2 font-extrabold text-slate-900 text-sm mb-3">
              <FiInfo className="h-4 w-4 text-blue-600" />
              Informasi Cepat
            </div>
            <div className="divide-y divide-slate-100 text-xs my-auto">
              <div className="flex items-center justify-between gap-2 py-2.5">
                <span className="inline-flex items-center gap-1.5 text-slate-500">
                  <FiTruck className="h-3.5 w-3.5 text-blue-500" /> Layanan Terbanyak
                </span>
                <strong className="text-slate-800">{quickInfo.topService}</strong>
              </div>
              <div className="flex items-start justify-between gap-3 py-2.5">
                <span className="inline-flex items-center gap-1.5 text-slate-500 shrink-0">
                  <FiMapPin className="h-3.5 w-3.5 text-blue-500" /> Lokasi Terbanyak
                </span>
                <strong className="text-slate-800 text-right leading-snug">{quickInfo.topLoc}</strong>
              </div>
              <div className="flex items-center justify-between gap-2 py-2.5">
                <span className="inline-flex items-center gap-1.5 text-slate-500">
                  <FiClock className="h-3.5 w-3.5 text-blue-500" /> Update Terakhir
                </span>
                <strong className="text-slate-800 text-right">{quickInfo.latestTime}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 min-w-[260px]">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari nomor resi atau lokasi..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15"
              />
            </div>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm font-semibold text-slate-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Semua Status</option>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>

            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm font-semibold text-slate-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Semua Layanan</option>
              <option value="REG">REG (Reguler)</option>
              <option value="EXP">EXP (Ekspres)</option>
              <option value="SDY">SDY (Sameday)</option>
              <option value="KRG">KRG (Kargo)</option>
            </select>

            {isKurir && (
              <select
                value={scopeFilter}
                onChange={(e) => setScopeFilter(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm font-semibold text-slate-700 focus:border-blue-500 focus:outline-none"
              >
                <option value="">Tugas Saya + Antrean Pickup</option>
                <option value="mine">Hanya Paket Tugas Saya</option>
              </select>
            )}

            {canAssign && (
              <>
                <select
                  value={courierFilter}
                  onChange={(e) => setCourierFilter(e.target.value)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm font-semibold text-slate-700 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Semua Kurir</option>
                  <option value="unassigned">Belum Ditugaskan</option>
                  {couriers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} ({c.employee_code})
                    </option>
                  ))}
                </select>

                <select
                  value={hubFilter}
                  onChange={(e) => setHubFilter(e.target.value)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm font-semibold text-slate-700 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Semua Gudang / Hub</option>
                  {hubs.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.code})
                    </option>
                  ))}
                </select>
              </>
            )}

            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
            >
              <FiRotateCcw className="h-3.5 w-3.5" />
              Reset Filter
            </button>
          </div>

          {error && <div className="degraded-banner">{error}</div>}

          {/* Shipments Table Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Resi dan Layanan</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Lokasi dan Gudang</th>
                    <th className="py-3 px-3">Kurir dan Petugas</th>
                    <th className="py-3 px-3">Biaya dan Update</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredItems.map((i) => {
                    const svc = (i.service_code || "REG").toUpperCase();
                    const svcBadge =
                      svc === "EXP"
                        ? "bg-violet-100 text-violet-700"
                        : svc === "SDY"
                          ? "bg-amber-100 text-amber-700"
                          : svc === "KRG"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-700";
                    return (
                      <tr key={i.code} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <Link
                            to={`/lacak?code=${encodeURIComponent(i.code)}`}
                            className="mono block font-extrabold text-blue-600 hover:underline no-underline"
                          >
                            {i.code}
                          </Link>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-extrabold ${svcBadge}`}>
                              {svc}
                            </span>
                            {i.package_type && (
                              <span className="inline-block rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                                {i.package_type}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <StatusBadge status={i.current_status} />
                        </td>
                        <td className="py-3 px-3">
                          <div className="space-y-0.5 max-w-[240px]">
                            <div className="inline-flex items-start gap-1.5 font-semibold text-slate-700 leading-snug">
                              <FiMapPin className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                              <span>{i.current_location}</span>
                            </div>
                            {(i.origin_hub_code || i.dest_hub_code || i.last_hub_code) && (
                              <div className="text-[11px] text-slate-400 font-medium pl-5">
                                {i.origin_hub_code || "-"} → {i.dest_hub_code || "-"}
                                {i.last_hub_code ? ` · Terakhir: ${i.last_hub_code}` : ""}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="space-y-1 max-w-[220px]">
                            {i.assigned_courier_name ? (
                              <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-100">
                                <FiUser className="h-3 w-3 shrink-0" />
                                <span className="truncate max-w-[115px]">{i.assigned_courier_name}</span>
                                <span className="font-mono text-[10px] text-blue-500">
                                  {i.assigned_courier_code}
                                </span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                                Belum ditugaskan
                              </span>
                            )}
                            {i.last_actor_name && (
                              <div className="text-[11px] text-slate-400 truncate">
                                Scan: <strong className="text-slate-600">{i.last_actor_name}</strong>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="font-extrabold text-slate-800">
                            {formatRupiah(i.total_cost)}
                          </div>
                          <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-slate-400">
                            <FiCalendar className="h-3 w-3" />
                            <span>{formatDateTime(i.updated_at)}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {canAssign && (
                              <button
                                type="button"
                                onClick={() => openAssignModal(i)}
                                title="Tugaskan kurir"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer"
                              >
                                <FiUserCheck className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <Link
                              to={`/lacak?code=${encodeURIComponent(i.code)}`}
                              title="Lacak detail resi"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-600 no-underline"
                            >
                              <FiExternalLink className="h-3.5 w-3.5" />
                            </Link>
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => remove(i.code)}
                                title="Hapus pengiriman"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer"
                              >
                                <FiTrash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!loading && filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-sm text-slate-400">
                        Tidak ada pengiriman yang cocok dengan filter saat ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer / Keyset Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 px-5 py-3.5 bg-slate-50/50">
              <span className="text-xs font-semibold text-slate-500">
                Menampilkan 1–{filteredItems.length} dari {total} pengiriman
              </span>

              {cursor ? (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => load(true, cursor)}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-4 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {loading ? "Memuat..." : "Muat Lebih Banyak"}
                </button>
              ) : (
                <span className="text-xs font-semibold text-slate-400">Semua data telah ditampilkan</span>
              )}
            </div>
          </div>
        </div>
      </div>
      {assignTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={confirmAssign}
            className="w-full max-w-[440px] rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <FiUserCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Tugaskan Kurir</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Resi <strong className="font-mono text-slate-800">{assignTarget.code}</strong>
                  {assignTarget.origin_hub_name ? ` · ${assignTarget.origin_hub_name}` : ""}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="assign-courier-select" className="block text-xs font-bold text-slate-700">
                Pilih Kurir Penanggung Jawab
              </label>
              <select
                id="assign-courier-select"
                value={assignCourierId}
                onChange={(e) => setAssignCourierId(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
              >
                <option value="">-- Lepas Penugasan (Belum Ditugaskan) --</option>
                {couriers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} ({c.employee_code}) · {c.hub_name || c.station || "Umum"} · {c.active_shipments} paket aktif
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400">
                Setelah ditugaskan, hanya kurir terpilih yang dapat memindai dan memproses resi ini.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setAssignTarget(null)}
                className="min-h-[40px] rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={assigning}
                className="min-h-[40px] rounded-xl bg-blue-600 hover:bg-blue-700 px-4 text-xs font-extrabold text-white shadow-xs cursor-pointer disabled:opacity-60"
              >
                {assigning ? "Menyimpan..." : "Simpan Penugasan"}
              </button>
            </div>
          </form>
        </div>
      )}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-[400px] rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                <FiAlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Hapus Pengiriman?</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Resi <strong className="font-mono text-slate-800">{deleteTarget}</strong> akan dihapus dari daftar aktif.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="min-h-[40px] rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmRemove}
                className="min-h-[40px] rounded-xl bg-rose-600 hover:bg-rose-700 px-4 text-xs font-extrabold text-white shadow-xs cursor-pointer disabled:opacity-60"
              >
                {deleting ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
