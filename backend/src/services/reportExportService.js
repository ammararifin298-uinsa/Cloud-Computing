import PDFDocument from "pdfkit";
import { withReadClient } from "../infra/db.js";

const STATUS_LABEL = {
  BOOKED: "Pesanan Dibuat",
  DITERIMA: "Diterima di Loket",
  DISIMPAN: "Disimpan di Gudang",
  DALAM_PERJALANAN: "Dalam Perjalanan",
  DIKIRIM: "Dikirim Kurir",
  GAGAL_KIRIM: "Gagal Kirim",
  RETUR: "Retur ke Pengirim",
  BATAL: "Dibatalkan",
  SELESAI: "Selesai Diterima",
};

const ROLE_LABEL = {
  superadmin: "Superadmin",
  admin: "Admin",
  supervisor: "Supervisor",
  operator: "Operator",
  kurir: "Kurir",
};

function formatRupiah(val) {
  return `Rp ${Number(val || 0).toLocaleString("id-ID")}`;
}

function formatWib(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(iso);
  }
}

function applyScope(where, params, actor, scope = null) {
  if (!actor) return;
  if (actor.role === "kurir") {
    params.push(actor.id);
    const idx = params.length;
    if (scope === "mine") {
      where.push(`sa.courier_id = $${idx}`);
    } else {
      where.push(`(sa.courier_id = $${idx} OR (s.current_status = 'BOOKED' AND sa.id IS NULL))`);
    }
    return;
  }
  if ((actor.role === "operator" || actor.role === "supervisor") && actor.hub_id) {
    params.push(actor.hub_id);
    const idx = params.length;
    where.push(
      `(s.origin_hub_id = $${idx} OR s.dest_hub_id = $${idx} OR sa.hub_id = $${idx} OR EXISTS (SELECT 1 FROM tracking_events te WHERE te.shipment_code = s.code AND te.hub_id = $${idx}))`
    );
  }
}

function csvCell(v) {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

export class ReportExportService {
  static async exportShipmentsCsv(
    { status = null, serviceCode = null, q = null, courierId = null, hubId = null, scope = null } = {},
    actor
  ) {
    const rows = await withReadClient(async (client) => {
      const where = ["s.deleted_at IS NULL"];
      const params = [];
      applyScope(where, params, actor, scope);

      if (status) {
        params.push(String(status).trim().toUpperCase());
        where.push(`s.current_status = $${params.length}`);
      }
      if (serviceCode) {
        params.push(String(serviceCode).trim().toUpperCase());
        where.push(`s.service_code = $${params.length}`);
      }
      if (q) {
        params.push(`%${String(q).trim()}%`);
        const idx = params.length;
        where.push(`(s.code ILIKE $${idx} OR s.current_location ILIKE $${idx})`);
      }
      if (courierId === "UNASSIGNED") {
        where.push("sa.courier_id IS NULL");
      } else if (courierId) {
        params.push(Number(courierId));
        where.push(`sa.courier_id = $${params.length}`);
      }
      if (hubId) {
        params.push(Number(hubId));
        const idx = params.length;
        where.push(`(s.origin_hub_id = $${idx} OR s.dest_hub_id = $${idx} OR sa.hub_id = $${idx})`);
      }

      const res = await client.query(
        `SELECT s.code, s.current_status, s.current_location, s.service_code, s.package_type,
                s.total_cost, s.payment_status, s.channel, s.updated_at,
                oh.code AS origin_hub_code, oh.name AS origin_hub_name,
                dh.code AS dest_hub_code, dh.name AS dest_hub_name,
                cu.employee_code AS assigned_courier_code, cu.full_name AS assigned_courier_name,
                le.actor_name AS last_actor_name, le.actor_code AS last_actor_code
         FROM shipments s
         LEFT JOIN hubs oh ON oh.id = s.origin_hub_id
         LEFT JOIN hubs dh ON dh.id = s.dest_hub_id
         LEFT JOIN shipment_assignments sa ON sa.shipment_code = s.code AND sa.is_active = TRUE
         LEFT JOIN users cu ON cu.id = sa.courier_id
         LEFT JOIN LATERAL (
           SELECT u.full_name AS actor_name, u.employee_code AS actor_code
           FROM tracking_events te
           LEFT JOIN users u ON u.id = te.actor_id
           WHERE te.shipment_code = s.code
           ORDER BY te.id DESC
           LIMIT 1
         ) le ON TRUE
         WHERE ${where.join(" AND ")}
         ORDER BY s.updated_at DESC, s.code DESC
         LIMIT 5000`,
        params
      );
      return res.rows;
    });

    const totalRevenue = rows.reduce((acc, r) => acc + Number(r.total_cost || 0), 0);
    const headerMeta = [
      ["LAPORAN DAFTAR PENGIRIMAN - LACAKIN LOGISTICS"],
      ["Tanggal Ekspor (WIB)", formatWib(new Date().toISOString()), "Petugas", actor?.full_name || "Sistem"],
      ["Total Paket", rows.length, "Total Biaya", formatRupiah(totalRevenue)],
      [],
    ];
    const tableHeaders = [
      "No.",
      "No. Resi",
      "Layanan",
      "Jenis Paket",
      "Status",
      "Lokasi Saat Ini",
      "Gudang Asal",
      "Gudang Tujuan",
      "Kurir Bertugas",
      "Petugas Terakhir",
      "Pembayaran",
      "Kanal",
      "Total Biaya (Rp)",
      "Diperbarui (WIB)",
    ];
    const dataRows = rows.map((r, idx) => [
      idx + 1,
      r.code,
      (r.service_code || "REG").toUpperCase(),
      r.package_type || "Umum",
      STATUS_LABEL[r.current_status] || r.current_status,
      r.current_location || "-",
      r.origin_hub_name || r.origin_hub_code || "-",
      r.dest_hub_name || r.dest_hub_code || "-",
      r.assigned_courier_name
        ? `${r.assigned_courier_name}${r.assigned_courier_code ? ` (${r.assigned_courier_code})` : ""}`
        : "Belum ditugaskan",
      r.last_actor_name
        ? `${r.last_actor_name}${r.last_actor_code ? ` (${r.last_actor_code})` : ""}`
        : "-",
      r.payment_status || "-",
      r.channel || "-",
      Number(r.total_cost || 0),
      formatWib(r.updated_at),
    ]);

    const csvBody = [...headerMeta, tableHeaders, ...dataRows]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n");

    return "\uFEFF" + csvBody;
  }

  static buildRoleReportPdfBuffer(reportData, actor) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 36 });
      const chunks = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const pageW = doc.page.width - 72;
      const role = reportData.role || actor?.role || "operator";
      const roleLabel = ROLE_LABEL[role] || role;
      const s = reportData.summary || {};
      const totalShip = Number(s.total_shipments || 0);
      const delivered = Number(s.delivered_count || 0);
      const slaPct = totalShip > 0 ? ((delivered / totalShip) * 100).toFixed(1) : "0.0";
      const periodLabel =
        reportData.date_from && reportData.date_to
          ? `${reportData.date_from} s.d. ${reportData.date_to}`
          : "Seluruh Periode";

      // Header Banner
      doc.rect(36, 32, pageW, 54).fill("#1e3a8a");
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(16).text("LacakIn Logistics", 50, 44);
      doc.fillColor("#bfdbfe").font("Helvetica").fontSize(9).text("LacakIn: PastiIn Sampainya, TenangIn Hatinya.", 50, 64);

      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(12).text(`LAPORAN REKAPITULASI (${roleLabel.toUpperCase()})`, 36, 44, {
        width: pageW - 14,
        align: "right",
      });
      doc.fillColor("#dbeafe").font("Helvetica").fontSize(8.5).text(
        `Periode: ${periodLabel}  |  Petugas: ${actor?.full_name || "-"}  |  Dicetak: ${formatWib(new Date().toISOString())}`,
        36,
        64,
        { width: pageW - 14, align: "right" }
      );

      // 4 KPI Cards
      let kpis = [
        { lbl: "TOTAL PAKET", val: `${totalShip} Paket`, sub: `${delivered} selesai` },
        { lbl: "TINGKAT KEBERHASILAN", val: `${slaPct}%`, sub: `${s.in_progress_count || 0} proses` },
        { lbl: "TOTAL BERAT TAGIH", val: `${s.total_weight_kg || 0} kg`, sub: "Akumulasi berat" },
        { lbl: "TOTAL NILAI", val: formatRupiah(s.total_revenue || 0), sub: "Semua layanan" },
      ];
      if (role === "kurir") {
        kpis = [
          { lbl: "PAKET DITUGASKAN", val: `${totalShip} Paket`, sub: `${delivered} selesai diantar` },
          { lbl: "TINGKAT KEBERHASILAN", val: `${slaPct}%`, sub: `${s.in_progress_count || 0} sedang proses` },
          { lbl: "SETORAN COD TERKUMPUL", val: formatRupiah(s.cod_collected || 0), sub: `Tertunda: ${formatRupiah(s.cod_pending || 0)}` },
          { lbl: "ESTIMASI INSENTIF", val: formatRupiah(reportData.estimated_incentive || 0), sub: `${formatRupiah(reportData.incentive_per_delivery || 3500)} / selesai` },
        ];
      } else if (role === "operator") {
        kpis = [
          { lbl: "TOTAL PAKET HUB", val: `${totalShip} Paket`, sub: `Loket: ${s.loket_count || 0} | Online: ${s.online_count || 0}` },
          { lbl: "PENERIMAAN LUNAS", val: formatRupiah(s.paid_total || 0), sub: "Tunai / QRIS loket" },
          { lbl: "TAGIHAN COD", val: formatRupiah(s.cod_total || 0), sub: `Terkumpul: ${formatRupiah(s.cod_collected || 0)}` },
          { lbl: "BERAT DITANGANI", val: `${s.total_weight_kg || 0} kg`, sub: `Belum bayar: ${formatRupiah(s.unpaid_total || 0)}` },
        ];
      } else if (role === "supervisor") {
        kpis = [
          { lbl: "TOTAL PENGIRIMAN HUB", val: `${totalShip} Paket`, sub: `${s.in_progress_count || 0} dalam proses` },
          { lbl: "SLA KEBERHASILAN", val: `${slaPct}%`, sub: `${delivered} selesai` },
          { lbl: "GAGAL / RETUR", val: `${s.failed_or_return_count || 0} Paket`, sub: "Perlu tindak lanjut" },
          { lbl: "KURIR AKTIF", val: `${(reportData.courier_performance || []).length} Kurir`, sub: `COD: ${formatRupiah(s.cod_collected || 0)}` },
        ];
      } else {
        kpis = [
          { lbl: "TOTAL OMZET", val: formatRupiah(s.total_revenue || 0), sub: `Ongkir: ${formatRupiah(s.shipping_revenue || 0)}` },
          { lbl: "PREMI ASURANSI", val: formatRupiah(s.insurance_revenue || 0), sub: `COD: ${formatRupiah(s.cod_total || 0)}` },
          { lbl: "SLA JATIM", val: `${slaPct}%`, sub: `${delivered} / ${totalShip} selesai` },
          { lbl: "VOLUME BERAT", val: `${s.total_weight_kg || 0} kg`, sub: `${(reportData.by_hub || []).length} hub aktif` },
        ];
      }

      const cardGap = 10;
      const cardW = (pageW - cardGap * 3) / 4;
      kpis.forEach((k, idx) => {
        const x = 36 + idx * (cardW + cardGap);
        doc.roundedRect(x, 100, cardW, 54, 6).fillAndStroke("#f8fafc", "#cbd5e1");
        doc.fillColor("#64748b").font("Helvetica-Bold").fontSize(7.5).text(k.lbl, x + 10, 109, { width: cardW - 20 });
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(13).text(k.val, x + 10, 121, { width: cardW - 20 });
        doc.fillColor("#64748b").font("Helvetica").fontSize(7.5).text(k.sub, x + 10, 139, { width: cardW - 20 });
      });

      const drawTable = (title, headers, rows, colWidths, startY) => {
        let y = startY;
        if (y > doc.page.height - 95) {
          doc.addPage({ size: "A4", layout: "landscape", margin: 36 });
          y = 36;
        }
        doc.fillColor("#1e3a8a").font("Helvetica-Bold").fontSize(10).text(title, 36, y);
        y += 16;

        // Table Header
        doc.rect(36, y, pageW, 20).fill("#1e3a8a");
        let cx = 36;
        headers.forEach((h, i) => {
          doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(8).text(h.label, cx + 6, y + 6, {
            width: colWidths[i] - 12,
            align: h.align || "left",
          });
          cx += colWidths[i];
        });
        y += 20;

        if (!rows.length) {
          doc.rect(36, y, pageW, 20).fillAndStroke("#ffffff", "#e2e8f0");
          doc.fillColor("#64748b").font("Helvetica").fontSize(8.5).text("Tidak ada data pada periode ini.", 44, y + 6);
          return y + 28;
        }

        rows.forEach((row, rIdx) => {
          if (y > doc.page.height - 56) {
            doc.addPage({ size: "A4", layout: "landscape", margin: 36 });
            y = 36;
          }
          const bg = rIdx % 2 === 1 ? "#f8fafc" : "#ffffff";
          doc.rect(36, y, pageW, 19).fillAndStroke(bg, "#e2e8f0");
          let rx = 36;
          row.forEach((cell, i) => {
            doc.fillColor("#0f172a").font("Helvetica").fontSize(8).text(String(cell ?? "-"), rx + 6, y + 5.5, {
              width: colWidths[i] - 12,
              align: headers[i].align || "left",
              ellipsis: true,
              lineBreak: false,
            });
            rx += colWidths[i];
          });
          y += 19;
        });

        return y + 14;
      };

      let curY = 168;
      if (role === "kurir") {
        curY = drawTable(
          "DAFTAR PAKET COD (SETORAN KURIR)",
          [
            { label: "No. Resi" },
            { label: "Penerima" },
            { label: "Kota Tujuan" },
            { label: "Status" },
            { label: "Nominal COD", align: "right" },
          ],
          (reportData.cod_items || []).map((it) => [
            it.code,
            it.receiver_name || "-",
            it.dest_city || "-",
            STATUS_LABEL[it.current_status] || it.current_status,
            formatRupiah(it.total_cost || 0),
          ]),
          [170, 170, 130, 160, pageW - 630],
          curY
        );
        curY = drawTable(
          "RIWAYAT PENGANTARAN TERBARU",
          [
            { label: "No. Resi" },
            { label: "Layanan dan Paket" },
            { label: "Penerima dan Tujuan" },
            { label: "Pembayaran" },
            { label: "Status" },
          ],
          (reportData.recent_deliveries || []).map((d) => [
            d.code,
            `${d.service_code || "REG"} (${d.package_type || "Umum"})`,
            `${d.receiver_name || "-"} - ${d.dest_city || "-"}`,
            d.payment_status,
            STATUS_LABEL[d.current_status] || d.current_status,
          ]),
          [170, 150, 210, 90, pageW - 620],
          curY
        );
      } else if (role === "operator") {
        curY = drawTable(
          "REKAP TUTUP KASIR BERDASARKAN METODE PEMBAYARAN",
          [
            { label: "Metode Pembayaran" },
            { label: "Jumlah Paket", align: "right" },
            { label: "Total Nominal", align: "right" },
          ],
          (reportData.by_payment || []).map((p) => [
            p.payment_status,
            `${p.total} paket`,
            formatRupiah(p.amount || 0),
          ]),
          [300, 180, pageW - 480],
          curY
        );
      } else if (role === "supervisor") {
        curY = drawTable(
          "RAPOR KINERJA DAN SLA KURIR HUB",
          [
            { label: "Kode" },
            { label: "Nama Kurir" },
            { label: "Armada" },
            { label: "Tugas", align: "right" },
            { label: "Selesai", align: "right" },
            { label: "SLA", align: "right" },
            { label: "COD Terkumpul", align: "right" },
          ],
          (reportData.courier_performance || []).map((c) => {
            const cSla = c.total_assigned ? ((c.delivered / c.total_assigned) * 100).toFixed(1) : "0.0";
            return [
              c.employee_code,
              c.full_name,
              c.vehicle_type,
              c.total_assigned,
              c.delivered,
              `${cSla}%`,
              formatRupiah(c.cod_collected || 0),
            ];
          }),
          [85, 165, 145, 65, 65, 70, pageW - 595],
          curY
        );
      } else {
        curY = drawTable(
          "REKAP OMZET, ASURANSI, DAN PERFORMA SELURUH HUB JAWA TIMUR",
          [
            { label: "Kode" },
            { label: "Nama Hub" },
            { label: "Paket", align: "right" },
            { label: "Selesai", align: "right" },
            { label: "SLA", align: "right" },
            { label: "Ongkir Murni", align: "right" },
            { label: "Asuransi", align: "right" },
            { label: "Total Omzet", align: "right" },
          ],
          (reportData.by_hub || []).map((h) => {
            const hSla = h.total_shipments ? ((h.delivered / h.total_shipments) * 100).toFixed(1) : "0.0";
            return [
              h.hub_code,
              h.hub_name,
              h.total_shipments,
              h.delivered,
              `${hSla}%`,
              formatRupiah(h.shipping_revenue || 0),
              formatRupiah(h.insurance_revenue || 0),
              formatRupiah(h.total_revenue || 0),
            ];
          }),
          [75, 200, 55, 60, 60, 105, 95, pageW - 650],
          curY
        );
      }

      // Rekap Per Layanan
      drawTable(
        "RINGKASAN BERDASARKAN LAYANAN",
        [
          { label: "Layanan" },
          { label: "Total Paket", align: "right" },
          { label: "Selesai", align: "right" },
          { label: "Berat Tagih", align: "right" },
          { label: "Total Nilai", align: "right" },
        ],
        (reportData.by_service || []).map((sv) => [
          sv.service_code,
          `${sv.total} paket`,
          `${sv.delivered} paket`,
          `${sv.weight_kg} kg`,
          formatRupiah(sv.total_revenue || 0),
        ]),
        [180, 130, 130, 130, pageW - 570],
        curY
      );

      doc.end();
    });
  }
}
