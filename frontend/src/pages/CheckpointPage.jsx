import React, { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  FiCamera,
  FiCheckCircle,
  FiChevronRight,
  FiFileText,
  FiFlag,
  FiHome,
  FiInfo,
  FiLayers,
  FiMapPin,
  FiMaximize,
  FiPackage,
  FiSearch,
  FiTrash2,
  FiTruck,
  FiUploadCloud,
  FiUser,
} from "react-icons/fi";
import BarcodeScanner from "../components/BarcodeScanner.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import {
  ALLOWED_TRANSITIONS,
  PROOF_REQUIRED_STATUSES,
  STATUS_LABEL,
  apiFetch,
  formatDateTime,
  generateIdempotencyKey,
} from "../lib/api.js";

export default function CheckpointPage() {
  const { showToast } = useAuth();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef(null);

  const [hubs, setHubs] = useState([]);
  const [pickupQueue, setPickupQueue] = useState([]);
  const [scanner, setScanner] = useState(false);
  const [code, setCode] = useState("");
  const [ship, setShip] = useState(null);
  const [events, setEvents] = useState([]);
  const [lookingUp, setLookingUp] = useState(false);

  const [status, setStatus] = useState("");
  const [location, setLocation] = useState("");
  const [hubId, setHubId] = useState("");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [idem, setIdem] = useState(generateIdempotencyKey);

  const loadPickupQueue = () => {
    apiFetch("/api/shipments?status=BOOKED&limit=8")
      .then((d) => setPickupQueue(Array.isArray(d?.items) ? d.items : []))
      .catch(() => {});
  };

  useEffect(() => {
    apiFetch("/api/reference")
      .then((d) => setHubs(d.hubs || []))
      .catch(() => {});
    loadPickupQueue();
    const initialCode = searchParams.get("code");
    if (initialCode) lookup(initialCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const handlePhotoSelect = (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast("Ukuran foto maksimal 5 MB", "error");
      return;
    }
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const clearPhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhoto(null);
    setPhotoPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const lookup = async (c) => {
    const clean = String(c || code).trim().toUpperCase();
    if (!clean) return;
    setCode(clean);
    setError("");
    setShip(null);
    setEvents([]);
    setLookingUp(true);
    try {
      const r = await apiFetch(`/api/shipments/${encodeURIComponent(clean)}/events`);
      setShip(r.shipment);
      setEvents(Array.isArray(r.events) ? r.events : []);
      const allowed = ALLOWED_TRANSITIONS[r.shipment.current_status] || [];
      setStatus(allowed[0] || "");
      setIdem(generateIdempotencyKey());
    } catch (e) {
      setError(e.message || "Nomor resi tidak ditemukan.");
    } finally {
      setLookingUp(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!ship) return;
    if (!photo) {
      setError("Foto bukti checkpoint wajib dilampirkan sebelum menyimpan.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      let proof = null;
      if (photo) {
        const fd = new FormData();
        fd.append("shipment_code", ship.code);
        fd.append("file", photo);
        const up = await apiFetch("/api/uploads", {
          method: "POST",
          body: fd,
          isFormData: true,
        });
        proof = up.object_key;
      }
      const ev = await apiFetch("/api/events", {
        method: "POST",
        idempotencyKey: idem,
        body: {
          shipment_code: ship.code,
          status,
          location: location.trim(),
          hub_id: hubId ? Number(hubId) : null,
          expected_version: ship.version,
          notes: notes.trim() || null,
          proof_object_key: proof,
        },
      });
      showToast(`Status ${ev.shipment_code}: ${STATUS_LABEL[ev.status]}`, "success");
      setNotes("");
      clearPhoto();
      loadPickupQueue();
      await lookup(ship.code);
    } catch (err) {
      setError(err.message || "Gagal menyimpan checkpoint.");
    } finally {
      setBusy(false);
    }
  };

  const next = ship ? ALLOWED_TRANSITIONS[ship.current_status] || [] : [];
  const off = !ship || next.length === 0;

  return (
    <div className="space-y-5 pb-8">
      {/* BREADCRUMB & HEADER */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          <Link to="/" className="hover:text-blue-600 no-underline text-slate-500">
            <FiHome className="h-3.5 w-3.5" />
          </Link>
          <FiChevronRight className="h-3.5 w-3.5 text-slate-400" />
          <span>Operasional</span>
          <FiChevronRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="font-bold text-slate-800">Input Checkpoint</span>
        </div>

        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 shadow-xs">
            <FiMapPin className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
              Input Checkpoint
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Perbarui status paket sesuai alur yang diizinkan.
            </p>
          </div>
        </div>
      </div>

      {/* MAIN 2-COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN (6 COLS): CARI PENGIRIMAN + HASIL DETAIL & RIWAYAT */}
        <div className="lg:col-span-6 space-y-5">
          {/* Card 1: Cari Pengiriman */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <FiSearch className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Cari Pengiriman</h2>
                <p className="text-xs text-slate-500">
                  Masukkan atau pindai nomor resi untuk menampilkan detail pengiriman.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="cp-code" className="block text-xs font-bold text-slate-700">
                Nomor Resi <span className="text-rose-500">*</span>
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[180px]">
                  <FiPackage className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-600 pointer-events-none" />
                  <input
                    id="cp-code"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), lookup())}
                    placeholder="Masukkan nomor resi..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-3 font-mono text-base sm:text-sm font-bold text-slate-900 placeholder:font-sans placeholder:font-medium placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <button
                  type="button"
                  disabled={lookingUp}
                  onClick={() => lookup()}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 text-xs sm:text-sm font-extrabold text-white shadow-sm cursor-pointer disabled:opacity-60"
                >
                  <FiSearch className="h-4 w-4" />
                  <span>{lookingUp ? "Mencari..." : "Cek"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setScanner(true)}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 text-xs sm:text-sm font-bold text-slate-700 shadow-xs cursor-pointer"
                >
                  <FiMaximize className="h-4 w-4 text-blue-600" />
                  <span>Pindai Barcode</span>
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Detail Pengiriman & Riwayat */}
          {ship ? (
            <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm space-y-5">
              {/* Top Resi Summary */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
                    <FiPackage className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-mono text-lg font-extrabold text-slate-900 leading-none">
                      {ship.code}
                    </div>
                    <div className="text-xs font-semibold text-slate-500 mt-1">
                      Layanan {ship.service_code || "REG"}
                    </div>
                  </div>
                </div>
                <StatusBadge status={ship.current_status} />
              </div>

              {next.length === 0 && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">
                  Pengiriman ini sudah mencapai status final dan tidak dapat diperbarui lagi.
                </div>
              )}

              {/* Split Metadata + Timeline */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
                {/* Metadata Cards */}
                <div className="sm:col-span-5 space-y-2.5 text-xs">
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                      <FiMapPin className="h-3.5 w-3.5 text-blue-600" />
                      <span>Lokasi Saat Ini</span>
                    </div>
                    <div className="font-extrabold text-slate-900 mt-0.5">
                      {ship.current_location || "-"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                      <FiTruck className="h-3.5 w-3.5 text-blue-600" />
                      <span>Kurir Bertugas</span>
                    </div>
                    <div className="font-extrabold text-slate-900 mt-0.5">
                      {ship.assigned_courier_name
                        ? `${ship.assigned_courier_name} (${ship.assigned_courier_code || "-"})`
                        : "Belum ditugaskan"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                      <FiFlag className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Rute Kota dan Gudang</span>
                    </div>
                    <div className="font-extrabold text-slate-900 mt-0.5">
                      {ship.origin_city || "-"} → {ship.dest_city || "-"}
                    </div>
                    {(ship.origin_hub_name || ship.dest_hub_name) && (
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {ship.origin_hub_code || "-"} → {ship.dest_hub_code || "-"}
                      </div>
                    )}
                  </div>
                </div>

                {/* Timeline Riwayat Pengiriman */}
                <div className="sm:col-span-7 space-y-3">
                  <div className="text-xs font-extrabold text-slate-900">Riwayat Pengiriman</div>
                  {events.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                      Belum ada riwayat checkpoint tercatat.
                    </div>
                  ) : (
                    <div className="space-y-3 border-l-2 border-blue-100 pl-4">
                      {events.map((ev, idx) => {
                        const isLatest = idx === 0;
                        return (
                          <div
                            key={ev.id || idx}
                            className={`relative rounded-2xl p-2.5 text-xs ${
                              isLatest
                                ? "bg-blue-50/80 border border-blue-200/80"
                                : "bg-transparent"
                            }`}
                          >
                            <span
                              className={`absolute -left-[23px] top-3 h-3 w-3 rounded-full ring-2 ring-white ${
                                isLatest ? "bg-blue-600" : "bg-emerald-500"
                              }`}
                            />
                            <div className="font-extrabold text-slate-900">
                              {STATUS_LABEL[ev.status] || ev.status}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {ev.location} • {formatDateTime(ev.recorded_at || ev.created_at)}
                            </div>
                            {(ev.actor_name || ev.hub_name) && (
                              <div className="text-[11px] font-semibold text-blue-700 mt-0.5">
                                {ev.actor_name ? `Petugas: ${ev.actor_name} (${ev.actor_code || "-"})` : ""}
                                {ev.actor_name && ev.hub_name ? " · " : ""}
                                {ev.hub_name ? `Gudang: ${ev.hub_name}` : ""}
                              </div>
                            )}
                            {ev.notes && (
                              <div className="text-[11px] text-slate-600 mt-0.5">{ev.notes}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-8 text-center space-y-2">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <FiTruck className="h-6 w-6" />
              </div>
              <div className="text-sm font-extrabold text-slate-800">
                Belum Ada Resi Dipilih
              </div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Masukkan nomor resi atau gunakan tombol Pindai Barcode di atas untuk memuat detail paket dan memperbarui checkpoint.
              </p>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN (6 COLS): PERBARUI CHECKPOINT FORM */}
        <form
          onSubmit={submit}
          className="lg:col-span-6 rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm space-y-4"
        >
          <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <FiLayers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Perbarui Checkpoint</h2>
              <p className="text-xs text-slate-500">
                Catat perkembangan terbaru pengiriman pada nomor resi ini.
              </p>
            </div>
          </div>

          <div className="space-y-3.5">
            {/* Status Berikutnya */}
            <div>
              <label htmlFor="cp-status" className="block text-xs font-bold text-slate-700 mb-1.5">
                Status Berikutnya <span className="text-rose-500">*</span>
              </label>
              <select
                id="cp-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={off}
                required
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none disabled:opacity-50"
              >
                <option value="">-- Pilih Status Berikutnya --</option>
                {next.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>

            {/* Hub (opsional) */}
            <div>
              <label htmlFor="cp-hub" className="block text-xs font-bold text-slate-700 mb-1.5">
                Hub <span className="font-normal text-slate-400">(opsional)</span>
              </label>
              <select
                id="cp-hub"
                value={hubId}
                disabled={off}
                onChange={(e) => {
                  setHubId(e.target.value);
                  const h = hubs.find((x) => String(x.id) === e.target.value);
                  if (h) setLocation(h.name);
                }}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none disabled:opacity-50"
              >
                <option value="">-- Manual / Pilih Hub Jawa Timur --</option>
                {hubs.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.city_name})
                  </option>
                ))}
              </select>
            </div>

            {/* Lokasi */}
            <div>
              <label htmlFor="cp-location" className="block text-xs font-bold text-slate-700 mb-1.5">
                Lokasi <span className="text-rose-500">*</span>
              </label>
              <div className="relative flex items-center">
                <FiMapPin className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  id="cp-location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={off}
                  required
                  placeholder="Contoh: Hub Sidoarjo, Jawa Timur"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-3.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none disabled:opacity-50"
                />
              </div>
            </div>

            {/* Catatan */}
            <div>
              <label htmlFor="cp-notes" className="block text-xs font-bold text-slate-700 mb-1.5">
                Catatan
              </label>
              <div className="relative flex items-center">
                <FiFileText className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  id="cp-notes"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={off}
                  placeholder="Contoh: Paket tiba di hub tujuan"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-3.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none disabled:opacity-50"
                />
              </div>
            </div>

            {/* Foto Bukti Dropzone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Foto Bukti <span className="text-rose-500">*</span>{" "}
                <span className="font-semibold text-rose-600">(Wajib)</span>
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                className="hidden"
                disabled={off}
                onChange={(e) => handlePhotoSelect(e.target.files?.[0])}
              />

              {photoPreview ? (
                <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={photoPreview}
                      alt="Pratinjau bukti"
                      className="h-16 w-16 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-slate-900 truncate">
                        {photo?.name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {photo ? `${(photo.size / 1024).toFixed(1)} KB` : ""}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={clearPhoto}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 cursor-pointer"
                  >
                    <FiTrash2 className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!off) setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragActive(false);
                    if (!off) handlePhotoSelect(e.dataTransfer.files?.[0]);
                  }}
                  onClick={() => !off && fileInputRef.current?.click()}
                  className={`rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
                    off
                      ? "border-slate-200 bg-slate-50/60 opacity-60 cursor-not-allowed"
                      : dragActive
                      ? "border-blue-500 bg-blue-50/70 cursor-pointer"
                      : "border-slate-300 bg-slate-50/40 hover:border-blue-400 hover:bg-blue-50/30 cursor-pointer"
                  }`}
                >
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <FiCamera className="h-5 w-5" />
                  </div>
                  <div className="text-xs font-extrabold text-slate-800">Unggah Foto</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Seret dan lepas file di sini, atau klik untuk memilih
                  </div>
                  <div className="mt-2 inline-block rounded-lg border border-slate-200 bg-white px-2.5 py-0.5 text-[10.5px] font-semibold text-slate-500">
                    JPG, PNG, WEBP (maks. 5 MB)
                  </div>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || off}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] hover:from-[#1d4ed8] hover:to-[#1e40af] px-5 text-sm font-extrabold text-white shadow-md shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiCheckCircle className="h-4 w-4" />
            <span>{busy ? "Menyimpan Checkpoint..." : "Simpan Checkpoint"}</span>
          </button>
        </form>
      </div>

      {/* ANTREAN PICKUP ONLINE (BOOKED) */}
      {pickupQueue.length > 0 && (
        <div className="rounded-3xl border border-blue-200/80 bg-white p-5 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <FiTruck className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Antrean Pickup Pesanan Online (Menunggu Dijemput Kurir)
                </h3>
                <p className="text-xs text-slate-500">
                  Klik salah satu resi di bawah untuk memuat detail dan melakukan pickup (Pesanan Dibuat → Diterima).
                </p>
              </div>
            </div>
            <span className="rounded-full bg-amber-50 border border-amber-200 px-3 py-0.5 text-xs font-extrabold text-amber-700">
              {pickupQueue.length} pesanan siap pickup
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {pickupQueue.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => lookup(item.code)}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 hover:border-blue-400 hover:bg-blue-50/60 p-3 text-left transition-colors cursor-pointer space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-extrabold text-blue-700">{item.code}</span>
                  <span className="rounded bg-white border border-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                    {item.service_code}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-800 truncate">{item.sender_name || item.current_location}</div>
                <div className="text-[11px] text-slate-500 truncate">{item.current_location || "-"}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* BOTTOM INFO BANNER */}
      <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-white px-4 py-3 text-xs text-slate-600 shadow-xs">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <FiInfo className="h-4 w-4" />
        </div>
        <span>Status pengiriman mengikuti alur transisi yang diizinkan sistem.</span>
      </div>

      {scanner && <BarcodeScanner onDetected={(v) => lookup(v)} onClose={() => setScanner(false)} />}
    </div>
  );
}
