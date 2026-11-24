import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import {
  FiBox,
  FiCheckCircle,
  FiCreditCard,
  FiHome,
  FiInfo,
  FiMapPin,
  FiPhone,
  FiPrinter,
  FiShield,
  FiTag,
  FiTruck,
  FiUser,
  FiUsers,
} from "react-icons/fi";
import { ResiBarcode } from "@/components/shared/ResiBarcode";
import { useAuth } from "../context/AuthContext.jsx";
import { apiFetch, formatRupiah, generateIdempotencyKey } from "../lib/api.js";

const EMPTY = {
  sender_name: "",
  sender_phone: "",
  sender_address: "",
  origin_city_id: "",
  origin_district_id: "",
  origin_village_id: "",
  origin_rt: "",
  origin_rw: "",
  origin_postal_code: "",
  receiver_name: "",
  receiver_phone: "",
  receiver_address: "",
  dest_city_id: "",
  dest_district_id: "",
  dest_village_id: "",
  dest_rt: "",
  dest_rw: "",
  dest_postal_code: "",
  service_code: "REG",
  package_type: "Umum",
  weight_kg: "1",
  length_cm: "20",
  width_cm: "15",
  height_cm: "10",
  declared_value: "0",
  use_insurance: false,
  payment_status: "PAID",
  channel: "LOKET",
};

export default function KirimPage() {
  const { isAuthenticated, showToast } = useAuth();
  const locationState = useLocation().state;
  const [ref, setRef] = useState({ cities: [], services: [] });
  const [originDistricts, setOriginDistricts] = useState([]);
  const [originVillages, setOriginVillages] = useState([]);
  const [destDistricts, setDestDistricts] = useState([]);
  const [destVillages, setDestVillages] = useState([]);
  const [form, setForm] = useState(() => ({
    ...EMPTY,
    ...(locationState || {}),
    payment_status: isAuthenticated ? "PAID" : "UNPAID",
    channel: isAuthenticated ? "LOKET" : "ONLINE",
  }));
  const [quote, setQuote] = useState(null);
  const [created, setCreated] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [idem, setIdem] = useState(generateIdempotencyKey);

  const set = (k) => (e) =>
    setForm((prev) => ({
      ...prev,
      [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    }));

  useEffect(() => {
    apiFetch("/api/reference")
      .then((data) => {
        setRef(data);
        const cities = data.cities || [];
        if (cities.length >= 2) {
          const sby = cities.find((c) => c.name.toLowerCase().includes("surabaya")) || cities[0];
          const sda = cities.find((c) => c.name.toLowerCase().includes("sidoarjo")) || cities[1];
          setForm((prev) => ({
            ...prev,
            origin_city_id: prev.origin_city_id || String(sby.id),
            dest_city_id: prev.dest_city_id || String(sda.id),
          }));
        }
      })
      .catch((e) => setError(e.message));
  }, []);

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

  const buildPayload = () => ({
    ...form,
    origin_city_id: Number(form.origin_city_id),
    origin_district_id: form.origin_district_id ? Number(form.origin_district_id) : null,
    origin_village_id: form.origin_village_id ? Number(form.origin_village_id) : null,
    dest_city_id: Number(form.dest_city_id),
    dest_district_id: form.dest_district_id ? Number(form.dest_district_id) : null,
    dest_village_id: form.dest_village_id ? Number(form.dest_village_id) : null,
    weight_kg: Number(form.weight_kg),
    length_cm: Number(form.length_cm || 0),
    width_cm: Number(form.width_cm || 0),
    height_cm: Number(form.height_cm || 0),
    declared_value: Number(form.declared_value || 0),
  });

  useEffect(() => {
    if (!form.origin_city_id || !form.dest_city_id || !Number(form.weight_kg)) return;
    let live = true;
    const t = setTimeout(() => {
      const b = buildPayload();
      apiFetch("/api/tariffs/quote", {
        method: "POST",
        body: {
          origin_city_id: b.origin_city_id,
          dest_city_id: b.dest_city_id,
          service_code: b.service_code,
          weight_kg: b.weight_kg,
          length_cm: b.length_cm,
          width_cm: b.width_cm,
          height_cm: b.height_cm,
          declared_value: b.declared_value,
          use_insurance: b.use_insurance,
        },
      })
        .then((r) => live && setQuote(r.quotes?.[0] || null))
        .catch(() => live && setQuote(null));
    }, 280);
    return () => {
      live = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    form.origin_city_id,
    form.dest_city_id,
    form.service_code,
    form.weight_kg,
    form.length_cm,
    form.width_cm,
    form.height_cm,
    form.declared_value,
    form.use_insurance,
  ]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const endpoint = isAuthenticated ? "/api/orders" : "/api/orders/public";
      const payload = buildPayload();
      if (!isAuthenticated) {
        payload.channel = "ONLINE";
        payload.payment_status = payload.payment_status === "COD" ? "COD" : "UNPAID";
      }
      const out = await apiFetch(endpoint, {
        method: "POST",
        body: payload,
        idempotencyKey: idem,
      });
      setCreated({ ...out, submitted_form: payload });
      setIdem(generateIdempotencyKey());
      setForm((prev) => ({
        ...EMPTY,
        origin_city_id: prev.origin_city_id,
        dest_city_id: prev.dest_city_id,
      }));
      showToast(`Resi berhasil diterbitkan: ${out.shipment.code}`, "success");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const inputWithIcon = (IconComp, props) => (
    <div className="relative">
      <IconComp className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
      <input
        {...props}
        className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15"
      />
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-5"
    >
      {/* Breadcrumb & Header */}
      <div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-2">
          <Link to="/" className="hover:text-blue-600 inline-flex items-center text-slate-500 no-underline">
            <FiHome className="h-3.5 w-3.5" />
          </Link>
          <span>/</span>
          <span>Operasional</span>
          <span>/</span>
          <span className="text-slate-700 font-bold">Buat Pesanan Pengiriman</span>
        </div>

        <div className="flex items-center gap-3.5">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-100/80 text-blue-700 shadow-xs">
            <FiBox className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
              Buat Pesanan Pengiriman
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Lengkapi informasi pengirim, penerima, dan paket untuk menerbitkan nomor resi.
            </p>
          </div>
        </div>
      </div>

      {/* Created Order Result Card with Auto-Generated Code128 Barcode */}
      {created && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-emerald-700">
                <FiCheckCircle className="h-4 w-4" />
                Pesanan Berhasil Diterbitkan
              </div>
              <div className="mono text-2xl font-extrabold text-emerald-950">{created.shipment.code}</div>
              <div className="text-sm text-emerald-800">
                {created.origin_city} → {created.dest_city} · <strong>{created.quote.service_name}</strong> · Total{" "}
                <strong>{formatRupiah(created.shipment.total_cost)}</strong>
              </div>
              <div className="pt-2 flex flex-wrap gap-2">
                <Link
                  to={`/lacak?code=${encodeURIComponent(created.shipment.code)}`}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-700 no-underline"
                >
                  Lihat Pelacakan
                </Link>
                <button
                  type="button"
                  onClick={() => setCreated(null)}
                  className="inline-flex min-h-[38px] items-center rounded-xl border border-emerald-300 bg-white px-4 text-xs font-bold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                >
                  Buat Pesanan Baru
                </button>
              </div>
            </div>
            <ResiBarcode
              code={created.shipment.code}
              originCity={created.origin_city}
              destCity={created.dest_city}
              serviceCode={created.shipment.service_code}
              packageType={created.shipment.package_type || created.submitted_form?.package_type}
              senderName={created.submitted_form?.sender_name}
              senderPhone={created.submitted_form?.sender_phone}
              senderAddress={created.submitted_form?.sender_address}
              receiverName={created.submitted_form?.receiver_name}
              receiverPhone={created.submitted_form?.receiver_phone}
              receiverAddress={created.submitted_form?.receiver_address}
              weightKg={created.shipment.chargeable_weight_kg || created.submitted_form?.weight_kg}
              totalCost={created.shipment.total_cost}
              paymentStatus={created.shipment.payment_status}
              channel={created.shipment.channel}
              createdAt={created.shipment.updated_at}
              showPrint
            />
          </div>
        </div>
      )}

      {/* Main 12-Col Form */}
      <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left 7 Cols: Pengirim & Penerima */}
        <div className="lg:col-span-7 space-y-5">
          {/* Card 1: Informasi Pengirim */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-600">
                <FiUser className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Informasi Pengirim</h2>
                <p className="text-xs text-slate-500">Data pihak yang mengirimkan paket.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Nama Pengirim <span className="text-rose-500">*</span>
                </label>
                {inputWithIcon(FiUser, {
                  value: form.sender_name,
                  onChange: set("sender_name"),
                  placeholder: "Nama lengkap pengirim",
                  required: true,
                })}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  No. HP Pengirim <span className="text-rose-500">*</span>
                </label>
                {inputWithIcon(FiPhone, {
                  value: form.sender_phone,
                  onChange: set("sender_phone"),
                  placeholder: "08xxxxxxxxxx",
                  required: true,
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Kota Asal <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <FiMapPin className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <select
                  value={form.origin_city_id}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      origin_city_id: e.target.value,
                      origin_district_id: "",
                      origin_village_id: "",
                      origin_postal_code: "",
                    }))
                  }
                  required
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-3 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
                >
                  <option value="">-- Pilih Kota / Kabupaten Asal --</option>
                  {ref.cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}, Jawa Timur
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Kecamatan Asal</label>
                <select
                  value={form.origin_district_id}
                  disabled={!form.origin_city_id}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      origin_district_id: e.target.value,
                      origin_village_id: "",
                      origin_postal_code: "",
                    }))
                  }
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
                >
                  <option value="">-- Pilih Kecamatan --</option>
                  {originDistricts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Kelurahan / Desa Asal</label>
                <select
                  value={form.origin_village_id}
                  disabled={!form.origin_district_id}
                  onChange={(e) => {
                    const v = originVillages.find((x) => String(x.id) === e.target.value);
                    setForm((prev) => ({
                      ...prev,
                      origin_village_id: e.target.value,
                      origin_postal_code: v?.postal_code || prev.origin_postal_code,
                    }));
                  }}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
                >
                  <option value="">-- Pilih Kelurahan / Desa --</option>
                  {originVillages.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.type === "KELURAHAN" ? "Kel." : "Desa"})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">RT</label>
                <input
                  value={form.origin_rt}
                  maxLength={3}
                  onChange={(e) => setForm({ ...form, origin_rt: e.target.value.replace(/\D/g, "") })}
                  placeholder="001"
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">RW</label>
                <input
                  value={form.origin_rw}
                  maxLength={3}
                  onChange={(e) => setForm({ ...form, origin_rw: e.target.value.replace(/\D/g, "") })}
                  placeholder="002"
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Kode Pos</label>
                <input
                  value={form.origin_postal_code}
                  maxLength={5}
                  onChange={(e) => setForm({ ...form, origin_postal_code: e.target.value.replace(/\D/g, "") })}
                  placeholder="60293"
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 font-mono text-xs font-bold text-blue-700"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Alamat Pengirim <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <FiHome className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <textarea
                  rows={2}
                  value={form.sender_address}
                  onChange={set("sender_address")}
                  placeholder="Jalan, nomor rumah, kecamatan, kode pos..."
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Informasi Penerima */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-600">
                <FiUsers className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Informasi Penerima</h2>
                <p className="text-xs text-slate-500">Data pihak yang menerima paket.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Nama Penerima <span className="text-rose-500">*</span>
                </label>
                {inputWithIcon(FiUser, {
                  value: form.receiver_name,
                  onChange: set("receiver_name"),
                  placeholder: "Nama lengkap penerima",
                  required: true,
                })}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  No. HP Penerima <span className="text-rose-500">*</span>
                </label>
                {inputWithIcon(FiPhone, {
                  value: form.receiver_phone,
                  onChange: set("receiver_phone"),
                  placeholder: "08xxxxxxxxxx",
                  required: true,
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Kota Tujuan <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <FiMapPin className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <select
                  value={form.dest_city_id}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      dest_city_id: e.target.value,
                      dest_district_id: "",
                      dest_village_id: "",
                      dest_postal_code: "",
                    }))
                  }
                  required
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-3 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
                >
                  <option value="">-- Pilih Kota / Kabupaten Tujuan --</option>
                  {ref.cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}, Jawa Timur
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Kecamatan Tujuan</label>
                <select
                  value={form.dest_district_id}
                  disabled={!form.dest_city_id}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      dest_district_id: e.target.value,
                      dest_village_id: "",
                      dest_postal_code: "",
                    }))
                  }
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
                >
                  <option value="">-- Pilih Kecamatan --</option>
                  {destDistricts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Kelurahan / Desa Tujuan</label>
                <select
                  value={form.dest_village_id}
                  disabled={!form.dest_district_id}
                  onChange={(e) => {
                    const v = destVillages.find((x) => String(x.id) === e.target.value);
                    setForm((prev) => ({
                      ...prev,
                      dest_village_id: e.target.value,
                      dest_postal_code: v?.postal_code || prev.dest_postal_code,
                    }));
                  }}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
                >
                  <option value="">-- Pilih Kelurahan / Desa --</option>
                  {destVillages.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.type === "KELURAHAN" ? "Kel." : "Desa"})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">RT</label>
                <input
                  value={form.dest_rt}
                  maxLength={3}
                  onChange={(e) => setForm({ ...form, dest_rt: e.target.value.replace(/\D/g, "") })}
                  placeholder="001"
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">RW</label>
                <input
                  value={form.dest_rw}
                  maxLength={3}
                  onChange={(e) => setForm({ ...form, dest_rw: e.target.value.replace(/\D/g, "") })}
                  placeholder="002"
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Kode Pos</label>
                <input
                  value={form.dest_postal_code}
                  maxLength={5}
                  onChange={(e) => setForm({ ...form, dest_postal_code: e.target.value.replace(/\D/g, "") })}
                  placeholder="61211"
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 font-mono text-xs font-bold text-blue-700"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Alamat Penerima <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <FiHome className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <textarea
                  rows={2}
                  value={form.receiver_address}
                  onChange={set("receiver_address")}
                  placeholder="Jalan, nomor rumah, kecamatan, kode pos..."
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Detail Paket, Pembayaran, Estimasi Biaya */}
        <div className="lg:col-span-5 space-y-5">
          {/* Card 3: Detail Paket */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-600">
                <FiBox className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Detail Paket</h2>
                <p className="text-xs text-slate-500">Informasi layanan, berat, dan dimensi paket.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Layanan <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <FiTruck className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <select
                    value={form.service_code}
                    onChange={set("service_code")}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-3 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
                  >
                    {(ref.services.length
                      ? ref.services
                      : [
                          { code: "REG", name: "Reguler" },
                          { code: "EXP", name: "Ekspres" },
                          { code: "SDY", name: "Sameday" },
                        ]
                    ).map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Jenis Paket <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <FiBox className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <select
                    value={form.package_type || "Umum"}
                    onChange={set("package_type")}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-3 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
                  >
                    {["Umum", "Dokumen", "Elektronik", "Pakaian", "Makanan", "Pecah Belah"].map((pt) => (
                      <option key={pt} value={pt}>
                        {pt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Berat (kg) <span className="text-rose-500">*</span>
                </label>
                {inputWithIcon(FiBox, {
                  type: "number",
                  min: "0.1",
                  step: "0.1",
                  value: form.weight_kg,
                  onChange: set("weight_kg"),
                  required: true,
                })}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Nilai Barang (Rp)</label>
                {inputWithIcon(FiTag, {
                  type: "number",
                  min: "0",
                  step: "1000",
                  value: form.declared_value,
                  onChange: set("declared_value"),
                })}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Panjang (cm)</label>
                <input
                  type="number"
                  min="0"
                  value={form.length_cm}
                  onChange={set("length_cm")}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Lebar (cm)</label>
                <input
                  type="number"
                  min="0"
                  value={form.width_cm}
                  onChange={set("width_cm")}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Tinggi (cm)</label>
                <input
                  type="number"
                  min="0"
                  value={form.height_cm}
                  onChange={set("height_cm")}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Card 4: Pembayaran dan Pengiriman */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-600">
                <FiCreditCard className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Pembayaran dan Pengiriman</h2>
                <p className="text-xs text-slate-500">Metode pembayaran dan kanal pengiriman.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Pembayaran <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.payment_status}
                  onChange={set("payment_status")}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-xs sm:text-sm font-semibold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
                >
                  {isAuthenticated && <option value="PAID">Lunas</option>}
                  <option value="COD">COD (Bayar di Tempat)</option>
                  <option value="UNPAID">Bayar Saat Pickup</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Kanal <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.channel}
                  onChange={set("channel")}
                  disabled={!isAuthenticated}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-xs sm:text-sm font-semibold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none disabled:opacity-75"
                >
                  {isAuthenticated && <option value="LOKET">Loket</option>}
                  <option value="ONLINE">Online (Pickup Kurir)</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.use_insurance}
                onChange={set("use_insurance")}
                className="h-4 w-4 rounded accent-blue-600"
              />
              <FiShield className="h-4 w-4 text-blue-600" />
              Sertakan asuransi barang
            </label>
          </div>

          {/* Card 5: Estimasi Biaya + Submit Button */}
          <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-br from-[#eef5ff] to-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-extrabold text-slate-900">Estimasi Biaya</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {quote
                    ? `Berat tagih ${quote.chargeable_weight_kg} kg · Estimasi otomatis dari server`
                    : "Pilih kota asal, tujuan, dan berat paket"}
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-blue-700 whitespace-nowrap">
                {quote ? formatRupiah(quote.total_cost) : "Rp 0"}
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1d5bd6] to-[#0b68d9] px-5 text-sm font-extrabold text-white shadow-md shadow-blue-900/15 hover:opacity-95 transition-opacity cursor-pointer disabled:opacity-60"
            >
              <FiPrinter className="h-4 w-4" />
              {busy ? "Menyimpan Pesanan..." : "Simpan dan Terbitkan Resi"}
            </button>
          </div>

          {/* Card 6: Panduan & Ketentuan Pengiriman (Balances right column on desktop) */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600">
                <FiInfo className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Ketentuan Pengiriman</h3>
                <p className="text-[11px] text-slate-500">Ringkasan layanan dan perhitungan berat paket.</p>
              </div>
            </div>
            <ul className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                <span>
                  <strong className="text-slate-800">Berat Volumetrik:</strong> Jika dimensi diisi, sistem memilih nilai terbesar antara berat aktual dan <span className="font-semibold text-slate-700">(P x L x T) / 6.000</span>.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                <span>
                  <strong className="text-slate-800">Jangkauan Jawa Timur:</strong> Pickup kurir dan pengiriman mencakup 38 kabupaten/kota serta 32 titik hub aktif.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                <span>
                  <strong className="text-slate-800">Asuransi Barang:</strong> Melindungi paket bernilai tinggi dari risiko kehilangan atau kerusakan selama transit.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </form>

      {/* Bottom Info Notice */}
      <div className="flex items-center gap-2.5 rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-xs font-semibold text-blue-800">
        <FiInfo className="h-4 w-4 shrink-0 text-blue-600" />
        Biaya pengiriman dan nomor resi akan dihitung serta diterbitkan secara otomatis oleh sistem berdasarkan data yang Anda masukkan.
      </div>
    </motion.div>
  );
}
