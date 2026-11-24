import React from "react";
import { Link } from "react-router-dom";
import { EastJavaMap } from "@/components/shared/EastJavaMap";
import { motion } from "motion/react";
import {
  FiBox,
  FiCamera,
  FiCheckCircle,
  FiClock,
  FiMapPin,
  FiPackage,
  FiSearch,
  FiShield,
  FiSliders,
  FiTag,
  FiTruck,
  FiZap,
} from "react-icons/fi";

function JatimHeroArt() {
  return (
    <svg viewBox="0 0 320 170" className="hidden lg:block w-[310px] h-auto shrink-0 drop-shadow-2xl" aria-hidden="true">
      <path d="M18 118 Q65 76 112 118" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="2" />
      <rect x="30" y="68" width="16" height="50" rx="2" fill="rgba(255,255,255,0.12)" />
      <rect x="52" y="54" width="20" height="64" rx="2" fill="rgba(255,255,255,0.16)" />
      <rect x="78" y="76" width="14" height="42" rx="2" fill="rgba(255,255,255,0.12)" />
      <ellipse cx="165" cy="148" rx="135" ry="10" fill="rgba(6,20,56,0.38)" />
      <g transform="translate(268, 56)">
        <path d="M16 0C7.2 0 0 7.2 0 16c0 11 16 26 16 26s16-15 16-26C32 7.2 24.8 0 16 0z" fill="#60a5fa" />
        <circle cx="16" cy="15" r="6" fill="#ffffff" />
      </g>
      <rect x="108" y="42" width="132" height="78" rx="12" fill="#ffffff" />
      <rect x="118" y="52" width="112" height="52" rx="8" fill="#eaf3fe" />
      <text x="174" y="84" textAnchor="middle" fill="#0b72d9" fontWeight="800" fontSize="19" fontFamily="Plus Jakarta Sans, sans-serif">
        LacakIn
      </text>
      <path d="M110 58 L70 58 Q56 58 51 74 L40 100 Q38 110 47 118 L110 118 Z" fill="#e2e8f0" />
      <path d="M104 66 L74 66 Q66 66 62 76 L54 94 L104 94 Z" fill="#1e3a8a" />
      <rect x="43" y="102" width="10" height="6" rx="2" fill="#facc15" />
      <circle cx="78" cy="122" r="16" fill="#0f172a" />
      <circle cx="78" cy="122" r="7" fill="#cbd5e1" />
      <circle cx="204" cy="122" r="16" fill="#0f172a" />
      <circle cx="204" cy="122" r="7" fill="#cbd5e1" />
      <g transform="translate(232, 98)">
        <rect x="0" y="14" width="32" height="28" rx="3" fill="#d99a5b" stroke="#b5783d" strokeWidth="1.5" />
        <line x1="16" y1="14" x2="16" y2="42" stroke="#b5783d" strokeWidth="1.5" />
        <rect x="28" y="4" width="36" height="38" rx="3" fill="#e5ac70" stroke="#b5783d" strokeWidth="1.5" />
        <line x1="46" y1="4" x2="46" y2="42" stroke="#b5783d" strokeWidth="1.5" />
      </g>
    </svg>
  );
}

export default function BerandaPage() {
  const services = [
    {
      name: "Reguler",
      code: "REG",
      desc: "Pengiriman ekonomis dengan jangkauan luas ke seluruh 38 kabupaten dan kota di Jawa Timur.",
      bg: "from-[#eef5ff] to-[#f8fbff] border-blue-100",
      iconBg: "bg-blue-100 text-blue-700",
      image: "/images/service-reguler.webp",
      icon: FiBox,
    },
    {
      name: "Ekspres",
      code: "EXP",
      desc: "Pengiriman lebih cepat dengan prioritas penanganan lintas kota utama Jawa Timur.",
      bg: "from-[#f3efff] to-[#faf8ff] border-violet-100",
      iconBg: "bg-violet-100 text-violet-700",
      image: "/images/service-ekspres.webp",
      icon: FiZap,
    },
    {
      name: "Sameday",
      code: "SDY",
      desc: "Kirim hari ini, sampai di hari yang sama untuk area perkotaan dan zona terdekat.",
      bg: "from-[#ecfdf5] to-[#f7fefb] border-emerald-100",
      iconBg: "bg-emerald-100 text-emerald-700",
      image: "/images/service-sameday.webp",
      icon: FiClock,
    },
    {
      name: "Kargo",
      code: "KRG",
      desc: "Pengiriman paket besar dan berat hingga 200 kg via armada mobil box atau pick up.",
      bg: "from-[#fff7ed] to-[#fffaf5] border-amber-100",
      iconBg: "bg-amber-100 text-amber-700",
      image: "/images/service-kargo.webp",
      icon: FiTruck,
    },
  ];

  const stats = [
    { value: "38", label: "Kabupaten dan Kota", sub: "Seluruh Provinsi Jawa Timur" },
    { value: "666", label: "Kecamatan Terjangkau", sub: "Hingga 8.494 kelurahan/desa" },
    { value: "32", label: "Gerai dan Hub Aktif", sub: "Terhubung ke Gudang Rungkut" },
    { value: "4", label: "Layanan Pengiriman", sub: "Reguler, Ekspres, Sameday, Kargo" },
  ];

  const workflowSteps = [
    {
      num: "1",
      title: "Cek Ongkir dan Kecamatan",
      desc: "Hitung tarif resmi antar kota, kecamatan, dan kelurahan di Jawa Timur secara instan.",
      icon: FiSliders,
    },
    {
      num: "2",
      title: "Buat Pesanan Online",
      desc: "Isi data pengirim, penerima, dan pilih layanan untuk langsung menerbitkan resi.",
      icon: FiPackage,
    },
    {
      num: "3",
      title: "Pickup Kurir atau Drop Gerai",
      desc: "Kurir LacakIn menjemput paket atau Anda dapat menyerahkan paket di gerai terdekat.",
      icon: FiTruck,
    },
    {
      num: "4",
      title: "Pantau Resi dan Bukti Foto",
      desc: "Lacak pergerakan paket di peta Jawa Timur hingga bukti serah terima diunggah.",
      icon: FiCheckCircle,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-9"
    >
      {/* HERO SECTION + FLOATING 4-PILLAR BAR */}
      <div className="relative pb-6">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b2363] via-[#1545ab] to-[#2675ec] px-6 pt-9 pb-16 sm:px-10 sm:pt-11 sm:pb-20 text-white shadow-xl shadow-blue-950/15">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="max-w-2xl space-y-4 z-10">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-sky-200 border border-white/15">
                <FiMapPin className="h-3.5 w-3.5 text-sky-300" />
                Ekspedisi Terintegrasi Jawa Timur
              </div>
              <h1 className="text-3xl sm:text-5xl font-extrabold leading-[1.12] tracking-tight">
                PastiIn Sampainya,
                <br />
                <span className="text-sky-300">TenangIn Hatinya.</span>
              </h1>
              <p className="text-sm sm:text-base text-blue-100 leading-relaxed max-w-lg">
                Layanan pengiriman terpercaya dengan jangkauan luas di{" "}
                <strong className="text-white">38 kabupaten dan kota</strong> serta{" "}
                <strong className="text-white">666 kecamatan</strong> di Provinsi Jawa Timur.
              </p>

              {/* Pure Company Profile CTA Actions */}
              <div className="mt-6 flex flex-wrap sm:flex-nowrap items-center gap-2.5">
                <Link
                  to="/lacak"
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-white px-4 sm:px-5 text-xs sm:text-sm font-extrabold text-[#0b2363] shadow-lg shadow-blue-950/20 hover:bg-blue-50 transition-colors no-underline whitespace-nowrap"
                >
                  <FiSearch className="h-4 w-4 text-blue-600 shrink-0" />
                  <span>Lacak Paket Sekarang</span>
                </Link>
                <Link
                  to="/tarif"
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-white/30 bg-white/15 backdrop-blur-md px-4 sm:px-5 text-xs sm:text-sm font-extrabold text-white hover:bg-white/25 transition-colors no-underline whitespace-nowrap"
                >
                  <FiSliders className="h-4 w-4 text-sky-300 shrink-0" />
                  <span>Cek Tarif Jatim</span>
                </Link>
                <Link
                  to="/kirim"
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-sky-300/40 bg-sky-400/20 backdrop-blur-md px-4 sm:px-5 text-xs sm:text-sm font-extrabold text-white hover:bg-sky-400/30 transition-colors no-underline whitespace-nowrap"
                >
                  <FiPackage className="h-4 w-4 text-sky-200 shrink-0" />
                  <span>Kirim Paket Online</span>
                </Link>
              </div>
            </div>

            <div className="w-full lg:w-[370px] shrink-0">
              <div className="overflow-hidden rounded-2xl border border-white/25 bg-white/10 p-2 backdrop-blur-md shadow-2xl">
                <img
                  src="/images/hero-delivery-van.webp"
                  alt="Armada Pengiriman LacakIn Jawa Timur"
                  className="aspect-[3/2] w-full rounded-xl object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Overlapping 4-Pillar Trust Bar */}
        <div className="relative z-10 mx-auto -mt-9 max-w-5xl px-3 sm:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-md p-4 shadow-lg shadow-slate-900/5">
            {[
              { icon: FiTruck, title: "Update Status Transparan" },
              { icon: FiCamera, title: "Bukti Foto Pengiriman" },
              { icon: FiTag, title: "Tarif Jelas dan Kompetitif" },
              { icon: FiShield, title: "Privasi Terjaga" },
            ].map((p) => {
              const PIcon = p.icon;
              return (
                <div key={p.title} className="flex items-center gap-3 px-2 py-1">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
                    <PIcon className="h-5 w-5" />
                  </div>
                  <span className="text-xs sm:text-sm font-extrabold text-slate-800 leading-tight">{p.title}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECTION 2: 4 STATISTIK JANGKAUAN JATIM */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((st) => (
          <div
            key={st.label}
            className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col justify-between"
          >
            <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-blue-700">
              {st.value}
            </div>
            <div className="mt-2">
              <div className="text-sm font-extrabold text-slate-900">{st.label}</div>
              <div className="text-xs text-slate-500 mt-0.5">{st.sub}</div>
            </div>
          </div>
        ))}
      </section>

      {/* SECTION 3: SOLUSI PENGIRIMAN (4 LAYANAN) + JANGKAUAN PETA ASLI JATIM */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-7 items-stretch">
        {/* Left 7 Cols: 4 Service Cards */}
        <div className="xl:col-span-7 space-y-4">
          <div>
            <div className="h-1 w-9 rounded-full bg-blue-600 mb-2" />
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
              Solusi Pengiriman untuk Setiap Kebutuhan
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Empat pilihan layanan resmi mulai dari paket harian hingga kargo berat 200 kg.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {services.map((s) => {
              const SIcon = s.icon;
              return (
                <div
                  key={s.code}
                  className={`rounded-2xl border bg-gradient-to-br ${s.bg} p-5 flex flex-col justify-between gap-4 shadow-xs hover:shadow-md transition-shadow`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className={`grid h-11 w-11 place-items-center rounded-2xl ${s.iconBg}`}>
                        <SIcon className="h-5 w-5" />
                      </div>
                      <span className="rounded-lg bg-white/90 border border-slate-200/80 px-2.5 py-0.5 font-mono text-[11px] font-extrabold text-slate-700">
                        {s.code}
                      </span>
                    </div>
                    <div className="mb-3 overflow-hidden rounded-xl border border-slate-200/70 bg-white">
                      <img
                        src={s.image}
                        alt={`Layanan ${s.name}`}
                        className="aspect-[3/2] w-full object-contain"
                      />
                    </div>
                    <h3 className="text-lg font-extrabold text-slate-900">{s.name}</h3>
                    <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">{s.desc}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Link
                      to="/tarif"
                      className="inline-flex items-center text-xs font-extrabold text-blue-700 hover:underline no-underline"
                    >
                      Hitung Tarif
                    </Link>
                    <Link
                      to="/layanan"
                      className="inline-flex items-center text-xs font-bold text-slate-600 hover:text-blue-700 hover:underline no-underline"
                    >
                      Detail Layanan
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 5 Cols: Jangkauan Layanan Jawa Timur Map */}
        <div className="xl:col-span-5 flex flex-col gap-4">
          <div>
            <div className="h-1 w-9 rounded-full bg-blue-600 mb-2" />
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
              Jangkauan Layanan Kami
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Meliputi 38 kabupaten dan kota serta 32 titik hub di seluruh Jawa Timur.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-xs flex-1 flex flex-col">
            <EastJavaMap mode="network" heightClass="h-[340px] sm:h-[420px] xl:flex-1" />
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-extrabold text-slate-900">
                Hub Distribusi Utama Jawa Timur
              </div>
              <Link
                to="/tarif"
                className="text-xs font-extrabold text-blue-700 hover:underline no-underline"
              >
                Cek Jangkauan
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                { name: "Surabaya Rungkut", role: "Pusat Utama" },
                { name: "Malang Singosari", role: "Hub Regional" },
                { name: "Sidoarjo Waru", role: "Hub Gerai" },
                { name: "Kediri Kota", role: "Hub Regional" },
                { name: "Jember Sumbersari", role: "Hub Regional" },
                { name: "Madiun Kota", role: "Hub Regional" },
              ].map((hub) => (
                <div
                  key={hub.name}
                  className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2"
                >
                  <div className="font-bold text-slate-900 leading-snug">{hub.name}</div>
                  <div className="text-[10.5px] font-semibold text-slate-500">{hub.role}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: CARA KIRIM PAKET DI LACAKIN (4 LANGKAH) */}
      <section className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs space-y-5">
        <div>
          <div className="h-1 w-9 rounded-full bg-blue-600 mb-2" />
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
            Cara Mudah Kirim Paket Bersama LacakIn
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Mulai dari pengecekan ongkos kirim hingga paket diterima lengkap dengan bukti foto.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {workflowSteps.map((step) => {
            const StepIcon = step.icon;
            return (
              <div
                key={step.num}
                className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-extrabold text-white">
                    {step.num}
                  </span>
                  <StepIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-sm font-extrabold text-slate-900">{step.title}</div>
                <p className="text-xs text-slate-600 leading-relaxed">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 4B: GALERI INFRASTRUKTUR & OPERASIONAL */}
      <section className="space-y-4">
        <div>
          <div className="h-1 w-9 rounded-full bg-blue-600 mb-2" />
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
            Infrastruktur Gudang dan Armada Terpadu
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Didukung gudang distribusi regional, pelacakan GPS aktif, dan tim kurir profesional di seluruh Jawa Timur.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              img: "/images/warehouse-hub.webp",
              title: "Hub Distribusi Regional",
              desc: "Sortir otomatis dan manajemen stok antar kota di Gudang Rungkut dan hub daerah.",
            },
            {
              img: "/images/warehouse-loading-dock.webp",
              title: "Loading Dock Terjadwal",
              desc: "Keberangkatan armada harian tepat waktu lintas 38 kabupaten/kota.",
            },
            {
              img: "/images/gps-tracker.webp",
              title: "Pemantauan Rute dan GPS",
              desc: "Setiap checkpoint dan perpindahan hub tercatat real-time di sistem.",
            },
            {
              img: "/images/courier-package.webp",
              title: "Kurir Terverifikasi",
              desc: "Serah terima paket aman dengan bukti foto dan identitas kurir jelas.",
              contain: true,
            },
          ].map((card) => (
            <div
              key={card.title}
              className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs hover:shadow-md transition-shadow"
            >
              <div className="overflow-hidden bg-[#eef3f9]">
                <img
                  src={card.img}
                  alt={card.title}
                  className={`aspect-[3/2] w-full ${
                    card.contain ? "object-contain" : "object-cover"
                  } group-hover:scale-105 transition-transform duration-300`}
                />
              </div>
              <div className="p-4">
                <div className="text-sm font-extrabold text-slate-900">{card.title}</div>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">{card.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 5: CTA BANNER */}
      <section className="rounded-2xl bg-gradient-to-r from-[#133b98] via-[#1c59d6] to-[#2e80f7] px-6 py-7 sm:px-9 text-white shadow-lg shadow-blue-900/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            Pantau Paket, Tanpa Rasa Khawatir.
          </h2>
          <p className="mt-1 text-sm text-blue-100">
            Nikmati pengalaman pengiriman yang aman, cepat, dan transparan bersama LacakIn di seluruh Jawa Timur.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5 shrink-0">
          <Link
            to="/kirim"
            className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-white px-5 text-sm font-extrabold text-[#123892] shadow-sm hover:bg-blue-50 no-underline"
          >
            Buat Pesanan Online
          </Link>
          <Link
            to="/register"
            className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-white/30 bg-white/15 px-5 text-sm font-bold text-white hover:bg-white/25 no-underline"
          >
            Gabung Jadi Kurir
          </Link>
        </div>
      </section>
    </motion.div>
  );
}
