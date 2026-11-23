import React, { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import BarcodeScanner from "../components/BarcodeScanner.jsx";
import { Icon } from "../components/Icons.jsx";
import { ResponsiveSlider } from "@/components/shared/ResponsiveSlider";
import { ResiBarcode } from "@/components/shared/ResiBarcode";
import StatusBadge from "../components/StatusBadge.jsx";
import { apiFetch, formatDateTime } from "../lib/api.js";

export default function LacakPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCode = (searchParams.get("code") || "").trim().toUpperCase();

  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  const performTrack = useCallback(async (targetCode) => {
    const clean = String(targetCode || "").trim().toUpperCase();
    if (!clean) {
      setError("Masukkan nomor resi terlebih dahulu.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await apiFetch(`/api/shipments/${encodeURIComponent(clean)}/events`);
      setResult(data);
    } catch (err) {
      setError(err.message || "Nomor resi tidak ditemukan.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialCode) {
      setCode(initialCode);
      performTrack(initialCode);
    }
  }, [initialCode, performTrack]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (!clean) {
      setError("Masukkan nomor resi yang ingin dilacak.");
      return;
    }
    setSearchParams({ code: clean });
    performTrack(clean);
  };

  const handleDetected = (scanned) => {
    setCode(scanned);
    setSearchParams({ code: scanned });
    performTrack(scanned);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="space-y-6"
    >
      <section className="lacak-hero">
        <div className="hero-badge">
          <Icon name="truck" size={14} />
          Jaringan Pengiriman 38 Kabupaten dan Kota Jawa Timur
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.18, letterSpacing: "-0.7px", maxWidth: 660 }}>
          Lacak Posisi Paket Anda Secara Langsung dan Akurat
        </h1>
        <p style={{ marginTop: 10, opacity: 0.9, fontSize: 15, maxWidth: 600 }}>
          Pantau setiap perpindahan gerai, estimasi pengiriman, dan bukti serah terima paket hanya dengan memasukkan nomor resi Anda.
        </p>

        <form className="hero-search-bar" onSubmit={handleSubmit}>
          <input
            type="text"
            className="mono"
            style={{ textTransform: "uppercase" }}
            placeholder="Ketik atau pindai nomor resi pengiriman..."
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            autoComplete="off"
          />
          <button
            type="button"
            className="btn-secondary"
            style={{ border: "1px solid var(--line)" }}
            onClick={() => setScannerOpen(true)}
            title="Pindai Barcode Kamera"
          >
            <Icon name="scan" size={17} />
            Pindai
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            <Icon name="search" size={16} />
            {loading ? "Mencari..." : "Lacak Paket"}
          </button>
        </form>

        <div style={{ display: "flex", gap: 16, marginTop: 18, fontSize: 13, opacity: 0.9, flexWrap: "wrap" }}>
          <Link to="/tarif" style={{ color: "#fff", textDecoration: "underline", fontWeight: 600 }}>
            Hitung Ongkos Kirim Jawa Timur →
          </Link>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="card-box"
          style={{
            marginBottom: 20,
            background: "#fef2f2",
            borderColor: "#fecaca",
            color: "#991b1b",
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}

      {result ? (
        <div className="grid-2" style={{ alignItems: "start" }}>
          <div className="card-box">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>
                  Nomor Resi
                </div>
                <div className="mono" style={{ fontSize: 22, fontWeight: 800, color: "var(--brand)" }}>
                  {result.shipment.code}
                </div>
              </div>
              <StatusBadge status={result.shipment.current_status} />
            </div>

            <div style={{ marginBottom: 16, textAlign: "center" }}>
              <ResiBarcode
                code={result.shipment.code}
                originCity={result.shipment.origin_city}
                destCity={result.shipment.dest_city}
                serviceCode={result.shipment.service_code}
                showPrint
              />
            </div>

            <div className="grid-2" style={{ gap: 12, padding: 14, borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--line)" }}>
              <div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Lokasi Terakhir</div>
                <div style={{ fontWeight: 700, marginTop: 2 }}>{result.shipment.current_location}</div>
              </div>
              <div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Pembaruan Terakhir</div>
                <div style={{ fontWeight: 700, marginTop: 2 }}>{formatDateTime(result.shipment.updated_at)}</div>
              </div>
              {result.shipment.origin_city && (
                <div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Wilayah Asal</div>
                  <div style={{ fontWeight: 700, marginTop: 2 }}>{result.shipment.origin_city}</div>
                </div>
              )}
              {result.shipment.dest_city && (
                <div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Wilayah Tujuan</div>
                  <div style={{ fontWeight: 700, marginTop: 2 }}>{result.shipment.dest_city}</div>
                </div>
              )}
              {result.shipment.service_name && (
                <div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Layanan</div>
                  <div style={{ fontWeight: 700, marginTop: 2 }}>{result.shipment.service_name}</div>
                </div>
              )}
              {result.shipment.chargeable_weight_kg && (
                <div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Berat Tercatat</div>
                  <div style={{ fontWeight: 700, marginTop: 2 }}>{result.shipment.chargeable_weight_kg} kg</div>
                </div>
              )}
            </div>

            {result.proofs?.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <h3 style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 10 }}>Bukti Dokumentasi Pengiriman</h3>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {result.proofs.map((p) => (
                    <a
                      key={p.id}
                      href={p.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ display: "block", border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden", width: 130 }}
                    >
                      <img src={p.url} alt="Bukti pengiriman" style={{ width: "100%", height: 96, objectFit: "cover", display: "block" }} />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="card-box">
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>Riwayat Perjalanan Paket</h3>
            {result.events?.length ? (
              <ul className="tl-list">
                {result.events.map((ev) => (
                  <li key={ev.id} className="tl-item">
                    <span className="tl-dot" />
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <StatusBadge status={ev.status} />
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>{formatDateTime(ev.recorded_at)}</span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14, marginTop: 5 }}>{ev.location}</div>
                    {ev.notes && <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>{ev.notes}</div>}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: "var(--muted)", fontSize: 13.5 }}>Belum ada catatan perjalanan.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <ResponsiveSlider />
          <div className="grid-4">
            <div className="kpi-card">
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>Transparan</div>
                <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
                  Setiap perpindahan gerai tercatat lengkap beserta waktu dan lokasi.
                </div>
              </div>
              <div className="kpi-icon kpi-blue"><Icon name="map-pin" /></div>
            </div>
            <div className="kpi-card">
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>Bukti Foto Asli</div>
                <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
                  Dilengkapi dokumentasi foto saat paket diserahkan kepada penerima.
                </div>
              </div>
              <div className="kpi-icon kpi-teal"><Icon name="camera" /></div>
            </div>
            <div className="kpi-card">
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>Tarif Jelas</div>
                <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
                  Hitung estimasi ongkos kirim Reguler, Ekspres, dan Sameday secara instan.
                </div>
              </div>
              <div className="kpi-icon kpi-amber"><Icon name="calculator" /></div>
            </div>
            <div className="kpi-card">
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>Privasi Terjaga</div>
                <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
                  Data pribadi pengirim dan penerima terlindungi pada pelacakan publik.
                </div>
              </div>
              <div className="kpi-icon kpi-green"><Icon name="shield" /></div>
            </div>
          </div>
        </div>
      )}

      {scannerOpen && (
        <BarcodeScanner onDetected={handleDetected} onClose={() => setScannerOpen(false)} />
      )}
    </motion.div>
  );
}
