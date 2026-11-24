import React, { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { FiPrinter } from "react-icons/fi";
import { Button } from "@/components/ui/button";

interface ResiBarcodeProps {
  code: string;
  originCity?: string;
  destCity?: string;
  serviceCode?: string;
  packageType?: string;
  senderName?: string;
  senderPhone?: string;
  senderAddress?: string;
  receiverName?: string;
  receiverPhone?: string;
  receiverAddress?: string;
  weightKg?: number | string;
  totalCost?: number;
  paymentStatus?: string;
  channel?: string;
  createdAt?: string;
  proofUrl?: string;
  showPrint?: boolean;
}

/**
 * Generates a real, scannable Code128 SVG barcode from any shipment resi code.
 * Compatible with our ZXing & native BarcodeDetector camera scanner.
 */
export function ResiBarcode({
  code,
  originCity,
  destCity,
  serviceCode,
  packageType,
  senderName,
  senderPhone,
  senderAddress,
  receiverName,
  receiverPhone,
  receiverAddress,
  weightKg,
  totalCost,
  paymentStatus,
  channel,
  createdAt,
  proofUrl,
  showPrint = false,
}: ResiBarcodeProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !code) return;
    try {
      JsBarcode(svgRef.current, code, {
        format: "CODE128",
        width: 2,
        height: 58,
        displayValue: true,
        font: '"Plus Jakarta Sans", monospace',
        fontSize: 13,
        fontOptions: "bold",
        margin: 8,
        background: "#ffffff",
        lineColor: "#0f172a",
      });
    } catch {
      /* ignore invalid characters */
    }
  }, [code]);

  const handlePrint = () => {
    const svgHtml = svgRef.current?.outerHTML || "";
    const esc = (v?: string | number | null) =>
      String(v ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    const dateStr = createdAt
      ? new Date(createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })
      : new Date().toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
    const costStr =
      typeof totalCost === "number" && totalCost > 0
        ? `Rp ${Number(totalCost).toLocaleString("id-ID")}`
        : "-";
    const payLabel =
      paymentStatus === "PAID"
        ? "LUNAS"
        : paymentStatus === "COD"
        ? "COD (Bayar di Tempat)"
        : paymentStatus === "UNPAID"
        ? "Bayar Saat Pickup"
        : paymentStatus || "-";

    const w = window.open("", "_blank", "width=520,height=720");
    if (!w) return;
    w.document.write(`<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8" /><title>Resi Pengiriman ${esc(code)}</title>
<style>
  @page { size: 105mm 148mm; margin: 6mm; }
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Arial, sans-serif; padding: 12px; color: #0f172a; margin: 0; font-size: 11px; line-height: 1.4; }
  .label { border: 2px solid #0f172a; border-radius: 10px; padding: 12px; max-width: 390px; margin: auto; background: #fff; }
  .head { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 8px; }
  .brand { font-size: 17px; font-weight: 800; color: #1d4ed8; letter-spacing: -0.3px; }
  .brand-sub { font-size: 9px; color: #475569; }
  .badges { display: flex; gap: 4px; align-items: center; }
  .svc { background: #0f172a; color: #fff; padding: 3px 8px; border-radius: 5px; font-weight: 800; font-size: 11px; }
  .pkg { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; padding: 2px 7px; border-radius: 5px; font-weight: 700; font-size: 10px; }
  .bc { text-align: center; border-bottom: 1px dashed #94a3b8; padding-bottom: 6px; margin-bottom: 8px; }
  svg { max-width: 100%; height: auto; }
  .route { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; font-weight: 700; font-size: 11px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
  .box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 7px 8px; min-height: 70px; }
  .box-title { font-size: 9px; font-weight: 800; text-transform: uppercase; color: #1d4ed8; margin-bottom: 3px; letter-spacing: 0.4px; }
  .box-name { font-weight: 800; font-size: 11px; color: #0f172a; }
  .box-phone { font-size: 10px; font-weight: 600; color: #334155; }
  .box-addr { font-size: 9.5px; color: #475569; margin-top: 2px; word-break: break-word; }
  .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; padding: 6px 0; margin-bottom: 8px; font-size: 10px; }
  .meta-lbl { font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 700; }
  .meta-val { font-weight: 800; color: #0f172a; margin-top: 1px; }
  .foot { display: flex; justify-content: space-between; font-size: 9px; color: #64748b; }
</style></head>
<body>
  <div class="label">
    <div class="head">
      <div>
        <div class="brand">LacakIn Logistics</div>
        <div class="brand-sub">Resi Pengiriman Resmi Jawa Timur</div>
      </div>
      <div class="badges">
        ${packageType ? `<span class="pkg">${esc(packageType)}</span>` : ""}
        <span class="svc">${esc(serviceCode || "REG")}</span>
      </div>
    </div>
    <div class="bc">${svgHtml}</div>
    ${
      originCity || destCity
        ? `<div class="route"><span>Asal: ${esc(originCity || "-")}</span><span>&rarr;</span><span>Tujuan: ${esc(destCity || "-")}</span></div>`
        : ""
    }
    <div class="grid2">
      <div class="box">
        <div class="box-title">Pengirim</div>
        <div class="box-name">${esc(senderName || "Pengirim Terdaftar")}</div>
        ${senderPhone ? `<div class="box-phone">${esc(senderPhone)}</div>` : ""}
        <div class="box-addr">${esc(senderAddress || (originCity ? `${originCity}, Jawa Timur` : "-"))}</div>
      </div>
      <div class="box">
        <div class="box-title">Penerima</div>
        <div class="box-name">${esc(receiverName || "Penerima Terdaftar")}</div>
        ${receiverPhone ? `<div class="box-phone">${esc(receiverPhone)}</div>` : ""}
        <div class="box-addr">${esc(receiverAddress || (destCity ? `${destCity}, Jawa Timur` : "-"))}</div>
      </div>
    </div>
    <div class="meta-grid">
      <div><div class="meta-lbl">Berat</div><div class="meta-val">${esc(weightKg ? `${weightKg} kg` : "-")}</div></div>
      <div><div class="meta-lbl">Pembayaran</div><div class="meta-val">${esc(payLabel)}</div></div>
      <div><div class="meta-lbl">Total Biaya</div><div class="meta-val">${esc(costStr)}</div></div>
    </div>
    <div class="foot">
      <span>Kanal: ${esc(channel || "LOKET")}</span>
      <span>${esc(dateStr)}</span>
    </div>
    ${
      proofUrl
        ? `<div style="margin-top:8px;padding-top:6px;border-top:1px dashed #cbd5e1;text-align:center;">
             <div style="font-size:8.5px;font-weight:800;color:#1d4ed8;text-transform:uppercase;margin-bottom:4px;">Foto Bukti Pengiriman</div>
             <img src="${esc(proofUrl)}" alt="Bukti pengiriman" style="max-height:110px;max-width:100%;border-radius:6px;border:1px solid #cbd5e1;object-fit:contain;" />
           </div>`
        : ""
    }
    <div style="text-align:center;font-size:8.5px;font-weight:700;color:#1d4ed8;margin-top:6px;padding-top:4px;border-top:1px dashed #e2e8f0;">
      LacakIn: PastiIn Sampainya, TenangIn Hatinya.
    </div>
  </div>
  <script>
    window.onload = function () {
      var imgs = Array.prototype.slice.call(document.images || []);
      Promise.all(imgs.map(function (im) {
        if (im.complete) return Promise.resolve();
        return new Promise(function (res) { im.onload = res; im.onerror = res; });
      })).then(function () { setTimeout(function () { window.print(); }, 200); });
    };
  </script>
</body></html>`);
    w.document.close();
  };

  if (!code) return null;

  return (
    <div className="inline-flex flex-col items-center gap-2 rounded-xl border border-border bg-white p-3 shadow-xs">
      <svg ref={svgRef} className="max-w-full h-auto" aria-label={`Barcode resi ${code}`} />
      {showPrint && (
        <Button type="button" variant="outline" size="sm" onClick={handlePrint} className="w-full min-h-[38px]">
          <FiPrinter className="h-4 w-4" />
          Cetak Resi Lengkap
        </Button>
      )}
    </div>
  );
}
