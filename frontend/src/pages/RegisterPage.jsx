import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiAward,
  FiCalendar,
  FiCheck,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClipboard,
  FiClock,
  FiCreditCard,
  FiEye,
  FiEyeOff,
  FiHeadphones,
  FiHeart,
  FiHome,
  FiLock,
  FiMail,
  FiMapPin,
  FiMessageCircle,
  FiPhone,
  FiSearch,
  FiSmartphone,
  FiTruck,
  FiUploadCloud,
  FiUser,
  FiUsers,
  FiXCircle,
} from "react-icons/fi";
import { apiFetch } from "../lib/api.js";

const STEPS = [
  { num: 1, label: "Identitas" },
  { num: 2, label: "Kendaraan dan Dokumen" },
  { num: 3, label: "Rekening dan Kontak Darurat" },
  { num: 4, label: "Area dan Jadwal" },
  { num: 5, label: "Konfirmasi" },
];

export default function RegisterPage() {
  const [hubs, setHubs] = useState([]);
  const [cities, setCities] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [villages, setVillages] = useState([]);
  const [vehicleModels, setVehicleModels] = useState([]);
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(null);

  const [form, setForm] = useState({
    // Step 1: Identitas
    full_name: "",
    nik: "",
    birth_place: "",
    birth_date: "",
    gender: "Laki-laki",
    marital_status: "",
    phone: "",
    email: "",
    address: "",
    province: "Jawa Timur",
    city_id: "",
    city: "",
    district_id: "",
    district: "",
    village_id: "",
    village: "",
    rt: "",
    rw: "",
    postal_code: "",

    // Step 2: Kendaraan dan Dokumen
    vehicle_type: "Sepeda Motor",
    vehicle_model_id: "",
    vehicle_year: "2023",
    plate_number: "",
    vehicle_brand: "",
    sim_number: "",
    doc_ktp_url: "",
    doc_sim_url: "",
    doc_stnk_url: "",
    doc_selfie_url: "",

    // Step 3: Rekening dan Kontak Darurat
    bank_name: "BRI",
    bank_account: "",
    bank_holder: "",
    emergency_name: "",
    emergency_phone: "",

    // Step 4: Area dan Jadwal
    hub_id: "",
    station: "",
    shift: "Penuh Waktu (08:00 - 17:00)",

    // Step 5: Akun Login & Konfirmasi
    username: "",
    password: "",
    agreed: false,
  });

  useEffect(() => {
    apiFetch("/api/reference")
      .then((data) => {
        setHubs(data.hubs || []);
        setCities(data.cities || []);
      })
      .catch(() => {});
    apiFetch("/api/reference/vehicles")
      .then((list) => setVehicleModels(Array.isArray(list) ? list : []))
      .catch(() => {});
  }, []);

  const handleHubChange = (val) => {
    const selected = hubs.find((h) => String(h.id) === val);
    setForm((prev) => ({
      ...prev,
      hub_id: val,
      station: selected ? selected.name : prev.station,
    }));
  };

  const handleCityChange = async (cityId) => {
    const selected = cities.find((c) => String(c.id) === cityId);
    setForm((prev) => ({
      ...prev,
      city_id: cityId,
      city: selected ? selected.name : "",
      district_id: "",
      district: "",
      village_id: "",
      village: "",
      postal_code: "",
    }));
    setDistricts([]);
    setVillages([]);
    if (cityId) {
      try {
        const list = await apiFetch(`/api/reference/districts?city_id=${encodeURIComponent(cityId)}`);
        setDistricts(Array.isArray(list) ? list : []);
      } catch {
        setDistricts([]);
      }
    }
  };

  const handleDistrictChange = async (districtId) => {
    const selected = districts.find((d) => String(d.id) === districtId);
    setForm((prev) => ({
      ...prev,
      district_id: districtId,
      district: selected ? selected.name : "",
      village_id: "",
      village: "",
      postal_code: "",
    }));
    setVillages([]);
    if (districtId) {
      try {
        const list = await apiFetch(`/api/reference/villages?district_id=${encodeURIComponent(districtId)}`);
        setVillages(Array.isArray(list) ? list : []);
      } catch {
        setVillages([]);
      }
    }
  };

  const handleVillageChange = (villageId) => {
    const selected = villages.find((v) => String(v.id) === villageId);
    setForm((prev) => ({
      ...prev,
      village_id: villageId,
      village: selected ? selected.name : "",
      postal_code: selected?.postal_code || prev.postal_code,
    }));
  };

  function validateStep(currentStep) {
    setError("");
    if (currentStep === 1) {
      if (!form.full_name.trim()) return "Nama lengkap wajib diisi.";
      if (!/^\d{16}$/.test(form.nik.trim())) return "Nomor NIK harus tepat 16 digit angka.";
      if (!form.phone.trim()) return "Nomor Handphone (WhatsApp) wajib diisi.";
      if (!form.email.trim()) return "Alamat Email wajib diisi.";
    }
    if (currentStep === 4) {
      if (!form.hub_id && !form.station.trim()) return "Silakan pilih Gerai atau Hub penempatan di Jawa Timur.";
    }
    if (currentStep === 5) {
      if (!form.username.trim() || form.username.trim().length < 3) {
        return "Nama pengguna minimal 3 karakter.";
      }
      if (!form.password || form.password.length < 6) {
        return "Kata sandi minimal 6 karakter.";
      }
      if (!form.agreed) {
        return "Mohon centang pernyataan kebenaran data terlebih dahulu.";
      }
    }
    return "";
  }

  function handleNext() {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setStep((s) => Math.min(5, s + 1));
  }

  function handlePrev() {
    setError("");
    setStep((s) => Math.max(1, s - 1));
  }

  const [uploadingDoc, setUploadingDoc] = useState("");

  const handleDocUpload = async (docType, file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Ukuran foto dokumen maksimal 5 MB.");
      return;
    }
    setUploadingDoc(docType);
    setError("");
    try {
      const fd = new FormData();
      fd.append("doc_type", docType);
      fd.append("file", file);
      const res = await apiFetch("/api/auth/register-doc", {
        method: "POST",
        body: fd,
        isFormData: true,
      });
      setForm((prev) => ({ ...prev, [`doc_${docType}_url`]: res.url }));
    } catch (err) {
      setError(err.message || `Gagal mengunggah dokumen ${docType.toUpperCase()}.`);
    } finally {
      setUploadingDoc("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validateStep(5);
    if (err) {
      setError(err);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const out = await apiFetch("/api/auth/register", {
        method: "POST",
        body: {
          role: "kurir",
          full_name: form.full_name.trim(),
          nik: form.nik.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          station: form.station.trim(),
          hub_id: form.hub_id ? Number(form.hub_id) : null,
          city_id: form.city_id ? Number(form.city_id) : null,
          district_id: form.district_id ? Number(form.district_id) : null,
          village_id: form.village_id ? Number(form.village_id) : null,
          rt: form.rt?.trim() || null,
          rw: form.rw?.trim() || null,
          postal_code: form.postal_code?.trim() || null,
          vehicle_type: form.vehicle_type || null,
          vehicle_model_id: form.vehicle_model_id ? Number(form.vehicle_model_id) : null,
          vehicle_year: form.vehicle_year ? Number(form.vehicle_year) : null,
          plate_number: form.plate_number?.trim() || null,
          sim_number: form.sim_number?.trim() || null,
          doc_ktp_url: form.doc_ktp_url || null,
          doc_sim_url: form.doc_sim_url || null,
          doc_stnk_url: form.doc_stnk_url || null,
          doc_selfie_url: form.doc_selfie_url || null,
          username: form.username.trim(),
          password: form.password,
        },
      });
      setCreated(out);
    } catch (err) {
      setError(err.message || "Pendaftaran gagal. Periksa kembali data yang dimasukkan.");
    } finally {
      setLoading(false);
    }
  };

  if (created) {
    return (
      <div className="mx-auto max-w-[640px] py-8 px-4">
        <div className="rounded-3xl border border-emerald-200 bg-white p-8 shadow-xl space-y-5 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <FiCheckCircle className="h-9 w-9" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              Pendaftaran Kurir Berhasil Dikirim
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {created.message || "Pengajuan Anda sedang dalam antrean verifikasi administrator LacakIn."}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Kode Pegawai</span>
              <span className="font-mono font-extrabold text-slate-900">{created.user?.employee_code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Nama Lengkap</span>
              <span className="font-bold text-slate-900">{created.user?.full_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Hub Penempatan</span>
              <span className="font-bold text-slate-900">{form.station || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Status Pengajuan</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                Dalam Review Admin
              </span>
            </div>
          </div>

          <Link
            to="/login"
            className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-6 text-sm font-extrabold text-white shadow-sm no-underline"
          >
            Kembali ke Halaman Masuk
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 pb-10 items-start">
      {/* LEFT BLUE PROMO COLUMN */}
      <aside className="xl:col-span-3 rounded-3xl overflow-hidden bg-gradient-to-b from-[#0b2363] via-[#1342a6] to-[#2367df] text-white p-5 sm:p-6 shadow-xl space-y-5">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-xs font-bold text-sky-200 border border-white/15">
          <FiUsers className="h-3.5 w-3.5 text-sky-300" />
          Bergabung Bersama LacakIn
        </div>

        <div className="space-y-2.5">
          <h1 className="text-2xl sm:text-[26px] font-extrabold tracking-tight leading-tight">
            Daftar Menjadi <span className="text-sky-300">Kurir LacakIn</span>
          </h1>
          <p className="text-xs text-blue-100/90 leading-relaxed">
            Jadilah bagian dari tim pengiriman profesional LacakIn dan dapatkan penghasilan yang kompetitif, fleksibel, serta didukung oleh sistem yang terintegrasi.
          </p>
        </div>

        {/* Courier Showcase */}
        <div className="overflow-hidden rounded-2xl bg-white/10 border border-white/15 p-1.5">
          <img
            src="/images/courier-mascot.webp"
            alt="Kurir LacakIn Jawa Timur"
            className="h-[210px] w-full rounded-xl object-contain bg-[#eef3f9]"
          />
        </div>

        {/* 4 White Benefit Cards */}
        <div className="space-y-2.5">
          {[
            { icon: FiAward, title: "Penghasilan Kompetitif", desc: "Insentif menarik dan transparan." },
            { icon: FiCalendar, title: "Waktu Kerja Fleksibel", desc: "Atur jadwal sesuai ketersediaan Anda." },
            { icon: FiSmartphone, title: "Dukungan Sistem Lengkap", desc: "Aplikasi kurir, navigasi, dan tracking real-time." },
            { icon: FiHeart, title: "Berkembang Bersama", desc: "Kesempatan karier jangka panjang di LacakIn." },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="flex items-center gap-3 rounded-2xl bg-white p-3 text-slate-900 shadow-sm"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-extrabold text-slate-900 truncate">{item.title}</div>
                  <div className="text-[11px] text-slate-500 leading-snug">{item.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* CENTER MULTI-STEP FORM */}
      <section className="xl:col-span-6 rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-7 shadow-sm space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
            Pendaftaran Kurir LacakIn
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Lengkapi data diri Anda dengan benar dan sesuai. Pastikan seluruh dokumen yang diunggah jelas dan valid.
          </p>
        </div>

        {/* 5-Step Progress Stepper */}
        <div className="relative flex items-start justify-between gap-1 pt-1">
          <div className="pointer-events-none absolute left-6 right-6 top-5 h-0.5 bg-slate-200" />
          {STEPS.map((s) => {
            const isActive = step === s.num;
            const isDone = step > s.num;
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => {
                  if (s.num <= step) {
                    setError("");
                    setStep(s.num);
                  }
                }}
                className="relative z-10 flex flex-1 flex-col items-center text-center gap-1.5 cursor-pointer"
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-extrabold transition-all ${
                    isActive
                      ? "bg-blue-600 text-white ring-4 ring-blue-100 shadow-md"
                      : isDone
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-100 text-slate-500 border border-slate-200"
                  }`}
                >
                  {isDone ? <FiCheck className="h-4 w-4" /> : s.num}
                </div>
                <span
                  className={`text-[11px] leading-tight font-bold max-w-[90px] ${
                    isActive ? "text-blue-700" : isDone ? "text-emerald-700" : "text-slate-500"
                  }`}
                >
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* STEP 1: IDENTITAS */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Sub-card 1: Identitas Pribadi */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4 sm:p-5 space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-extrabold text-white">
                    1
                  </span>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                    Identitas Pribadi
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label htmlFor="reg-name" className="block text-xs font-bold text-slate-700 mb-1.5">
                      Nama Lengkap <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <FiUser className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                      <input
                        id="reg-name"
                        type="text"
                        value={form.full_name}
                        onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                        placeholder="Masukkan nama sesuai KTP"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-base sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="reg-nik" className="block text-xs font-bold text-slate-700 mb-1.5">
                      Nomor NIK (KTP) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <FiCreditCard className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                      <input
                        id="reg-nik"
                        type="text"
                        maxLength={16}
                        value={form.nik}
                        onChange={(e) => setForm({ ...form, nik: e.target.value.replace(/\D/g, "") })}
                        placeholder="16 digit nomor NIK"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 font-mono text-base sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="reg-bplace" className="block text-xs font-bold text-slate-700 mb-1.5">
                      Tempat Lahir
                    </label>
                    <div className="relative flex items-center">
                      <FiMapPin className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                      <input
                        id="reg-bplace"
                        type="text"
                        value={form.birth_place}
                        onChange={(e) => setForm({ ...form, birth_place: e.target.value })}
                        placeholder="Contoh: Surabaya"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-base sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="reg-bdate" className="block text-xs font-bold text-slate-700 mb-1.5">
                      Tanggal Lahir
                    </label>
                    <div className="relative flex items-center">
                      <FiCalendar className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                      <input
                        id="reg-bdate"
                        type="date"
                        value={form.birth_date}
                        onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-base sm:text-sm font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="block text-xs font-bold text-slate-700 mb-2">
                      Jenis Kelamin <span className="text-rose-500">*</span>
                    </span>
                    <div className="flex items-center gap-4 pt-1">
                      {["Laki-laki", "Perempuan"].map((g) => (
                        <label
                          key={g}
                          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-700 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name="gender"
                            checked={form.gender === g}
                            onChange={() => setForm({ ...form, gender: g })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                          />
                          <span>{g}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="reg-status" className="block text-xs font-bold text-slate-700 mb-1.5">
                      Status
                    </label>
                    <select
                      id="reg-status"
                      value={form.marital_status}
                      onChange={(e) => setForm({ ...form, marital_status: e.target.value })}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base sm:text-sm font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="">Pilih status</option>
                      <option value="Belum Menikah">Belum Menikah</option>
                      <option value="Menikah">Menikah</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Sub-card 2: Informasi Kontak */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4 sm:p-5 space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-extrabold text-white">
                    2
                  </span>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                    Informasi Kontak
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label htmlFor="reg-phone" className="block text-xs font-bold text-slate-700 mb-1.5">
                      Nomor Handphone (WhatsApp) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <FiPhone className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                      <input
                        id="reg-phone"
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="Contoh: 0812xxxxxxxx"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-base sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="reg-email" className="block text-xs font-bold text-slate-700 mb-1.5">
                      Email <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <FiMail className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                      <input
                        id="reg-email"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="Contoh: nama@email.com"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-base sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sub-card 3: Alamat Domisili */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4 sm:p-5 space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-extrabold text-white">
                    3
                  </span>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                    Alamat Domisili
                  </h3>
                </div>

                <div>
                  <label htmlFor="reg-address" className="block text-xs font-bold text-slate-700 mb-1.5">
                    Alamat Lengkap
                  </label>
                  <div className="relative">
                    <FiHome className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                    <textarea
                      id="reg-address"
                      rows={2}
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      placeholder="Masukkan alamat lengkap (jalan, nomor, RT/RW, kelurahan)"
                      className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 py-2.5 text-base sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Provinsi</label>
                    <select
                      value={form.province}
                      onChange={(e) => setForm({ ...form, province: e.target.value })}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="Jawa Timur">Jawa Timur</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Kota/Kabupaten</label>
                    <select
                      value={form.city_id}
                      onChange={(e) => handleCityChange(e.target.value)}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Pilih kota</option>
                      {cities.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.type === "KOTA" ? "Kota " : "Kab. "}{c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Kecamatan</label>
                    <select
                      value={form.district_id}
                      disabled={!form.city_id}
                      onChange={(e) => handleDistrictChange(e.target.value)}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none disabled:bg-slate-100"
                    >
                      <option value="">Pilih kecamatan</option>
                      {districts.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Kelurahan/Desa</label>
                    <select
                      value={form.village_id}
                      disabled={!form.district_id}
                      onChange={(e) => handleVillageChange(e.target.value)}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none disabled:bg-slate-100"
                    >
                      <option value="">Pilih kelurahan</option>
                      {villages.map((v) => (
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
                      type="text"
                      maxLength={3}
                      value={form.rt}
                      onChange={(e) => setForm({ ...form, rt: e.target.value.replace(/\D/g, "") })}
                      placeholder="004"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-2.5 font-mono text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">RW</label>
                    <input
                      type="text"
                      maxLength={3}
                      value={form.rw}
                      onChange={(e) => setForm({ ...form, rw: e.target.value.replace(/\D/g, "") })}
                      placeholder="007"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-2.5 font-mono text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Kode Pos</label>
                    <input
                      type="text"
                      maxLength={5}
                      value={form.postal_code}
                      onChange={(e) => setForm({ ...form, postal_code: e.target.value.replace(/\D/g, "") })}
                      placeholder="60237"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-2.5 font-mono text-xs font-bold text-blue-700 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: KENDARAAN DAN DOKUMEN */}
          {step === 2 && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-5 space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-extrabold text-white">
                  2
                </span>
                <h3 className="text-base font-extrabold text-slate-900">Kendaraan dan Dokumen</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Jenis Kendaraan</label>
                  <select
                    value={form.vehicle_type}
                    onChange={(e) => {
                      setVehicleSearch("");
                      setForm({
                        ...form,
                        vehicle_type: e.target.value,
                        vehicle_model_id: "",
                        vehicle_brand: "",
                      });
                    }}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="Sepeda Motor">Sepeda Motor</option>
                    <option value="Mobil Van / Blind Van">Mobil Van / Blind Van</option>
                    <option value="Pick Up / Box">Pick Up / Box</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Nomor Polisi (Plat)</label>
                  <input
                    type="text"
                    value={form.plate_number}
                    onChange={(e) => setForm({ ...form, plate_number: e.target.value.toUpperCase() })}
                    placeholder="Contoh: L 1234 AB"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2 space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Cari dan Pilih Merek / Model Kendaraan (Terdaftar di Sistem)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    <div className="sm:col-span-5 relative flex items-center">
                      <FiSearch className="absolute left-3 h-4 w-4 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={vehicleSearch}
                        onChange={(e) => setVehicleSearch(e.target.value)}
                        placeholder={`Cari merek ${form.vehicle_type.toLowerCase()}...`}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-7">
                      {(() => {
                        const q = vehicleSearch.trim().toLowerCase();
                        const modelsForType = vehicleModels.filter(
                          (m) =>
                            m.vehicle_type === form.vehicle_type &&
                            (!q ||
                              m.brand.toLowerCase().includes(q) ||
                              m.model.toLowerCase().includes(q))
                        );
                        return (
                          <select
                            value={form.vehicle_model_id}
                            onChange={(e) => {
                              const picked = vehicleModels.find(
                                (x) => String(x.id) === e.target.value
                              );
                              const minYr = picked?.min_year || 2016;
                              setForm((prev) => ({
                                ...prev,
                                vehicle_model_id: e.target.value,
                                vehicle_brand: picked ? `${picked.brand} ${picked.model}` : "",
                                vehicle_year:
                                  Number(prev.vehicle_year) < minYr
                                    ? String(minYr)
                                    : prev.vehicle_year,
                              }));
                            }}
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm font-semibold text-slate-800 focus:border-blue-500 focus:outline-none"
                          >
                            <option value="">
                              -- Pilih Merek dan Model ({modelsForType.length} tersedia) --
                            </option>
                            {modelsForType.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.brand} {m.model} (Min. Tahun {m.min_year})
                              </option>
                            ))}
                          </select>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Tahun Kendaraan{" "}
                    {(() => {
                      const picked = vehicleModels.find(
                        (x) => String(x.id) === String(form.vehicle_model_id)
                      );
                      return picked ? (
                        <span className="text-blue-600">(Minimal {picked.min_year})</span>
                      ) : null;
                    })()}
                  </label>
                  {(() => {
                    const picked = vehicleModels.find(
                      (x) => String(x.id) === String(form.vehicle_model_id)
                    );
                    const minYr = picked?.min_year || (form.vehicle_type === "Sepeda Motor" ? 2016 : 2015);
                    const years = [];
                    for (let y = 2026; y >= minYr; y -= 1) years.push(y);
                    return (
                      <select
                        value={form.vehicle_year}
                        onChange={(e) => setForm({ ...form, vehicle_year: e.target.value })}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:outline-none"
                      >
                        {years.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    );
                  })()}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Nomor SIM Aktif</label>
                  <input
                    type="text"
                    value={form.sim_number}
                    onChange={(e) => setForm({ ...form, sim_number: e.target.value })}
                    placeholder="Nomor SIM C / SIM A"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 font-mono text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Upload 4 Dokumen Persyaratan */}
              <div className="pt-2 border-t border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-800">
                    Unggah Foto Dokumen Persyaratan (JPG / PNG / WEBP, maks. 5 MB)
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">
                    Ditinjau Admin / Supervisor
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: "ktp", label: "Foto KTP Asli" },
                    { key: "sim", label: "Foto SIM C / A Aktif" },
                    { key: "stnk", label: "Foto STNK Kendaraan" },
                    { key: "selfie", label: "Swafoto Memegang KTP" },
                  ].map((doc) => {
                    const url = form[`doc_${doc.key}_url`];
                    const isUp = uploadingDoc === doc.key;
                    return (
                      <label
                        key={doc.key}
                        className={`flex items-center gap-3 rounded-2xl border border-dashed p-3 cursor-pointer transition-colors ${
                          url
                            ? "border-emerald-300 bg-emerald-50/50"
                            : "border-slate-300 bg-white hover:border-blue-400 hover:bg-blue-50/30"
                        }`}
                      >
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(e) => handleDocUpload(doc.key, e.target.files?.[0])}
                        />
                        {url ? (
                          <img
                            src={url}
                            alt={doc.label}
                            className="h-12 w-12 rounded-xl object-cover border border-emerald-200 shrink-0"
                          />
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                            <FiUploadCloud className="h-5 w-5" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-extrabold text-slate-800">{doc.label}</div>
                          <div className="text-[11px] font-semibold text-slate-500 truncate">
                            {isUp ? "Mengunggah..." : url ? "Terunggah · Klik untuk ganti" : "Klik untuk pilih foto"}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: REKENING DAN KONTAK DARURAT */}
          {step === 3 && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-5 space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-extrabold text-white">
                  3
                </span>
                <h3 className="text-base font-extrabold text-slate-900">Rekening dan Kontak Darurat</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Nama Bank</label>
                  <select
                    value={form.bank_name}
                    onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="BRI">Bank BRI</option>
                    <option value="BCA">Bank BCA</option>
                    <option value="Mandiri">Bank Mandiri</option>
                    <option value="BNI">Bank BNI</option>
                    <option value="Bank Jatim">Bank Jatim</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Nomor Rekening</label>
                  <input
                    type="text"
                    value={form.bank_account}
                    onChange={(e) => setForm({ ...form, bank_account: e.target.value.replace(/\D/g, "") })}
                    placeholder="Nomor rekening pencairan insentif"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 font-mono text-sm font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Nama Pemilik Rekening</label>
                  <input
                    type="text"
                    value={form.bank_holder}
                    onChange={(e) => setForm({ ...form, bank_holder: e.target.value })}
                    placeholder="Sesuai buku tabungan / KTP"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Nama Kontak Darurat</label>
                  <input
                    type="text"
                    value={form.emergency_name}
                    onChange={(e) => setForm({ ...form, emergency_name: e.target.value })}
                    placeholder="Keluarga / kerabat terdekat"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Nomor HP Kontak Darurat</label>
                  <input
                    type="tel"
                    value={form.emergency_phone}
                    onChange={(e) => setForm({ ...form, emergency_phone: e.target.value })}
                    placeholder="08xxxxxxxxxx"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: AREA DAN JADWAL */}
          {step === 4 && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-5 space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-extrabold text-white">
                  4
                </span>
                <h3 className="text-base font-extrabold text-slate-900">Area Penempatan dan Jadwal</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="reg-hub" className="block text-xs font-bold text-slate-700 mb-1.5">
                    Gerai atau Hub Penempatan (Jawa Timur) <span className="text-rose-500">*</span>
                  </label>
                  {hubs.length > 0 ? (
                    <select
                      id="reg-hub"
                      value={form.hub_id}
                      onChange={(e) => handleHubChange(e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">-- Pilih Gerai / Hub Penempatan --</option>
                      {hubs.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name} ({h.city_name})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id="reg-hub"
                      type="text"
                      value={form.station}
                      onChange={(e) => setForm({ ...form, station: e.target.value })}
                      placeholder="Contoh: Hub Surabaya Pusat"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Pilihan Jadwal Kerja</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {[
                      "Pagi (07:00 - 15:00)",
                      "Siang (12:00 - 20:00)",
                      "Penuh Waktu (08:00 - 17:00)",
                    ].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setForm({ ...form, shift: opt })}
                        className={`min-h-[44px] rounded-xl border px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                          form.shift === opt
                            ? "border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: KONFIRMASI & AKUN LOGIN */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-5 space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-extrabold text-white">
                    5
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900">Akun Akses Kurir dan Konfirmasi</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="reg-user" className="block text-xs font-bold text-slate-700 mb-1.5">
                      Nama Pengguna (Username) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="reg-user"
                      type="text"
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                      placeholder="Contoh: budi.kurir"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="reg-pass" className="block text-xs font-bold text-slate-700 mb-1.5">
                      Kata Sandi (Min. 6 Karakter) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <FiLock className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                      <input
                        id="reg-pass"
                        type={showPass ? "text" : "password"}
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        placeholder="Minimal 6 karakter"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-11 text-sm font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass((v) => !v)}
                        className="absolute right-2.5 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPass ? <FiEye className="h-4 w-4" /> : <FiEyeOff className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Summary Box */}
                <div className="rounded-xl border border-blue-100 bg-white p-4 space-y-1.5 text-xs">
                  <div className="font-extrabold text-slate-800 mb-2">Ringkasan Pendaftaran</div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Nama Lengkap</span>
                    <span className="font-bold text-slate-900">{form.full_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">NIK (16 Digit)</span>
                    <span className="font-mono font-bold text-slate-900">{form.nik}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">WhatsApp / Email</span>
                    <span className="font-bold text-slate-900">{form.phone} / {form.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Hub Penempatan</span>
                    <span className="font-bold text-slate-900">{form.station || "-"}</span>
                  </div>
                </div>

                <label className="flex items-start gap-2.5 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.agreed}
                    onChange={(e) => setForm({ ...form, agreed: e.target.checked })}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600"
                  />
                  <span>
                    Saya menyatakan bahwa seluruh data dan identitas yang diisikan adalah benar dan siap diverifikasi oleh administrator LacakIn.
                  </span>
                </label>
              </div>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700"
            >
              {error}
            </div>
          )}

          {/* Bottom Navigation Buttons */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handlePrev}
              disabled={step === 1}
              className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border px-5 text-sm font-bold transition-colors ${
                step === 1
                  ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer"
              }`}
            >
              <FiChevronLeft className="h-4 w-4" />
              <span>Sebelumnya</span>
            </button>

            {step < 5 ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] hover:from-[#1d4ed8] hover:to-[#1e40af] px-6 text-sm font-extrabold text-white shadow-md shadow-blue-600/20 cursor-pointer"
              >
                <span>Selanjutnya</span>
                <FiChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] hover:from-[#1d4ed8] hover:to-[#1e40af] px-6 text-sm font-extrabold text-white shadow-md shadow-blue-600/20 cursor-pointer disabled:opacity-60"
              >
                <FiCheckCircle className="h-4 w-4" />
                <span>{loading ? "Mengirim..." : "Kirim Pendaftaran"}</span>
              </button>
            )}
          </div>
        </form>
      </section>

      {/* RIGHT INFO & STATUS SIDEBAR */}
      <aside className="xl:col-span-3 space-y-4">
        {/* Card 1: Proses Pendaftaran dan Review */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <FiClipboard className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              Proses Pendaftaran dan Review
            </h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Pendaftaran Anda akan diverifikasi oleh administrator LacakIn. Pastikan data dan dokumen yang Anda berikan valid dan sesuai ketentuan.
            </p>
          </div>
        </div>

        {/* Card 2: Alur dan Status Pengajuan */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-3.5">
          <h3 className="text-sm font-extrabold text-slate-900">
            Alur dan Status Pengajuan
          </h3>

          <div className="space-y-3">
            {[
              {
                icon: FiTruck,
                title: "Diajukan",
                desc: "Formulir pendaftaran berhasil dikirim.",
                bg: "bg-slate-50 border-slate-200/80",
                iconCls: "bg-blue-100 text-blue-600",
              },
              {
                icon: FiSearch,
                title: "Dalam Review",
                desc: "Data dan dokumen Anda sedang diperiksa oleh administrator.",
                bg: "bg-slate-50 border-slate-200/80",
                iconCls: "bg-slate-200 text-slate-600",
              },
              {
                icon: FiCheckCircle,
                title: "Disetujui",
                desc: "Anda resmi menjadi Kurir LacakIn dan dapat masuk ke aplikasi kurir.",
                bg: "bg-emerald-50/70 border-emerald-200",
                iconCls: "bg-emerald-500 text-white",
              },
              {
                icon: FiXCircle,
                title: "Ditolak",
                desc: "Pendaftaran tidak disetujui. Anda dapat memperbaiki data dan mengajukan ulang.",
                bg: "bg-rose-50/70 border-rose-200",
                iconCls: "bg-rose-500 text-white",
              },
            ].map((st) => {
              const Icon = st.icon;
              return (
                <div
                  key={st.title}
                  className={`flex items-start gap-3 rounded-2xl border p-3 ${st.bg}`}
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${st.iconCls}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-slate-900">{st.title}</div>
                    <div className="text-[11px] text-slate-600 leading-snug mt-0.5">{st.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 3: Butuh Bantuan? */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-3.5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <FiHeadphones className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Butuh Bantuan?</h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Hubungi tim LacakIn jika mengalami kendala saat pendaftaran.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <a
              href="https://wa.me/6281234567890"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-emerald-50 p-2.5 no-underline transition-colors"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                <FiMessageCircle className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-extrabold text-slate-900">WhatsApp</div>
                <div className="text-[10.5px] font-semibold text-slate-600 truncate">0812-3456-7890</div>
              </div>
            </a>

            <a
              href="mailto:support@lacakin.id"
              className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-blue-50 p-2.5 no-underline transition-colors"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                <FiMail className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-extrabold text-slate-900">Email</div>
                <div className="text-[10.5px] font-semibold text-slate-600 truncate">support@lacakin.id</div>
              </div>
            </a>
          </div>
        </div>
      </aside>
    </div>
  );
}
