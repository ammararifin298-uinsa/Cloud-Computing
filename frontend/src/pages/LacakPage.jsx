import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { EastJavaMap } from "@/components/shared/EastJavaMap";
import { motion } from "motion/react";
import {
  FiArrowRight,
  FiBox,
  FiCalendar,
  FiCamera,
  FiCheck,
  FiCopy,
  FiGlobe,
  FiLayers,
  FiMapPin,
  FiMaximize,
  FiPackage,
  FiSearch,
  FiShield,
  FiSliders,
  FiTruck,
  FiX,
  FiZap,
} from "react-icons/fi";
import BarcodeScanner from "../components/BarcodeScanner.jsx";
import { ResponsiveSlider } from "@/components/shared/ResponsiveSlider";
import { ResiBarcode } from "@/components/shared/ResiBarcode";
import StatusBadge from "../components/StatusBadge.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { apiFetch, formatDateTime, STATUS_LABEL } from "../lib/api.js";

function HeroTruckArt() {
  return (
    <svg viewBox="0 0 280 145" className="hidden lg:block w-[265px] h-auto shrink-0 drop-shadow-xl" aria-hidden="true">
      <ellipse cx="140" cy="130" rx="115" ry="9" fill="rgba(6,20,56,0.35)" />
      <g transform="translate(24, 14)">
        <path d="M16 0C7.2 0 0 7.2 0 16c0 11 16 26 16 26s16-15 16-26C32 7.2 24.8 0 16 0z" fill="#ffffff" />
        <circle cx="16" cy="15" r="6" fill="#2563eb" />
      </g>
      <rect x="78" y="34" width="124" height="72" rx="11" fill="#f8fafc" />
      <rect x="88" y="44" width="104" height="48" rx="7" fill="#eaf3fe" />
      <text x="140" y="74" textAnchor="middle" fill="#0b72d9" fontWeight="800" fontSize="17" fontFamily="Plus Jakarta Sans, sans-serif">
        LacakIn
      </text>
      <path d="M80 50 L44 50 Q32 50 28 63 L18 88 Q16 96 24 104 L80 104 Z" fill="#e2e8f0" />
      <path d="M74 58 L48 58 Q40 58 37 67 L30 82 L74 82 Z" fill="#1e3a8a" />
      <rect x="20" y="90" width="9" height="6" rx="2" fill="#facc15" />
      <circle cx="54" cy="108" r="15" fill="#1e293b" />
      <circle cx="54" cy="108" r="6.5" fill="#cbd5e1" />
      <circle cx="166" cy="108" r="15" fill="#1e293b" />
      <circle cx="166" cy="108" r="6.5" fill="#cbd5e1" />
      <g transform="translate(198, 84)">
        <rect x="0" y="10" width="30" height="26" rx="3" fill="#d99a5b" stroke="#b5783d" strokeWidth="1.5" />
        <line x1="15" y1="10" x2="15" y2="36" stroke="#b5783d" strokeWidth="1.5" />
        <rect x="26" y="0" width="34" height="36" rx="3" fill="#e5ac70" stroke="#b5783d" strokeWidth="1.5" />
        <line x1="43" y1="0" x2="43" y2="36" stroke="#b5783d" strokeWidth="1.5" />
      </g>
    </svg>
  );
}

export default function LacakPage() {
  const { showToast } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCode = (searchParams.get("code") || "").trim().toUpperCase();
  const inputRef = useRef(null);

  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [activePhoto, setActivePhoto] = useState(null);

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

  const copyResi = (text) => {
    navigator.clipboard?.writeText(text).then(() => showToast("Nomor resi disalin", "info"));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* HERO BANNER WITH TABBED SEARCH BOX */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b225d] via-[#133e9c] to-[#2470e8] px-6 py-8 sm:px-9 sm:py-10 text-white shadow-xl shadow-blue-950/15">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-7">
          {/* Left Copy */}
          <div className="max-w-md space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/20 px-3 py-1 text-xs font-bold text-sky-200">
              <FiMapPin className="h-3.5 w-3.5" />
              Tracking Online Jawa Timur
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold leading-tight tracking-tight">
              Lacak Paket Anda <br />
              Secara <span className="text-sky-300">Langsung</span>
            </h1>
            <p className="text-sm text-blue-100 leading-relaxed">
              Pantau status pengiriman, posisi paket di setiap gerai, dan dokumentasi serah terima secara cepat dan akurat.
            </p>
            <div className="flex flex-wrap gap-4 pt-2 text-xs font-semibold text-blue-100">
              <span className="inline-flex items-center gap-1.5">
                <FiZap className="h-4 w-4 text-sky-300" /> Update Langsung
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FiShield className="h-4 w-4 text-sky-300" /> Aman dan Terpercaya
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FiGlobe className="h-4 w-4 text-sky-300" /> 38 Kab/Kota Jatim
              </span>
            </div>
          </div>

          {/* Center Floating Search Widget */}
          <div className="w-full lg:max-w-[490px] z-10">
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl bg-white p-4 shadow-2xl shadow-blue-950/25 space-y-2.5"
            >
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <FiPackage className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-600" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="Masukkan nomor resi pengiriman Anda"
                    autoComplete="off"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 mono text-sm font-bold text-slate-900 placeholder:font-sans placeholder:font-medium placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setScannerOpen(true)}
                    title="Pindai Barcode Kamera"
                    className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    <FiMaximize className="h-4 w-4 text-blue-600" />
                    <span className="sm:hidden">Pindai</span>
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex h-11 flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1d5bd6] to-[#0b68d9] px-5 text-sm font-extrabold text-white shadow-sm hover:opacity-95 cursor-pointer disabled:opacity-60"
                  >
                    <FiSearch className="h-4 w-4" />
                    {loading ? "Mencari..." : "Lacak"}
                  </button>
                </div>
              </div>
              <div className="text-[11.5px] text-slate-400 font-medium">
                Ketik nomor resi atau tekan ikon pemindai untuk membaca barcode langsung dari kamera.
              </div>
            </form>
          </div>

          <div className="hidden lg:block w-[290px] shrink-0">
            <div className="overflow-hidden rounded-2xl border border-white/25 bg-white/10 p-1.5 backdrop-blur-md shadow-2xl">
              <img
                src={
                  result?.shipment?.current_status === "SELESAI"
                    ? "/images/lacak-celebration.webp"
                    : "/images/lacak-home.webp"
                }
                alt="Lacak Paket LacakIn"
                className="aspect-[3/2] w-full rounded-xl object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-700"
        >
          {error}
        </div>
      )}

      {/* RESULT CARD (3-COLUMN) OR SERVICE CAROUSEL */}
      {result ? (
        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-600">
              <FiBox className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Hasil Pelacakan Resi</h2>
              <p className="text-xs text-slate-500">Informasi status terkini dan riwayat perjalanan paket Anda.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT 3 COLS: Dark Blue Resi Card + Spec Table + Barcode */}
            <div className="lg:col-span-3 space-y-4">
              <div className="rounded-2xl bg-gradient-to-br from-[#0e2a6b] to-[#1746a8] p-4 text-white shadow-md">
                <div className="text-[11px] font-semibold text-blue-200 uppercase tracking-wide">Nomor Resi</div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="mono text-lg font-extrabold tracking-tight truncate">{result.shipment.code}</span>
                  <button
                    type="button"
                    onClick={() => copyResi(result.shipment.code)}
                    title="Salin nomor resi"
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 text-white cursor-pointer"
                  >
                    <FiCopy className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-3">
                  <StatusBadge status={result.shipment.current_status} />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 divide-y divide-slate-200/60 text-xs">
                <div className="flex justify-between py-2">
                  <span className="text-slate-500 font-semibold">Layanan</span>
                  <strong className="text-slate-800">{result.shipment.service_name || result.shipment.service_code || "Reguler"}</strong>
                </div>
                {result.shipment.package_type && (
                  <div className="flex justify-between py-2">
                    <span className="text-slate-500 font-semibold">Jenis Paket</span>
                    <strong className="text-slate-800">{result.shipment.package_type}</strong>
                  </div>
                )}
                {result.shipment.chargeable_weight_kg && (
                  <div className="flex justify-between py-2">
                    <span className="text-slate-500 font-semibold">Berat Tercatat</span>
                    <strong className="text-slate-800">{result.shipment.chargeable_weight_kg} kg</strong>
                  </div>
                )}
                <div className="flex items-start justify-between gap-3 py-2">
                  <span className="text-slate-500 font-semibold shrink-0">Lokasi Akhir</span>
                  <strong className="text-slate-800 text-right leading-snug">{result.shipment.current_location}</strong>
                </div>
              </div>

              <div className="text-center">
                <ResiBarcode
                  code={result.shipment.code}
                  originCity={result.shipment.origin_city}
                  destCity={result.shipment.dest_city}
                  serviceCode={result.shipment.service_code}
                  packageType={result.shipment.package_type}
                  senderName={result.shipment.sender_name}
                  senderPhone={result.shipment.sender_phone}
                  senderAddress={result.shipment.sender_address}
                  receiverName={result.shipment.receiver_name}
                  receiverPhone={result.shipment.receiver_phone}
                  receiverAddress={result.shipment.receiver_address}
                  weightKg={result.shipment.chargeable_weight_kg}
                  totalCost={result.shipment.total_cost}
                  paymentStatus={result.shipment.payment_status}
                  channel={result.shipment.channel}
                  createdAt={result.shipment.updated_at}
                  proofUrl={result.proofs?.[0]?.url}
                  showPrint
                />
              </div>
            </div>

            {/* CENTER 5 COLS: Status Box + Riwayat Pengiriman Timeline */}
            <div className="lg:col-span-5 space-y-5">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                    <FiTruck className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase text-slate-400">Status Pengiriman</div>
                    <div className="text-lg font-extrabold text-blue-700 leading-snug">
                      {STATUS_LABEL[result.shipment.current_status] || result.shipment.current_status}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Posisi terkini di {result.shipment.current_location}.
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 shrink-0">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                    <FiCalendar className="h-3.5 w-3.5 text-blue-600" /> Pembaruan Terakhir
                  </div>
                  <div className="text-xs font-extrabold text-slate-800 mt-0.5">
                    {formatDateTime(result.shipment.updated_at)}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900 mb-3">
                  <FiLayers className="h-4 w-4 text-blue-600" />
                  Riwayat Pengiriman
                </div>
                <div className="space-y-2">
                  {(result.events || []).map((ev, idx) => {
                    const isLatest = idx === 0;
                    const evProof = (result.proofs || []).find((p) => Number(p.event_id) === Number(ev.id));
                    return (
                      <div
                        key={ev.id}
                        className={`flex items-start justify-between gap-3 rounded-xl p-3 border ${
                          isLatest
                            ? "border-blue-200 bg-blue-50/80"
                            : "border-slate-100 bg-white"
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div
                            className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-white ${
                              isLatest ? "bg-blue-600" : "bg-emerald-500"
                            }`}
                          >
                            <FiCheck className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className={`text-xs font-extrabold ${isLatest ? "text-blue-800" : "text-slate-900"}`}>
                              {STATUS_LABEL[ev.status] || ev.status}
                            </div>
                            <div className="text-xs text-slate-600 mt-0.5">{ev.location}</div>
                            {ev.notes && <div className="text-[11px] text-slate-400 mt-0.5">{ev.notes}</div>}
                            {evProof && (
                              <button
                                type="button"
                                onClick={() => setActivePhoto({ ...evProof, label: STATUS_LABEL[ev.status] || ev.status, location: ev.location })}
                                className="mt-1.5 inline-flex items-center gap-1 rounded-lg bg-white border border-blue-200 px-2.5 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-50 cursor-pointer"
                              >
                                <FiCamera className="h-3 w-3" />
                                Lihat Foto Bukti
                              </button>
                            )}
                          </div>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap shrink-0">
                          {formatDateTime(ev.recorded_at)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT 4 COLS: Route Map + Wilayah Asal/Tujuan + Proofs */}
            <div className="lg:col-span-4 space-y-4">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
                <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900 mb-3">
                  <FiMapPin className="h-4 w-4 text-blue-600" />
                  Posisi Pengiriman Saat Ini
                </div>
                <EastJavaMap
                  mode="route"
                  originCity={result.shipment.origin_city}
                  destCity={result.shipment.dest_city}
                  currentLocation={result.shipment.current_location}
                  heightClass="h-[190px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
                  <div className="text-[11px] font-bold text-slate-400">Wilayah Asal</div>
                  <div className="text-xs font-extrabold text-slate-900 mt-1">
                    {result.shipment.origin_city || "-"}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Jawa Timur</div>
                </div>
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
                  <div className="text-[11px] font-bold text-slate-400">Wilayah Tujuan</div>
                  <div className="text-xs font-extrabold text-slate-900 mt-1">
                    {result.shipment.dest_city || "-"}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Jawa Timur</div>
                </div>
              </div>

              {/* Foto Bukti Terkini Status Paket */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900">
                    <FiCamera className="h-4 w-4 text-blue-600" />
                    Foto Bukti Terkini
                  </div>
                  {result.proofs?.length > 0 && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      {result.proofs.length} Foto
                    </span>
                  )}
                </div>

                {result.proofs?.length > 0 ? (
                  <div className="space-y-2.5">
                    <button
                      type="button"
                      onClick={() => setActivePhoto({ ...result.proofs[0], label: STATUS_LABEL[result.shipment.current_status] || result.shipment.current_status, location: result.shipment.current_location })}
                      className="group relative block w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50 cursor-pointer"
                    >
                      <img
                        src={result.proofs[0].url}
                        alt="Foto bukti terkini status paket"
                        className="aspect-[4/3] w-full object-cover group-hover:scale-[1.02] transition-transform"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/75 to-transparent px-3 py-2 text-left text-[11px] font-semibold text-white flex items-center justify-between">
                        <span>{result.proofs[0].taken_at ? formatDateTime(result.proofs[0].taken_at) : "Bukti Terbaru"}</span>
                        <span className="inline-flex items-center gap-1 font-bold text-sky-200">
                          <FiMaximize className="h-3 w-3" /> Perbesar
                        </span>
                      </div>
                    </button>

                    {result.proofs.length > 1 && (
                      <div className="flex flex-wrap gap-2">
                        {result.proofs.slice(1).map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setActivePhoto(p)}
                            className="block w-16 overflow-hidden rounded-lg border border-slate-200 hover:border-blue-400 cursor-pointer"
                          >
                            <img src={p.url} alt="Bukti checkpoint sebelumnya" className="h-14 w-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-3.5 py-4 text-center text-[11.5px] text-slate-500 leading-relaxed">
                    Belum ada foto bukti checkpoint untuk paket ini. Foto akan tampil otomatis setelah kurir atau petugas loket mengunggah bukti.
                  </div>
                )}
              </div>

              {activePhoto && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs"
                  onClick={() => setActivePhoto(null)}
                >
                  <div
                    className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                      <div>
                        <div className="text-sm font-extrabold text-slate-900">
                          {activePhoto.label || "Foto Bukti Pengiriman"}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {activePhoto.location || (activePhoto.taken_at ? formatDateTime(activePhoto.taken_at) : result.shipment.code)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActivePhoto(null)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                      >
                        <FiX className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="bg-slate-900 flex items-center justify-center max-h-[75vh]">
                      <img src={activePhoto.url} alt="Pratinjau foto bukti" className="max-h-[75vh] w-auto object-contain" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      ) : (
        <ResponsiveSlider />
      )}

      {/* BOTTOM PROMO & FEATURES STRIP */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="max-w-xs">
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug">
              Kirim Paket Lebih Aman, Cepat, dan Mudah Bersama LacakIn
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
            {[
              { icon: FiTruck, label: "Pengiriman Cepat" },
              { icon: FiShield, label: "Jaminan Keamanan" },
              { icon: FiMapPin, label: "Pelacakan Langsung" },
              { icon: FiLayers, label: "Berbagai Layanan" },
            ].map((f) => {
              const FIcon = f.icon;
              return (
                <div key={f.label} className="flex flex-col items-center text-center gap-1.5">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
                    <FIcon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-700 leading-tight">{f.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-4 rounded-2xl bg-gradient-to-br from-[#eef5ff] to-[#dbeafe] border border-blue-200/70 p-5 sm:p-6 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Hitung Ongkir Jawa Timur</h3>
            <p className="text-xs text-slate-600 mt-1">
              Bandingkan estimasi tarif Reguler, Ekspres, dan Sameday untuk 38 kabupaten dan kota.
            </p>
            <Link
              to="/tarif"
              className="mt-3 inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 no-underline"
            >
              Cek Tarif Sekarang
            </Link>
          </div>
        </div>
      </div>

      {scannerOpen && (
        <BarcodeScanner onDetected={handleDetected} onClose={() => setScannerOpen(false)} />
      )}
    </motion.div>
  );
}
