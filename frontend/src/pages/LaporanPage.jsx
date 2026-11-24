import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  FiBarChart2,
  FiCalendar,
  FiCheckCircle,
  FiCreditCard,
  FiDollarSign,
  FiDownload,
  FiHome,
  FiLayers,
  FiPackage,
  FiPrinter,
  FiShield,
  FiTruck,
  FiUsers,
} from "react-icons/fi";
import StatusBadge from "../components/StatusBadge.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { ROLE_LABEL, STATUS_LABEL, apiFetch, formatDateTime, formatRupiah, getStoredToken } from "../lib/api.js";

function toIsoDate(d) {
  return d.toISOString().slice(0, 10);
}

function getPresetDates(preset) {
  const today = new Date();
  const end = toIsoDate(today);
  if (preset === "7d") {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    return { date_from: toIsoDate(start), date_to: end };
  }
  if (preset === "30d") {
    const start = new Date(today);
    start.setDate(start.getDate() - 29);
    return { date_from: toIsoDate(start), date_to: end };
  }
  return { date_from: "", date_to: "" };
}

const ROLE_SUBTITLE = {
  kurir: "Rekap pengantaran pribadi, setoran COD, dan estimasi insentif antar.",
  operator: "Rekap loket, tutup kasir harian, dan arus paket masuk serta keluar hub.",
  supervisor: "Monitoring SLA pengantaran, rasio keberhasilan, dan kinerja kurir di hub.",
  admin: "Rekapitulasi omzet ongkir, premi asuransi, dan performa seluruh cabang Jawa Timur.",
  superadmin: "Rekapitulasi eksekutif seluruh hub Jawa Timur, omzet, asuransi, dan SLA.",
};

export default function LaporanPage() {
  const { user, showToast } = useAuth();
  const [preset, setPreset] = useState("7d");
  const [dateFrom, setDateFrom] = useState(() => getPresetDates("7d").date_from);
  const [dateTo, setDateTo] = useState(() => getPresetDates("7d").date_to);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const role = user?.role || "operator";

  const load = useCallback(async (fromVal, toVal) => {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams();
      if (fromVal) qs.set("date_from", fromVal);
      if (toVal) qs.set("date_to", toVal);
      const res = await apiFetch(`/api/reports/summary?${qs.toString()}`);
      setData(res);
    } catch (e) {
      setError(e.message || "Gagal memuat laporan.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(dateFrom, dateTo);
  }, [load, dateFrom, dateTo]);

  const applyPreset = (key) => {
    setPreset(key);
    const { date_from, date_to } = getPresetDates(key);
    setDateFrom(date_from);
    setDateTo(date_to);
  };

  const s = data?.summary || {};
  const totalShip = Number(s.total_shipments || 0);
  const delivered = Number(s.delivered_count || 0);
  const slaPct = totalShip > 0 ? ((delivered / totalShip) * 100).toFixed(1) : "0.0";
  const periodLabel = dateFrom && dateTo ? `${dateFrom} s.d. ${dateTo}` : "Seluruh Periode";

  const exportCsv = () => {
    if (!data) return;
    const roleLabel = ROLE_LABEL[role] || role;
    const lines = [
      ["LAPORAN REKAPITULASI OPERASIONAL - LACAKIN LOGISTICS"],
      ["Peran", roleLabel, "Petugas", user?.full_name || "-", "Periode", periodLabel],
      ["Total Paket", totalShip, "Selesai", delivered, "Tingkat Keberhasilan", `${slaPct}%`],
      [],
    ];

    if (role === "kurir") {
      lines.push(["REKAP SETORAN COD DAN INSENTIF KURIR"]);
      lines.push(["Total COD Terkumpul (Rp)", Number(s.cod_collected || 0), "COD Tertunda (Rp)", Number(s.cod_pending || 0), "Estimasi Insentif (Rp)", Number(data.estimated_incentive || 0)]);
      lines.push([]);
      lines.push(["No. Resi", "Penerima", "Kota Tujuan", "Status", "Nominal COD (Rp)", "Diperbarui (WIB)"]);
      (data.cod_items || []).forEach((it) => {
        lines.push([it.code, it.receiver_name || "-", it.dest_city || "-", STATUS_LABEL[it.current_status] || it.current_status, Number(it.total_cost || 0), formatDateTime(it.updated_at)]);
      });
    } else if (role === "operator") {
      lines.push(["REKAP TUTUP KASIR DAN PEMBAYARAN LOKET"]);
      lines.push(["Metode Pembayaran", "Jumlah Paket", "Total Nominal (Rp)"]);
      (data.by_payment || []).forEach((p) => {
        lines.push([p.payment_status, p.total, Number(p.amount || 0)]);
      });
    } else if (role === "supervisor") {
      lines.push(["REKAP KINERJA DAN SLA KURIR HUB"]);
      lines.push(["Kode Pegawai", "Nama Kurir", "Armada", "Total Ditugaskan", "Selesai", "Proses", "Gagal/Retur", "SLA (%)", "COD Terkumpul (Rp)"]);
      (data.courier_performance || []).forEach((c) => {
        const cSla = c.total_assigned ? ((c.delivered / c.total_assigned) * 100).toFixed(1) : "0.0";
        lines.push([c.employee_code, c.full_name, c.vehicle_type, c.total_assigned, c.delivered, c.in_progress, c.failed, `${cSla}%`, Number(c.cod_collected || 0)]);
      });
    } else {
      lines.push(["REKAP OMZET, ASURANSI, DAN PERFORMA HUB JAWA TIMUR"]);
      lines.push(["Kode Hub", "Nama Hub", "Total Paket", "Selesai", "Gagal/Retur", "SLA (%)", "Ongkir Murni (Rp)", "Asuransi (Rp)", "Total Omzet (Rp)"]);
      (data.by_hub || []).forEach((h) => {
        const hSla = h.total_shipments ? ((h.delivered / h.total_shipments) * 100).toFixed(1) : "0.0";
        lines.push([h.hub_code, h.hub_name, h.total_shipments, h.delivered, h.failed, `${hSla}%`, Number(h.shipping_revenue || 0), Number(h.insurance_revenue || 0), Number(h.total_revenue || 0)]);
      });
    }

    lines.push([]);
    lines.push(["REKAP PER LAYANAN"]);
    lines.push(["Layanan", "Jumlah Paket", "Selesai", "Total Berat (kg)", "Total Nilai (Rp)"]);
    (data.by_service || []).forEach((sv) => {
      lines.push([sv.service_code, sv.total, sv.delivered, sv.weight_kg, Number(sv.total_revenue || 0)]);
    });

    const csv = "\uFEFF" + lines.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    a.download = `laporan-${role}-lacakin-${toIsoDate(new Date())}.csv`;
    a.click();
    showToast("Laporan CSV berhasil diekspor.", "success");
  };

  const handlePrintPdf = () => {
    if (!data) return;
    const esc = (v) =>
      String(v ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    const roleLabel = ROLE_LABEL[role] || role;
    const nowLabel = formatDateTime(new Date().toISOString());

    let detailTitle = "Rekapitulasi Per Layanan";
    let detailHead = "";
    let detailBody = "";

    let kpiCards = [
      { lbl: "Total Paket", val: `${totalShip} Paket`, sub: `${delivered} selesai` },
      { lbl: "Tingkat Keberhasilan", val: `${slaPct}%`, sub: `${s.in_progress_count || 0} proses` },
      { lbl: "Total Berat Tagih", val: `${s.total_weight_kg || 0} kg`, sub: "Akumulasi berat" },
      { lbl: "Total Nilai Transaksi", val: formatRupiah(s.total_revenue || 0), sub: "Semua layanan" },
    ];
    let extraSection = "";

    if (role === "kurir") {
      kpiCards = [
        { lbl: "Paket Ditugaskan", val: `${totalShip} Paket`, sub: `${delivered} selesai diantar` },
        { lbl: "Tingkat Keberhasilan", val: `${slaPct}%`, sub: `${s.in_progress_count || 0} sedang proses` },
        { lbl: "Setoran COD Terkumpul", val: formatRupiah(s.cod_collected || 0), sub: `Tertunda: ${formatRupiah(s.cod_pending || 0)}` },
        { lbl: "Estimasi Insentif Antar", val: formatRupiah(data.estimated_incentive || 0), sub: `${formatRupiah(data.incentive_per_delivery || 3500)} / paket selesai` },
      ];
      detailTitle = "Daftar Paket COD (Setoran Kurir)";
      detailHead = "<tr><th>No. Resi</th><th>Penerima</th><th>Kota Tujuan</th><th>Status</th><th class='num'>Nominal COD</th></tr>";
      detailBody = (data.cod_items || [])
        .map((it) => `<tr><td class='mono'>${esc(it.code)}</td><td>${esc(it.receiver_name || "-")}</td><td>${esc(it.dest_city || "-")}</td><td>${esc(STATUS_LABEL[it.current_status] || it.current_status)}</td><td class='num'><strong>${esc(formatRupiah(it.total_cost || 0))}</strong></td></tr>`)
        .join("") || "<tr><td colspan='5'>Tidak ada transaksi COD pada periode ini.</td></tr>";

      const recRows = (data.recent_deliveries || [])
        .map((d) => `<tr><td class='mono'>${esc(d.code)}</td><td><strong>${esc(d.service_code || "REG")}</strong> (${esc(d.package_type || "Umum")})</td><td>${esc(d.receiver_name || "-")} - ${esc(d.dest_city || "-")}</td><td>${esc(d.payment_status)}</td><td>${esc(STATUS_LABEL[d.current_status] || d.current_status)}</td></tr>`)
        .join("") || "<tr><td colspan='5'>Belum ada riwayat pengantaran.</td></tr>";
      extraSection = `<h3>Riwayat Pengantaran Terbaru</h3><table><thead><tr><th>No. Resi</th><th>Layanan dan Paket</th><th>Penerima dan Tujuan</th><th>Pembayaran</th><th>Status</th></tr></thead><tbody>${recRows}</tbody></table>`;
    } else if (role === "operator") {
      kpiCards = [
        { lbl: "Total Paket Hub", val: `${totalShip} Paket`, sub: `Loket: ${s.loket_count || 0} | Online: ${s.online_count || 0}` },
        { lbl: "Penerimaan Lunas (PAID)", val: formatRupiah(s.paid_total || 0), sub: "Tunai atau QRIS loket" },
        { lbl: "Tagihan COD Berjalan", val: formatRupiah(s.cod_total || 0), sub: `Terkumpul: ${formatRupiah(s.cod_collected || 0)}` },
        { lbl: "Total Berat Ditangani", val: `${s.total_weight_kg || 0} kg`, sub: `Belum bayar: ${formatRupiah(s.unpaid_total || 0)}` },
      ];
      detailTitle = "Rekap Tutup Kasir Berdasarkan Metode Pembayaran";
      detailHead = "<tr><th>Metode Pembayaran</th><th class='num'>Jumlah Paket</th><th class='num'>Total Nominal</th></tr>";
      detailBody = (data.by_payment || [])
        .map((p) => `<tr><td><strong>${esc(p.payment_status)}</strong></td><td class='num'>${p.total} paket</td><td class='num'><strong>${esc(formatRupiah(p.amount || 0))}</strong></td></tr>`)
        .join("") || "<tr><td colspan='3'>Tidak ada transaksi pada periode ini.</td></tr>";
    } else if (role === "supervisor") {
      kpiCards = [
        { lbl: "Total Pengiriman Hub", val: `${totalShip} Paket`, sub: `${s.in_progress_count || 0} dalam proses` },
        { lbl: "SLA Keberhasilan Antar", val: `${slaPct}%`, sub: `${delivered} paket selesai` },
        { lbl: "Gagal Kirim / Retur", val: `${s.failed_or_return_count || 0} Paket`, sub: "Perlu tindak lanjut" },
        { lbl: "Kurir Aktif Bertugas", val: `${(data.courier_performance || []).length} Kurir`, sub: `COD: ${formatRupiah(s.cod_collected || 0)}` },
      ];
      detailTitle = "Rekap Kinerja dan SLA Kurir Hub";
      detailHead = "<tr><th>Kode</th><th>Nama Kurir</th><th>Armada</th><th class='num'>Tugas</th><th class='num'>Selesai</th><th class='num'>Gagal</th><th class='num'>SLA</th><th class='num'>COD Terkumpul</th></tr>";
      detailBody = (data.courier_performance || [])
        .map((c) => {
          const cSla = c.total_assigned ? ((c.delivered / c.total_assigned) * 100).toFixed(1) : "0.0";
          return `<tr><td class='mono'>${esc(c.employee_code)}</td><td>${esc(c.full_name)}</td><td>${esc(c.vehicle_type)}</td><td class='num'>${c.total_assigned}</td><td class='num'>${c.delivered}</td><td class='num'>${c.failed}</td><td class='num'><strong>${cSla}%</strong></td><td class='num'>${esc(formatRupiah(c.cod_collected || 0))}</td></tr>`;
        })
        .join("") || "<tr><td colspan='8'>Belum ada penugasan kurir pada periode ini.</td></tr>";
    } else {
      kpiCards = [
        { lbl: "Total Omzet Pengiriman", val: formatRupiah(s.total_revenue || 0), sub: `Ongkir: ${formatRupiah(s.shipping_revenue || 0)}` },
        { lbl: "Premi Asuransi", val: formatRupiah(s.insurance_revenue || 0), sub: `COD Total: ${formatRupiah(s.cod_total || 0)}` },
        { lbl: "SLA Jawa Timur", val: `${slaPct}%`, sub: `${delivered} dari ${totalShip} selesai` },
        { lbl: "Volume Berat Total", val: `${s.total_weight_kg || 0} kg`, sub: `${(data.by_hub || []).length} hub beroperasi` },
      ];
      detailTitle = "Rekap Omzet, Asuransi, dan Performa Seluruh Hub Jawa Timur";
      detailHead = "<tr><th>Kode</th><th>Nama Hub</th><th class='num'>Paket</th><th class='num'>Selesai</th><th class='num'>SLA</th><th class='num'>Ongkir Murni</th><th class='num'>Asuransi</th><th class='num'>Total Omzet</th></tr>";
      detailBody = (data.by_hub || [])
        .map((h) => {
          const hSla = h.total_shipments ? ((h.delivered / h.total_shipments) * 100).toFixed(1) : "0.0";
          return `<tr><td class='mono'>${esc(h.hub_code)}</td><td>${esc(h.hub_name)}</td><td class='num'>${h.total_shipments}</td><td class='num'>${h.delivered}</td><td class='num'>${hSla}%</td><td class='num'>${esc(formatRupiah(h.shipping_revenue || 0))}</td><td class='num'>${esc(formatRupiah(h.insurance_revenue || 0))}</td><td class='num'><strong>${esc(formatRupiah(h.total_revenue || 0))}</strong></td></tr>`;
        })
        .join("") || "<tr><td colspan='8'>Tidak ada data hub pada periode ini.</td></tr>";
    }

    const kpisHtml = kpiCards
      .map((k) => `<div class="card"><div class="lbl">${esc(k.lbl)}</div><div class="val">${esc(k.val)}</div><div class="sub">${esc(k.sub)}</div></div>`)
      .join("");
    const svcRows = (data.by_service || [])
      .map((sv) => `<tr><td><strong>${esc(sv.service_code)}</strong></td><td class='num'>${sv.total}</td><td class='num'>${sv.delivered}</td><td class='num'>${sv.weight_kg} kg</td><td class='num'>${esc(formatRupiah(sv.total_revenue || 0))}</td></tr>`)
      .join("") || "<tr><td colspan='5'>Tidak ada data.</td></tr>";
    const pkgRows = (data.by_package_type || [])
      .map((pt) => `<tr><td><strong>${esc(pt.package_type)}</strong></td><td class='num'>${pt.total} paket</td></tr>`)
      .join("") || "<tr><td colspan='2'>Tidak ada data.</td></tr>";

    const win = window.open("", "_blank", "width=1080,height=780");
    if (!win) {
      showToast("Pop-up diblokir browser. Izinkan pop-up untuk mencetak PDF.", "error");
      return;
    }
    win.document.write(`<!doctype html>
<html lang="id"><head><meta charset="utf-8" /><title>Laporan ${esc(roleLabel)} - LacakIn</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  body { font-family: "Segoe UI", Arial, sans-serif; color: #0f172a; margin: 0; font-size: 11px; line-height: 1.4; }
  .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #1d4ed8; padding-bottom: 10px; margin-bottom: 12px; }
  .brand { font-size: 18px; font-weight: 800; color: #1d4ed8; }
  .title { font-size: 15px; font-weight: 800; text-align: right; }
  .meta { font-size: 10px; color: #475569; text-align: right; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
  .card { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; background: #f8fafc; }
  .lbl { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 700; }
  .val { font-size: 14px; font-weight: 800; margin-top: 2px; color: #0f172a; }
  .sub { font-size: 9px; color: #64748b; margin-top: 1px; }
  h3 { font-size: 11.5px; margin: 12px 0 6px; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.3px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  th { background: #1e3a8a; color: #fff; text-align: left; padding: 6px 7px; font-size: 9.5px; text-transform: uppercase; }
  td { border-bottom: 1px solid #e2e8f0; padding: 6px 7px; }
  tr:nth-child(even) td { background: #f8fafc; }
  .num { text-align: right; white-space: nowrap; }
  .mono { font-family: Consolas, monospace; font-weight: 700; color: #1d4ed8; }
  .grid2 { display: grid; grid-template-columns: 2fr 1fr; gap: 12px; }
  .footer { margin-top: 14px; padding-top: 8px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; font-size: 9.5px; color: #64748b; }
</style></head>
<body>
  <div class="header">
    <div><div class="brand">LacakIn Logistics</div><div>Laporan Rekapitulasi Peran: ${esc(roleLabel)}</div></div>
    <div><div class="title">LAPORAN REKAPITULASI OPERASIONAL</div><div class="meta">Periode: ${esc(periodLabel)} | Petugas: ${esc(user?.full_name || "-")} | Dicetak: ${esc(nowLabel)}</div></div>
  </div>
  <div class="kpis">${kpisHtml}</div>
  <h3>${esc(detailTitle)}</h3>
  <table><thead>${detailHead}</thead><tbody>${detailBody}</tbody></table>
  ${extraSection}
  <div class="grid2">
    <div>
      <h3>Ringkasan Berdasarkan Layanan</h3>
      <table><thead><tr><th>Layanan</th><th class="num">Total Paket</th><th class="num">Selesai</th><th class="num">Berat Tagih</th><th class="num">Total Nilai</th></tr></thead><tbody>${svcRows}</tbody></table>
    </div>
    <div>
      <h3>Distribusi Jenis Paket</h3>
      <table><thead><tr><th>Jenis Paket</th><th class="num">Jumlah</th></tr></thead><tbody>${pkgRows}</tbody></table>
    </div>
  </div>
  <div class="footer">
    <div>Dokumen laporan otomatis sistem LacakIn v2.</div>
    <div>Pengesahan: ${esc(user?.full_name || "-")} (${esc(roleLabel)})</div>
  </div>
  <script>window.onload = function () { setTimeout(function () { window.print(); }, 200); };</script>
</body></html>`);
    win.document.close();
  };

  const [pdfBusy, setPdfBusy] = useState(false);

  const downloadServerPdf = async () => {
    setPdfBusy(true);
    try {
      const qs = new URLSearchParams();
      if (dateFrom) qs.set("date_from", dateFrom);
      if (dateTo) qs.set("date_to", dateTo);
      const token = getStoredToken();
      const res = await fetch(`/api/reports/export.pdf?${qs.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Gagal mengunduh laporan PDF dari server.");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `laporan-${role}-lacakin-${toIsoDate(new Date())}.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
      showToast("Laporan PDF resmi berhasil diunduh.", "success");
    } catch (e) {
      showToast(e.message || "Gagal mengunduh PDF.", "error");
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-5">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-1">
            <Link to="/" className="hover:text-blue-600 inline-flex items-center text-slate-500 no-underline">
              <FiHome className="h-3.5 w-3.5" />
            </Link>
            <span>/</span>
            <span>Operasional</span>
            <span>/</span>
            <span className="text-slate-700 font-bold">Laporan Rekapitulasi</span>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
              Laporan {ROLE_LABEL[role] || role}
            </h1>
            <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[11px] font-extrabold text-blue-700">
              Scope: {role === "kurir" ? "Pengantaran Saya" : role === "admin" || role === "superadmin" ? "Seluruh Jawa Timur" : "Hub Penugasan"}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {ROLE_SUBTITLE[role] || ROLE_SUBTITLE.operator}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={exportCsv}
            disabled={!data || loading}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
          >
            <FiDownload className="h-4 w-4 text-slate-500" />
            Ekspor CSV
          </button>
          <button
            type="button"
            onClick={handlePrintPdf}
            disabled={!data || loading}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
          >
            <FiPrinter className="h-4 w-4 text-slate-500" />
            Cetak
          </button>
          <button
            type="button"
            onClick={downloadServerPdf}
            disabled={!data || loading || pdfBusy}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-blue-600 px-4 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-blue-700 cursor-pointer disabled:opacity-50"
          >
            <FiDownload className="h-4 w-4" />
            {pdfBusy ? "Membuat PDF..." : "Unduh PDF"}
          </button>
        </div>
      </div>

      {/* Period Filter Bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 mr-1">
            <FiCalendar className="h-4 w-4 text-blue-600" /> Periode:
          </span>
          {[
            { k: "7d", l: "7 Hari Terakhir" },
            { k: "30d", l: "30 Hari Terakhir" },
            { k: "all", l: "Semua Data" },
          ].map((p) => (
            <button
              key={p.k}
              type="button"
              onClick={() => applyPreset(p.k)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${preset === p.k ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
            >
              {p.l}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setPreset("custom");
              setDateFrom(e.target.value);
            }}
            className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-2.5 font-semibold text-slate-700 focus:border-blue-500 focus:outline-none"
          />
          <span className="text-slate-400 font-bold">s.d.</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setPreset("custom");
              setDateTo(e.target.value);
            }}
            className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-2.5 font-semibold text-slate-700 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">
          {error}
        </div>
      )}

      {/* Role-Specific KPI Cards */}
      {role === "kurir" && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={FiPackage} tone="blue" label="Paket Ditugaskan" value={totalShip} sub={`${delivered} selesai diantar`} />
          <KpiCard icon={FiCheckCircle} tone="emerald" label="Tingkat Keberhasilan" value={`${slaPct}%`} sub={`${s.in_progress_count || 0} sedang proses`} />
          <KpiCard icon={FiDollarSign} tone="amber" label="Setoran COD Terkumpul" value={formatRupiah(s.cod_collected || 0)} sub={`Tertunda: ${formatRupiah(s.cod_pending || 0)}`} />
          <KpiCard icon={FiCreditCard} tone="violet" label="Estimasi Insentif Antar" value={formatRupiah(data?.estimated_incentive || 0)} sub={`${formatRupiah(data?.incentive_per_delivery || 3500)} per paket selesai`} />
        </div>
      )}

      {role === "operator" && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={FiPackage} tone="blue" label="Total Paket Hub" value={totalShip} sub={`Loket: ${s.loket_count || 0} | Online: ${s.online_count || 0}`} />
          <KpiCard icon={FiCheckCircle} tone="emerald" label="Penerimaan Lunas (PAID)" value={formatRupiah(s.paid_total || 0)} sub="Setoran tunai atau QRIS loket" />
          <KpiCard icon={FiDollarSign} tone="amber" label="Tagihan COD Berjalan" value={formatRupiah(s.cod_total || 0)} sub={`Terkumpul: ${formatRupiah(s.cod_collected || 0)}`} />
          <KpiCard icon={FiLayers} tone="violet" label="Total Berat Ditangani" value={`${s.total_weight_kg || 0} kg`} sub={`Belum bayar: ${formatRupiah(s.unpaid_total || 0)}`} />
        </div>
      )}

      {role === "supervisor" && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={FiPackage} tone="blue" label="Total Pengiriman Hub" value={totalShip} sub={`${s.in_progress_count || 0} masih dalam proses`} />
          <KpiCard icon={FiCheckCircle} tone="emerald" label="SLA Keberhasilan Antar" value={`${slaPct}%`} sub={`${delivered} paket berstatus selesai`} />
          <KpiCard icon={FiTruck} tone="amber" label="Gagal Kirim / Retur" value={s.failed_or_return_count || 0} sub="Perlu tindak lanjut pengawas" />
          <KpiCard icon={FiUsers} tone="violet" label="Kurir Aktif Bertugas" value={(data?.courier_performance || []).length} sub={`COD Terkumpul: ${formatRupiah(s.cod_collected || 0)}`} />
        </div>
      )}

      {(role === "admin" || role === "superadmin") && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={FiDollarSign} tone="blue" label="Total Omzet Pengiriman" value={formatRupiah(s.total_revenue || 0)} sub={`Ongkir murni: ${formatRupiah(s.shipping_revenue || 0)}`} />
          <KpiCard icon={FiShield} tone="emerald" label="Pendapatan Premi Asuransi" value={formatRupiah(s.insurance_revenue || 0)} sub={`COD Total: ${formatRupiah(s.cod_total || 0)}`} />
          <KpiCard icon={FiCheckCircle} tone="violet" label="SLA Jawa Timur" value={`${slaPct}%`} sub={`${delivered} dari ${totalShip} paket selesai`} />
          <KpiCard icon={FiLayers} tone="amber" label="Volume Berat Total" value={`${s.total_weight_kg || 0} kg`} sub={`${(data?.by_hub || []).length} hub beroperasi`} />
        </div>
      )}

      {/* Role-Specific Primary Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-8 space-y-5">
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FiBarChart2 className="h-4 w-4 text-blue-600" />
                <h2 className="text-sm font-extrabold text-slate-900">
                  {role === "kurir"
                    ? "Daftar Paket COD (Setoran Kurir)"
                    : role === "operator"
                      ? "Rekap Tutup Kasir per Metode Pembayaran"
                      : role === "supervisor"
                        ? "Rapor Kinerja dan SLA Kurir Hub"
                        : "Rekap Omzet, Asuransi, dan SLA Seluruh Hub"}
                </h2>
              </div>
              <span className="text-[11px] font-bold text-slate-400">{periodLabel}</span>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-400">Memuat data rekapitulasi...</div>
              ) : role === "kurir" ? (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                    <tr>
                      <th className="py-3 px-4">No. Resi</th>
                      <th className="py-3 px-3">Penerima</th>
                      <th className="py-3 px-3">Kota Tujuan</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-4 text-right">Nominal COD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(data?.cod_items || []).length ? (
                      data.cod_items.map((it) => (
                        <tr key={it.code} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4 mono font-bold text-blue-600 whitespace-nowrap">{it.code}</td>
                          <td className="py-3 px-3 font-semibold text-slate-800">{it.receiver_name || "-"}</td>
                          <td className="py-3 px-3 text-slate-600">{it.dest_city || "-"}</td>
                          <td className="py-3 px-3"><StatusBadge status={it.current_status} /></td>
                          <td className="py-3 px-4 text-right font-extrabold text-slate-900 whitespace-nowrap">{formatRupiah(it.total_cost || 0)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={5} className="p-8 text-center text-slate-400">Tidak ada paket COD pada periode ini.</td></tr>
                    )}
                  </tbody>
                </table>
              ) : role === "operator" ? (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                    <tr>
                      <th className="py-3 px-4">Metode Pembayaran</th>
                      <th className="py-3 px-3 text-right">Jumlah Paket</th>
                      <th className="py-3 px-4 text-right">Total Nominal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(data?.by_payment || []).map((p) => (
                      <tr key={p.payment_status} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-extrabold text-slate-900">{p.payment_status}</td>
                        <td className="py-3 px-3 text-right font-semibold text-slate-700">{p.total} paket</td>
                        <td className="py-3 px-4 text-right font-extrabold text-blue-700">{formatRupiah(p.amount || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : role === "supervisor" ? (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                    <tr>
                      <th className="py-3 px-4">Kurir</th>
                      <th className="py-3 px-3">Armada</th>
                      <th className="py-3 px-3 text-right">Tugas</th>
                      <th className="py-3 px-3 text-right">Selesai</th>
                      <th className="py-3 px-3 text-right">SLA</th>
                      <th className="py-3 px-4 text-right">COD Terkumpul</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(data?.courier_performance || []).length ? (
                      data.courier_performance.map((c) => {
                        const cSla = c.total_assigned ? ((c.delivered / c.total_assigned) * 100).toFixed(1) : "0.0";
                        return (
                          <tr key={c.id} className="hover:bg-slate-50/70">
                            <td className="py-3 px-4">
                              <div className="font-extrabold text-slate-900">{c.full_name}</div>
                              <div className="text-[11px] text-slate-400 mono">{c.employee_code}</div>
                            </td>
                            <td className="py-3 px-3 text-slate-600">{c.vehicle_type}</td>
                            <td className="py-3 px-3 text-right font-bold">{c.total_assigned}</td>
                            <td className="py-3 px-3 text-right font-bold text-emerald-700">{c.delivered}</td>
                            <td className="py-3 px-3 text-right font-extrabold text-blue-700">{cSla}%</td>
                            <td className="py-3 px-4 text-right font-bold text-slate-900">{formatRupiah(c.cod_collected || 0)}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr><td colSpan={6} className="p-8 text-center text-slate-400">Belum ada penugasan kurir pada periode ini.</td></tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                    <tr>
                      <th className="py-3 px-4">Hub / Cabang</th>
                      <th className="py-3 px-3 text-right">Paket</th>
                      <th className="py-3 px-3 text-right">SLA</th>
                      <th className="py-3 px-3 text-right">Ongkir</th>
                      <th className="py-3 px-3 text-right">Asuransi</th>
                      <th className="py-3 px-4 text-right">Total Omzet</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(data?.by_hub || []).map((h) => {
                      const hSla = h.total_shipments ? ((h.delivered / h.total_shipments) * 100).toFixed(1) : "0.0";
                      return (
                        <tr key={h.hub_code} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4">
                            <div className="font-extrabold text-slate-900">{h.hub_name}</div>
                            <div className="text-[11px] text-slate-400 mono">{h.hub_code}</div>
                          </td>
                          <td className="py-3 px-3 text-right font-bold">{h.total_shipments}</td>
                          <td className="py-3 px-3 text-right font-extrabold text-emerald-700">{hSla}%</td>
                          <td className="py-3 px-3 text-right text-slate-700">{formatRupiah(h.shipping_revenue || 0)}</td>
                          <td className="py-3 px-3 text-right text-slate-700">{formatRupiah(h.insurance_revenue || 0)}</td>
                          <td className="py-3 px-4 text-right font-extrabold text-blue-700 whitespace-nowrap">{formatRupiah(h.total_revenue || 0)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {role === "kurir" && (
            <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FiTruck className="h-4 w-4 text-blue-600" />
                  <h2 className="text-sm font-extrabold text-slate-900">Riwayat Pengantaran Terbaru</h2>
                </div>
                <span className="text-[11px] font-bold text-slate-400">10 tugas terakhir</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                    <tr>
                      <th className="py-3 px-4">No. Resi</th>
                      <th className="py-3 px-3">Layanan dan Paket</th>
                      <th className="py-3 px-3">Penerima dan Tujuan</th>
                      <th className="py-3 px-3">Pembayaran</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(data?.recent_deliveries || []).length ? (
                      data.recent_deliveries.map((d) => (
                        <tr key={d.code} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4 mono font-bold text-blue-600 whitespace-nowrap">{d.code}</td>
                          <td className="py-3 px-3">
                            <span className="font-extrabold text-slate-900">{d.service_code || "REG"}</span>
                            <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">{d.package_type || "Umum"}</span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-800">{d.receiver_name || "-"}</div>
                            <div className="text-[11px] text-slate-500">{d.dest_city || "-"}</div>
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-700 whitespace-nowrap">{d.payment_status}</td>
                          <td className="py-3 px-4"><StatusBadge status={d.current_status} /></td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={5} className="p-6 text-center text-slate-400">Belum ada riwayat pengantaran.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right 4 Cols: Layanan, Jenis Paket, Pembayaran, & Status */}
        <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-20">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900">Rekap Per Layanan</h3>
            <div className="divide-y divide-slate-100 text-xs">
              {(data?.by_service || []).map((sv) => (
                <div key={sv.service_code} className="py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-extrabold text-slate-900">{sv.service_code}</div>
                    <div className="text-[11px] text-slate-500">{sv.total} paket | {sv.weight_kg} kg</div>
                  </div>
                  <div className="text-right font-extrabold text-blue-700 whitespace-nowrap">
                    {formatRupiah(sv.total_revenue || 0)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900">Distribusi Jenis Paket</h3>
            <div className="divide-y divide-slate-100 text-xs">
              {(data?.by_package_type || []).map((pt) => (
                <div key={pt.package_type} className="py-2 flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-700">{pt.package_type}</span>
                  <span className="font-extrabold text-slate-900">{pt.total} paket</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900">Ringkasan Pembayaran dan Kanal</h3>
            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-2 flex items-center justify-between gap-2">
                <span className="text-slate-600 font-semibold">Lunas (PAID)</span>
                <span className="font-extrabold text-emerald-700">{formatRupiah(s.paid_total || 0)}</span>
              </div>
              <div className="py-2 flex items-center justify-between gap-2">
                <span className="text-slate-600 font-semibold">COD Terkumpul</span>
                <span className="font-extrabold text-blue-700">{formatRupiah(s.cod_collected || 0)}</span>
              </div>
              <div className="py-2 flex items-center justify-between gap-2">
                <span className="text-slate-600 font-semibold">COD Tertunda</span>
                <span className="font-extrabold text-amber-700">{formatRupiah(s.cod_pending || 0)}</span>
              </div>
              <div className="py-2 flex items-center justify-between gap-2">
                <span className="text-slate-600 font-semibold">Belum Bayar (UNPAID)</span>
                <span className="font-extrabold text-slate-800">{formatRupiah(s.unpaid_total || 0)}</span>
              </div>
              <div className="pt-2.5 flex items-center justify-between gap-2">
                <span className="text-slate-600 font-semibold">Kanal Order</span>
                <span className="font-bold text-slate-800">
                  Loket: {s.loket_count || 0} | Online: {s.online_count || 0}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900">Ringkasan Status Pengiriman</h3>
            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-2 flex items-center justify-between gap-2">
                <span className="text-slate-600 font-semibold">Selesai Diterima</span>
                <span className="font-extrabold text-emerald-700">{delivered} paket ({slaPct}%)</span>
              </div>
              <div className="py-2 flex items-center justify-between gap-2">
                <span className="text-slate-600 font-semibold">Dalam Proses / Transit</span>
                <span className="font-extrabold text-blue-700">{s.in_progress_count || 0} paket</span>
              </div>
              <div className="py-2 flex items-center justify-between gap-2">
                <span className="text-slate-600 font-semibold">Gagal Kirim / Retur</span>
                <span className="font-extrabold text-rose-700">{s.failed_or_return_count || 0} paket</span>
              </div>
            </div>
          </div>

          {role === "supervisor" && (data?.courier_performance || []).length > 0 && (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3">
              <h3 className="text-sm font-extrabold text-slate-900">Top 3 Kurir Teraktif</h3>
              <div className="space-y-2.5 text-xs">
                {(data.courier_performance || []).slice(0, 3).map((c, idx) => {
                  const cSla = c.total_assigned ? ((c.delivered / c.total_assigned) * 100).toFixed(1) : "0.0";
                  return (
                    <div key={`top-c-${c.id}`} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2">
                      <div className="min-w-0">
                        <div className="font-extrabold text-slate-900 truncate">#{idx + 1} {c.full_name}</div>
                        <div className="text-[11px] text-slate-500">{c.total_assigned} tugas | SLA {cSla}%</div>
                      </div>
                      <div className="font-extrabold text-emerald-700 whitespace-nowrap">{c.delivered} selesai</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(role === "admin" || role === "superadmin") && (data?.by_hub || []).length > 0 && (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3">
              <h3 className="text-sm font-extrabold text-slate-900">Top 3 Hub Omzet Tertinggi</h3>
              <div className="space-y-2.5 text-xs">
                {(data.by_hub || []).slice(0, 3).map((h, idx) => (
                  <div key={`top-${h.hub_code}`} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2">
                    <div className="min-w-0">
                      <div className="font-extrabold text-slate-900 truncate">
                        #{idx + 1} {h.hub_name}
                      </div>
                      <div className="text-[11px] text-slate-500">{h.total_shipments} paket</div>
                    </div>
                    <div className="font-extrabold text-blue-700 whitespace-nowrap">
                      {formatRupiah(h.total_revenue || 0)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function KpiCard({ icon: Icon, tone, label, value, sub }) {
  const tones = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
  };
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-500">{label}</span>
        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${tones[tone] || tones.blue}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div>
        <div className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">{value}</div>
        <div className="text-[11px] font-medium text-slate-500 mt-0.5">{sub}</div>
      </div>
    </div>
  );
}
