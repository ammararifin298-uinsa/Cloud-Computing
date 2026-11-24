import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  FiBox,
  FiChevronRight,
  FiClock,
  FiInfo,
  FiLayers,
  FiMapPin,
  FiPackage,
  FiSearch,
  FiShield,
  FiSliders,
  FiTag,
  FiZap,
} from "react-icons/fi";
import { apiFetch, formatRupiah } from "../lib/api.js";

function TarifHeroArt() {
  return (
    <svg viewBox="0 0 280 140" className="hidden lg:block w-[265px] h-auto shrink-0 drop-shadow-xl" aria-hidden="true">
      <ellipse cx="145" cy="126" rx="112" ry="8" fill="rgba(6,20,56,0.34)" />
      <rect x="86" y="34" width="124" height="70" rx="11" fill="#ffffff" />
      <rect x="96" y="44" width="104" height="46" rx="7" fill="#eaf3fe" />
      <text x="148" y="72" textAnchor="middle" fill="#0b72d9" fontWeight="800" fontSize="17" fontFamily="Plus Jakarta Sans, sans-serif">
        LacakIn
      </text>
      <path d="M88 48 L52 48 Q40 48 36 62 L26 86 Q24 94 32 102 L88 102 Z" fill="#e2e8f0" />
      <path d="M82 56 L56 56 Q48 56 45 65 L38 80 L82 80 Z" fill="#1e3a8a" />
      <rect x="28" y="88" width="9" height="6" rx="2" fill="#facc15" />
      <circle cx="62" cy="106" r="14" fill="#0f172a" />
      <circle cx="62" cy="106" r="6" fill="#cbd5e1" />
      <circle cx="174" cy="106" r="14" fill="#0f172a" />
      <circle cx="174" cy="106" r="6" fill="#cbd5e1" />
      <g transform="translate(206, 82)">
        <rect x="0" y="10" width="28" height="24" rx="3" fill="#d99a5b" stroke="#b5783d" strokeWidth="1.5" />
        <line x1="14" y1="10" x2="14" y2="34" stroke="#b5783d" strokeWidth="1.5" />
        <rect x="24" y="0" width="32" height="34" rx="3" fill="#e5ac70" stroke="#b5783d" strokeWidth="1.5" />
        <line x1="40" y1="0" x2="40" y2="34" stroke="#b5783d" strokeWidth="1.5" />
      </g>
    </svg>
  );
}

const SERVICE_META = {
  REG: {
    desc: "Pengiriman ekonomis dengan jangkauan luas ke seluruh Jawa Timur.",
    icon: FiBox,
    iconCls: "bg-blue-100 text-blue-700",
  },
  EXP: {
    desc: "Pengiriman lebih cepat dengan prioritas penanganan lintas kota.",
    icon: FiZap,
    iconCls: "bg-amber-100 text-amber-600",
  },
  SDY: {
    desc: "Kirim hari ini, sampai di hari yang sama untuk area terjangkau.",
    icon: FiClock,
    iconCls: "bg-violet-100 text-violet-700",
  },
  KRG: {
    desc: "Pengiriman paket besar dan berat hingga 200 kg via armada mobil box.",
    icon: FiPackage,
    iconCls: "bg-emerald-100 text-emerald-700",
  },
};

export default function TarifPage() {
  const navigate = useNavigate();
  const [cities, setCities] = useState([]);
  const [originDistricts, setOriginDistricts] = useState([]);
  const [originVillages, setOriginVillages] = useState([]);
  const [destDistricts, setDestDistricts] = useState([]);
  const [destVillages, setDestVillages] = useState([]);
  const [loadingRef, setLoadingRef] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [selectedSvc, setSelectedSvc] = useState("REG");

  const [form, setForm] = useState({
    origin_city_id: "",
    origin_district_id: "",
    origin_village_id: "",
    dest_city_id: "",
    dest_district_id: "",
    dest_village_id: "",
    weight_kg: "1",
    length_cm: "20",
    width_cm: "15",
    height_cm: "10",
    declared_value: "0",
    use_insurance: false,
  });

  useEffect(() => {
    if (!form.origin_city_id) {
      setOriginDistricts([]);
      return;
    }
    apiFetch(`/api/reference/districts?city_id=${encodeURIComponent(form.origin_city_id)}`)
      .then((list) => setOriginDistricts(Array.isArray(list) ? list : []))
      .catch(() => setOriginDistricts([]));
  }, [form.origin_city_id]);

  useEffect(() => {
    if (!form.origin_district_id) {
      setOriginVillages([]);
      return;
    }
    apiFetch(`/api/reference/villages?district_id=${encodeURIComponent(form.origin_district_id)}`)
      .then((list) => setOriginVillages(Array.isArray(list) ? list : []))
      .catch(() => setOriginVillages([]));
  }, [form.origin_district_id]);

  useEffect(() => {
    if (!form.dest_city_id) {
      setDestDistricts([]);
      return;
    }
    apiFetch(`/api/reference/districts?city_id=${encodeURIComponent(form.dest_city_id)}`)
      .then((list) => setDestDistricts(Array.isArray(list) ? list : []))
      .catch(() => setDestDistricts([]));
  }, [form.dest_city_id]);

  useEffect(() => {
    if (!form.dest_district_id) {
      setDestVillages([]);
      return;
    }
    apiFetch(`/api/reference/villages?district_id=${encodeURIComponent(form.dest_district_id)}`)
      .then((list) => setDestVillages(Array.isArray(list) ? list : []))
      .catch(() => setDestVillages([]));
  }, [form.dest_district_id]);

  useEffect(() => {
    let mounted = true;
    apiFetch("/api/reference")
      .then((data) => {
        if (!mounted) return;
        const list = data.cities || [];
        setCities(list);
        if (list.length >= 2) {
          const sby = list.find((c) => c.name.toLowerCase().includes("surabaya")) || list[0];
          const sda = list.find((c) => c.name.toLowerCase().includes("sidoarjo")) || list[1];
          const nextForm = {
            ...form,
            origin_city_id: String(sby.id),
            dest_city_id: String(sda.id),
          };
          setForm(nextForm);
          // Auto calculate initial preview quote for immediate visual delight
          apiFetch("/api/tariffs/quote", {
            method: "POST",
            body: {
              origin_city_id: Number(sby.id),
              dest_city_id: Number(sda.id),
              weight_kg: 1,
              length_cm: 20,
              width_cm: 15,
              height_cm: 10,
              declared_value: 0,
              use_insurance: false,
            },
          })
            .then((out) => mounted && setResult(out))
            .catch(() => {});
        }
      })
      .catch((err) => {
        if (mounted) setError(err.message || "Gagal memuat daftar wilayah Jawa Timur.");
      })
      .finally(() => {
        if (mounted) setLoadingRef(false);
      });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        origin_city_id: Number(form.origin_city_id),
        dest_city_id: Number(form.dest_city_id),
        weight_kg: Number(form.weight_kg),
        length_cm: Number(form.length_cm || 0),
        width_cm: Number(form.width_cm || 0),
        height_cm: Number(form.height_cm || 0),
        declared_value: Number(form.declared_value || 0),
        use_insurance: Boolean(form.use_insurance),
      };
      const out = await apiFetch("/api/tariffs/quote", { method: "POST", body: payload });
      setResult(out);
      if (out.quotes?.[0]) setSelectedSvc(out.quotes[0].service_code);
    } catch (err) {
      setError(err.message || "Gagal menghitung tarif pengiriman.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* HERO BANNER */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b225d] via-[#1545ab] to-[#2675ec] px-6 py-8 sm:px-9 sm:py-10 text-white shadow-xl shadow-blue-950/15">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-7">
          <div className="max-w-xl space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/20 px-3 py-1 text-xs font-bold text-sky-200">
              <FiTag className="h-3.5 w-3.5" />
              Cek Tarif Pengiriman
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold leading-tight tracking-tight">
              Hitung Ongkir dengan{" "}
              <span className="text-sky-300">Cepat, Akurat,</span> dan{" "}
              <span className="text-sky-300">Transparan.</span>
            </h1>
            <p className="text-sm text-blue-100 leading-relaxed max-w-lg">
              Cek estimasi biaya pengiriman paket ke seluruh wilayah di Jawa Timur dengan berbagai pilihan layanan sesuai kebutuhan Anda.
            </p>
            <div className="flex flex-wrap gap-4 pt-2 text-xs font-semibold text-blue-100">
              <span className="inline-flex items-center gap-1.5">
                <FiZap className="h-4 w-4 text-sky-300" /> Perhitungan Langsung
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FiShield className="h-4 w-4 text-sky-300" /> Tarif Resmi dan Transparan
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FiPackage className="h-4 w-4 text-sky-300" /> Beragam Pilihan Layanan
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FiMapPin className="h-4 w-4 text-sky-300" /> Jangkauan 38 Kab/Kota
              </span>
            </div>
          </div>

          <div className="hidden lg:block w-[290px] shrink-0">
            <div className="overflow-hidden rounded-2xl border border-white/25 bg-white/10 p-1.5 backdrop-blur-md shadow-2xl">
              <img
                src="/images/tarif-label-desk.webp"
                alt="Kalkulator Tarif dan Label Pengiriman LacakIn"
                className="aspect-[3/2] w-full rounded-xl object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* MAIN 2-COLUMN CALCULATOR & RESULTS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 6 Cols: Kalkulator Tarif Pengiriman + Rute Populer */}
        <div className="lg:col-span-6 space-y-5">
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-sm space-y-5"
          >
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-600">
              <FiSliders className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Kalkulator Tarif Pengiriman</h2>
              <p className="text-xs text-slate-500">Masukkan detail pengiriman untuk mengetahui estimasi ongkos kirim.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="origin-city" className="text-xs font-bold text-slate-700">
                Kota / Kabupaten Asal
              </label>
              <div className="relative">
                <FiMapPin className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-600" />
                <select
                  id="origin-city"
                  value={form.origin_city_id}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      origin_city_id: e.target.value,
                      origin_district_id: "",
                      origin_village_id: "",
                    })
                  }
                  disabled={loadingRef}
                  required
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-3 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
                >
                  <option value="">-- Pilih Wilayah Asal --</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}, Jawa Timur
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 pt-1">
                <select
                  value={form.origin_district_id}
                  disabled={!form.origin_city_id}
                  onChange={(e) =>
                    setForm({ ...form, origin_district_id: e.target.value, origin_village_id: "" })
                  }
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">-- Pilih Kecamatan Asal --</option>
                  {originDistricts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <select
                  value={form.origin_village_id}
                  disabled={!form.origin_district_id}
                  onChange={(e) => setForm({ ...form, origin_village_id: e.target.value })}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">-- Pilih Kelurahan / Desa Asal --</option>
                  {originVillages.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="dest-city" className="text-xs font-bold text-slate-700">
                Kota / Kabupaten Tujuan
              </label>
              <div className="relative">
                <FiMapPin className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-600" />
                <select
                  id="dest-city"
                  value={form.dest_city_id}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      dest_city_id: e.target.value,
                      dest_district_id: "",
                      dest_village_id: "",
                    })
                  }
                  disabled={loadingRef}
                  required
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-3 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
                >
                  <option value="">-- Pilih Wilayah Tujuan --</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}, Jawa Timur
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 pt-1">
                <select
                  value={form.dest_district_id}
                  disabled={!form.dest_city_id}
                  onChange={(e) =>
                    setForm({ ...form, dest_district_id: e.target.value, dest_village_id: "" })
                  }
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">-- Pilih Kecamatan Tujuan --</option>
                  {destDistricts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <select
                  value={form.dest_village_id}
                  disabled={!form.dest_district_id}
                  onChange={(e) => setForm({ ...form, dest_village_id: e.target.value })}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">-- Pilih Kelurahan / Desa Tujuan --</option>
                  {destVillages.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-4 space-y-1.5">
              <label htmlFor="weight-kg" className="text-xs font-bold text-slate-700">
                Berat Paket
              </label>
              <div className="flex items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50/70 focus-within:border-blue-500 focus-within:bg-white">
                <input
                  id="weight-kg"
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="500"
                  value={form.weight_kg}
                  onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
                  required
                  className="h-11 w-full bg-transparent px-3.5 text-sm font-bold text-slate-900 focus:outline-none"
                />
                <span className="border-l border-slate-200 bg-slate-100 px-3 py-3 text-xs font-bold text-slate-600">
                  kg
                </span>
              </div>
            </div>

            <div className="sm:col-span-8 space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Dimensi Paket (Opsional)</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { k: "length_cm", p: "P" },
                  { k: "width_cm", p: "L" },
                  { k: "height_cm", p: "T" },
                ].map((d) => (
                  <div
                    key={d.k}
                    className="flex items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50/70 focus-within:border-blue-500 focus-within:bg-white"
                  >
                    <input
                      type="number"
                      min="0"
                      placeholder={d.p}
                      value={form[d.k]}
                      onChange={(e) => setForm({ ...form, [d.k]: e.target.value })}
                      className="h-11 w-full bg-transparent px-2.5 text-sm font-bold text-slate-800 focus:outline-none"
                    />
                    <span className="pr-2.5 text-[11px] font-semibold text-slate-400">cm</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 px-3.5 py-2.5">
            <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.use_insurance}
                onChange={(e) => setForm({ ...form, use_insurance: e.target.checked })}
                className="h-4 w-4 rounded accent-blue-600"
              />
              Tambahkan asuransi barang
            </label>
            {form.use_insurance && (
              <input
                type="number"
                min="0"
                step="1000"
                placeholder="Nilai barang (Rp)"
                value={form.declared_value}
                onChange={(e) => setForm({ ...form, declared_value: e.target.value })}
                className="h-9 w-full sm:w-44 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
              />
            )}
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50/70 px-3.5 py-2.5 text-xs text-blue-800">
            <FiInfo className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
            <span>Dimensi digunakan untuk perhitungan volume (p × l × t / 6.000) jika berat volume lebih besar dari berat aktual.</span>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || loadingRef}
            className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1d5bd6] to-[#0b68d9] px-5 text-sm font-extrabold text-white shadow-md shadow-blue-900/15 hover:opacity-95 cursor-pointer disabled:opacity-60"
          >
            <FiSearch className="h-4 w-4" />
            {submitting ? "Menghitung Tarif..." : "Hitung Tarif"}
          </button>
        </form>

          {/* Rute Populer Jawa Timur */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Rute Populer Jawa Timur</h3>
                <p className="text-[11px] text-slate-500">Klik rute untuk mengisi kota asal dan tujuan secara cepat.</p>
              </div>
              <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-0.5 text-[10.5px] font-bold text-blue-700">
                1-Klik
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { o: "Surabaya", d: "Sidoarjo" },
                { o: "Surabaya", d: "Malang" },
                { o: "Malang", d: "Kediri" },
                { o: "Sidoarjo", d: "Gresik" },
              ].map((route) => {
                const orig = cities.find((c) => c.name.toLowerCase().includes(route.o.toLowerCase()));
                const dest = cities.find((c) => c.name.toLowerCase().includes(route.d.toLowerCase()));
                return (
                  <button
                    key={`${route.o}-${route.d}`}
                    type="button"
                    disabled={!orig || !dest}
                    onClick={() => {
                      if (!orig || !dest) return;
                      setForm((prev) => ({
                        ...prev,
                        origin_city_id: String(orig.id),
                        origin_district_id: "",
                        origin_village_id: "",
                        dest_city_id: String(dest.id),
                        dest_district_id: "",
                        dest_village_id: "",
                      }));
                    }}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-left text-xs font-bold text-slate-700 hover:border-blue-300 hover:bg-blue-50/70 hover:text-blue-700 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <span>{route.o} ke {route.d}</span>
                    <FiChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 6 Cols: Hasil Estimasi Tarif */}
        <div className="lg:col-span-6 rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-sm space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-600">
              <FiLayers className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-extrabold text-slate-900">Hasil Estimasi Tarif</h2>
              <p className="text-xs text-slate-500 truncate">
                {result
                  ? `${result.origin_city}, Jawa Timur → ${result.dest_city}, Jawa Timur · Berat: ${form.weight_kg} kg`
                  : "Pilih kota asal, tujuan, dan berat untuk melihat rincian tarif."}
              </p>
            </div>
          </div>

          {result?.quotes?.length ? (
            <div className="space-y-3">
              {result.quotes.map((q) => {
                const active = selectedSvc === q.service_code;
                const meta = SERVICE_META[q.service_code] || SERVICE_META.REG;
                const SIcon = meta.icon;
                const etaLabel =
                  q.eta_min_days === q.eta_max_days
                    ? q.eta_min_days === 0
                      ? "Est. Hari yang sama"
                      : `Est. ${q.eta_min_days} hari`
                    : `Est. ${q.eta_min_days}-${q.eta_max_days} hari`;
                return (
                  <button
                    key={q.service_code}
                    type="button"
                    onClick={() => setSelectedSvc(q.service_code)}
                    className={`w-full text-left rounded-2xl border p-3.5 sm:p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer ${
                      active
                        ? "border-blue-500 bg-[#eef5ff]/80 ring-2 ring-blue-500/15"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                      <span
                        className={`mt-0.5 sm:mt-0 h-5 w-5 shrink-0 rounded-full border-2 grid place-items-center ${
                          active ? "border-blue-600" : "border-slate-300"
                        }`}
                      >
                        {active && <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />}
                      </span>

                      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${meta.iconCls}`}>
                        <SIcon className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-extrabold text-slate-900">
                          {q.service_code} - {q.service_name}
                        </div>
                        <div className="text-xs text-slate-500 leading-snug">{meta.desc}</div>
                        <div className="text-[11px] font-semibold text-slate-400 mt-0.5">
                          Berat tagih: {q.chargeable_weight_kg} kg
                          {q.insurance_cost > 0 ? ` · Asuransi ${formatRupiah(q.insurance_cost)}` : ""}
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:block items-center justify-between sm:text-right shrink-0 pl-8 sm:pl-0 border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0">
                      <div className="text-[11px] font-bold text-slate-500 whitespace-nowrap">{etaLabel}</div>
                      <div className={`text-lg sm:text-xl font-extrabold sm:mt-0.5 whitespace-nowrap ${active ? "text-blue-700" : "text-slate-900"}`}>
                        {formatRupiah(q.total_cost)}
                      </div>
                    </div>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() =>
                  navigate("/kirim", {
                    state: {
                      ...form,
                      service_code: selectedSvc,
                    },
                  })
                }
                className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1d5bd6] to-[#0b68d9] px-5 text-sm font-extrabold text-white shadow-md shadow-blue-900/15 hover:opacity-95 cursor-pointer"
              >
                <FiPackage className="h-4 w-4" />
                Buat Pesanan Online ({selectedSvc})
              </button>
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-slate-400">
              Tekan tombol <strong>Hitung Tarif</strong> untuk menampilkan daftar layanan tersedia.
            </div>
          )}

          <div className="flex items-start gap-2 rounded-xl border border-slate-200/80 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600">
            <FiInfo className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
            <span>Estimasi waktu bersifat perkiraan dan dapat berubah sesuai kondisi operasional di lapangan.</span>
          </div>
        </div>
      </div>

      {/* BOTTOM 4-STEP GUIDE */}
      <section className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="shrink-0">
            <div className="text-xs font-bold uppercase tracking-wider text-blue-600">Panduan Singkat</div>
            <h3 className="text-lg font-extrabold text-slate-900">Cara Cek Tarif di LacakIn</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
            {[
              { n: "1", t: "Isi Data Pengiriman", d: "Masukkan kota asal, tujuan, berat, dan dimensi paket." },
              { n: "2", t: "Hitung Estimasi", d: "Sistem menghitung ongkos kirim secara langsung." },
              { n: "3", t: "Pilih Layanan", d: "Sesuaikan layanan dengan kebutuhan dan estimasi waktu." },
              { n: "4", t: "Kirim Paket", d: "Datang ke gerai terdekat untuk menerbitkan resi." },
            ].map((s, idx) => (
              <div key={s.n} className="flex items-start gap-3">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-blue-600 text-xs font-extrabold text-white">
                  {s.n}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-extrabold text-slate-900 flex items-center gap-1">
                    {s.t}
                    {idx < 3 && <FiChevronRight className="hidden lg:inline h-3.5 w-3.5 text-slate-300" />}
                  </div>
                  <div className="text-[11.5px] text-slate-500 mt-0.5 leading-snug">{s.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </motion.div>
  );
}
