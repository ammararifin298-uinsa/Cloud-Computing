import React, { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { FiPrinter } from "react-icons/fi";
import { Button } from "@/components/ui/button";

interface ResiBarcodeProps {
  code: string;
  originCity?: string;
  destCity?: string;
  serviceCode?: string;
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
    const w = window.open("", "_blank", "width=460,height=520");
    if (!w) return;
    w.document.write(`<!DOCTYPE html>
<html lang="id"><head><title>Label Resi ${code}</title>
<style>
  body { font-family: system-ui, sans-serif; padding: 20px; color: #0f172a; }
  .label { border: 2px solid #0f172a; border-radius: 12px; padding: 18px; max-width: 360px; margin: auto; }
  .head { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #cbd5e1; padding-bottom: 10px; margin-bottom: 12px; }
  .brand { font-size: 18px; font-weight: 800; color: #0b72d9; }
  .svc { background: #0f172a; color: #fff; padding: 3px 10px; border-radius: 6px; font-weight: 700; font-size: 12px; }
  .route { font-size: 13px; margin-bottom: 12px; }
  .bc { text-align: center; }
  svg { max-width: 100%; height: auto; }
</style></head>
<body>
  <div class="label">
    <div class="head"><span class="brand">LacakIn</span><span class="svc">${serviceCode || "REG"}</span></div>
    ${originCity && destCity ? `<div class="route"><strong>Rute:</strong> ${originCity} &rarr; ${destCity}</div>` : ""}
    <div class="bc">${svgHtml}</div>
  </div>
  <script>window.onload = () => { window.print(); };</script>
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
          Cetak Label Barcode
        </Button>
      )}
    </div>
  );
}
