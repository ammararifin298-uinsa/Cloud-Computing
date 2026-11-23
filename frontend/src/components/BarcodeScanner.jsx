import React, { useEffect, useRef, useState } from "react";

const NATIVE_FORMATS = ["code_128", "code_39", "ean_13", "qr_code"];

/**
 * Auto-scan barcode/QR from the real camera.
 *  1. Uses native BarcodeDetector when available (fast, zero bundle cost).
 *  2. Otherwise lazy-loads ZXing (@zxing/browser) so it works on every browser.
 * No fake detections are ever generated.
 */
export default function BarcodeScanner({ onDetected, onClose }) {
  const videoRef = useRef(null);
  const cbRef = useRef({ onDetected, onClose });
  const [error, setError] = useState("");
  const [engine, setEngine] = useState("");

  useEffect(() => {
    cbRef.current = { onDetected, onClose };
  });

  useEffect(() => {
    let active = true;
    let stream = null;
    let rafId = null;
    let zxingControls = null;

    const finish = (raw) => {
      if (!active) return;
      active = false;
      cbRef.current.onDetected(String(raw).trim().toUpperCase());
      cbRef.current.onClose();
    };

    const fail = (err) => {
      if (!active) return;
      setError(
        err?.name === "NotAllowedError"
          ? "Izin kamera ditolak. Aktifkan izin kamera di pengaturan browser atau ketik resi secara manual."
          : err?.name === "NotFoundError"
          ? "Kamera tidak ditemukan pada perangkat ini."
          : "Gagal membuka kamera. Pastikan situs dibuka lewat HTTPS atau localhost."
      );
    };

    async function startNative() {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      if (!active) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const video = videoRef.current;
      video.srcObject = stream;
      await video.play();
      setEngine("Pemindai bawaan browser");

      const detector = new window.BarcodeDetector({ formats: NATIVE_FORMATS });
      const tick = async () => {
        if (!active) return;
        try {
          if (video.readyState >= 2) {
            const codes = await detector.detect(video);
            if (codes[0]?.rawValue) return finish(codes[0].rawValue);
          }
        } catch {
          /* frame belum siap, lanjut */
        }
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    }

    async function startZxing() {
      const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
        import("@zxing/browser"),
        import("@zxing/library"),
      ]);
      if (!active) return;
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.EAN_13,
        BarcodeFormat.QR_CODE,
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);
      const reader = new BrowserMultiFormatReader(hints, {
        delayBetweenScanAttempts: 120,
      });
      setEngine("Pemindai ZXing");
      zxingControls = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } }, audio: false },
        videoRef.current,
        (result) => {
          if (result) finish(result.getText());
        }
      );
      if (!active) zxingControls.stop();
    }

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Kamera tidak tersedia. Gunakan HTTPS atau localhost, atau ketik resi secara manual.");
        return;
      }
      try {
        if ("BarcodeDetector" in window) {
          try {
            await startNative();
            return;
          } catch (e) {
            if (e?.name === "NotAllowedError" || e?.name === "NotFoundError") throw e;
            // BarcodeDetector rusak/tidak mendukung format -> fallback ZXing
            if (stream) stream.getTracks().forEach((t) => t.stop());
            if (rafId) cancelAnimationFrame(rafId);
          }
        }
        await startZxing();
      } catch (err) {
        fail(err);
      }
    }

    start();

    return () => {
      active = false;
      if (rafId) cancelAnimationFrame(rafId);
      if (zxingControls) zxingControls.stop();
      if (stream) stream.getTracks().forEach((t) => t.stop());
      const v = videoRef.current;
      if (v?.srcObject) {
        v.srcObject.getTracks?.().forEach((t) => t.stop());
        v.srcObject = null;
      }
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100, background: "rgba(15,23,42,.72)",
        display: "grid", placeItems: "center", padding: 16,
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Pindai Barcode Resi"
    >
      <div className="card-box" style={{ width: "100%", maxWidth: 460 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800 }}>Pindai Barcode Resi</h3>
          <button type="button" className="btn-secondary" onClick={onClose}>Tutup</button>
        </div>

        {error ? (
          <div style={{ background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: 8, padding: 12, fontSize: 13 }}>
            {error}
          </div>
        ) : (
          <>
            <div style={{ position: "relative" }}>
              <video
                ref={videoRef}
                playsInline
                muted
                style={{ width: "100%", borderRadius: 8, background: "#0f172a", maxHeight: 300, objectFit: "cover", display: "block" }}
              />
              <div
                style={{
                  position: "absolute", left: "10%", right: "10%", top: "50%", height: 2,
                  background: "rgba(239,68,68,.85)", boxShadow: "0 0 8px rgba(239,68,68,.9)", pointerEvents: "none",
                }}
              />
            </div>
            <p style={{ marginTop: 10, fontSize: 12.5, color: "var(--muted)", textAlign: "center" }}>
              Arahkan kamera ke barcode atau QR pada label. Terbaca otomatis tanpa menekan tombol.
              {engine && <><br /><small>{engine}</small></>}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
