import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  FiArrowRight,
  FiBox,
  FiCheckCircle,
  FiChevronDown,
  FiClock,
  FiGlobe,
  FiHelpCircle,
  FiLayers,
  FiMapPin,
  FiPackage,
  FiSend,
  FiShield,
  FiStar,
  FiTruck,
  FiZap,
} from "react-icons/fi";
import { apiFetch, formatRupiah } from "../lib/api.js";

const SERVICE_DETAIL = {
  REG: {
    tag: "Layanan Utama",
    tagline: "Ekonomis dan andal",
    desc: "Pilihan terbaik untuk pengiriman ekonomis dengan jangkauan luas ke seluruh 38 kabupaten dan kota di Jawa Timur.",
    perks: ["Harga Terjangkau", "Jangkauan Luas", "Aman dan Terpercaya"],
    icon: FiBox,
    image: "/images/service-reguler.webp",
    iconCls: "bg-blue-100 text-blue-700",
    cardCls: "from-[#eef5ff] to-white border-blue-100",
  },
  EXP: {
    tag: "Prioritas",
    tagline: "Cepat sampai tujuan",
    desc: "Pengiriman lebih cepat dengan prioritas penanganan di setiap gerai untuk kebutuhan mendesak.",
    perks: ["Prioritas Penanganan", "Pelacakan Langsung", "Estimasi Lebih Singkat"],
    icon: FiZap,
    image: "/images/service-ekspres.webp",
    iconCls: "bg-amber-100 text-amber-600",
    cardCls: "from-[#fff8eb] to-white border-amber-100",
  },
  SDY: {
    tag: "Hari yang Sama",
    tagline: "Hari ini sampai",
    desc: "Kirim hari ini, sampai di hari yang sama untuk area perkotaan dan zona terdekat yang terjangkau.",
    perks: ["Pengiriman Dalam Kota", "Pelacakan Langsung", "Cepat dan Aman"],
    icon: FiSend,
    image: "/images/service-sameday.webp",
    iconCls: "bg-violet-100 text-violet-700",
    cardCls: "from-[#f5f0ff] to-white border-violet-100",
  },
  KRG: {
    tag: "Muatan Besar",
    tagline: "Hemat untuk paket berat",
    desc: "Pengiriman barang berukuran besar dan berat hingga 200 kg menggunakan armada mobil box atau pick up LacakIn.",
    perks: ["Berat Maksimal 200 kg", "Armada Mobil Box", "Tarif Ekonomis"],
    icon: FiTruck,
    image: "/images/service-kargo.webp",
    iconCls: "bg-emerald-100 text-emerald-700",
    cardCls: "from-[#ecfdf5] to-white border-emerald-100",
  },
};

const FAQS = [
  {
    q: "Bagaimana cara menghitung berat volume?",
    a: "Berat volume dihitung dari panjang × lebar × tinggi (cm) dibagi 6.000. Jika berat volume lebih besar dari berat aktual, biaya dihitung memakai berat volume. Anda bisa mencobanya langsung di halaman Cek Tarif.",
  },
  {
    q: "Area mana saja yang dijangkau oleh LacakIn?",
    a: "LacakIn melayani 38 kabupaten dan kota di Provinsi Jawa Timur melalui 32 titik gerai dan hub distribusi.",
  },
  {
    q: "Apakah ada asuransi untuk paket?",
    a: "Ada. Saat membuat pesanan, petugas dapat menyertakan asuransi barang berdasarkan nilai barang yang dideklarasikan, dan biayanya dihitung otomatis oleh sistem.",
  },
  {
    q: "Bagaimana cara melacak paket saya?",
    a: "Masukkan nomor resi pada halaman Lacak Paket atau pindai barcode pada label menggunakan kamera untuk melihat posisi dan riwayat perjalanan paket.",
  },
];

function LayananHeroArt() {
  return (
    <svg viewBox="0 0 300 150" className="hidden lg:block w-[290px] h-auto shrink-0 drop-shadow-xl" aria-hidden="true">
      {/* Plane */}
      <g transform="translate(150, 6) rotate(-8)">
        <path d="M0 18 L58 8 Q70 6 74 12 Q70 18 58 20 L10 30 Z" fill="#ffffff" />
        <path d="M24 14 L44 -4 L50 -2 L40 14 Z" fill="#dbeafe" />
        <path d="M22 30 L40 44 L34 46 L16 32 Z" fill="#dbeafe" />
      </g>
      <ellipse cx="150" cy="136" rx="124" ry="8" fill="rgba(6,20,56,0.32)" />
      <rect x="92" y="46" width="132" height="72" rx="11" fill="#ffffff" />
      <rect x="102" y="56" width="112" height="46" rx="7" fill="#eaf3fe" />
      <text x="158" y="85" textAnchor="middle" fill="#0b72d9" fontWeight="800" fontSize="18" fontFamily="Plus Jakarta Sans, sans-serif">
        LacakIn
      </text>
      <path d="M94 60 L56 60 Q44 60 40 74 L30 98 Q28 106 36 114 L94 114 Z" fill="#e2e8f0" />
      <path d="M88 68 L60 68 Q52 68 49 77 L42 92 L88 92 Z" fill="#1e3a8a" />
      <rect x="32" y="100" width="9" height="6" rx="2" fill="#facc15" />
      <circle cx="66" cy="118" r="15" fill="#0f172a" />
      <circle cx="66" cy="118" r="6.5" fill="#cbd5e1" />
      <circle cx="188" cy="118" r="15" fill="#0f172a" />
      <circle cx="188" cy="118" r="6.5" fill="#cbd5e1" />
      <g transform="translate(226, 92)">
        <rect x="0" y="12" width="30" height="26" rx="3" fill="#d99a5b" stroke="#b5783d" strokeWidth="1.5" />
        <line x1="15" y1="12" x2="15" y2="38" stroke="#b5783d" strokeWidth="1.5" />
        <rect x="26" y="0" width="34" height="38" rx="3" fill="#e5ac70" stroke="#b5783d" strokeWidth="1.5" />
        <line x1="43" y1="0" x2="43" y2="38" stroke="#b5783d" strokeWidth="1.5" />
      </g>
    </svg>
  );
}

export default function LayananPage() {
  const [active, setActive] = useState("REG");
  const [quotes, setQuotes] = useState({});
  const [openFaq, setOpenFaq] = useState(0);

  // Real "mulai dari" price + ETA from server for sample route Surabaya -> Sidoarjo (1 kg)
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const ref = await apiFetch("/api/reference");
        const cities = ref.cities || [];
        const sby = cities.find((c) => c.name.toLowerCase().includes("surabaya"));
        const sda = cities.find((c) => c.name.toLowerCase().includes("sidoarjo"));
        if (!sby || !sda) return;
        const out = await apiFetch("/api/tariffs/quote", {
          method: "POST",
          body: {
            origin_city_id: sby.id,
            dest_city_id: sda.id,
            weight_kg: 1,
            length_cm: 0,
            width_cm: 0,
            height_cm: 0,
            declared_value: 0,
            use_insurance: false,
          },
        });
        if (!live) return;
        const map = {};
        (out.quotes || []).forEach((q) => (map[q.service_code] = q));
        setQuotes(map);
      } catch {
        /* harga contoh opsional, abaikan jika gagal */
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  const eta = (q) => {
    if (!q) return "-";
    if (q.eta_min_days === q.eta_max_days) {
      return q.eta_min_days === 0 ? "Hari yang sama" : `${q.eta_min_days} Hari`;
    }
    return `${q.eta_min_days} – ${q.eta_max_days} Hari`;
  };

  const sideItems = useMemo(
    () => [
      { code: "REG", name: "Reguler", sub: "Ekonomis dan andal", icon: FiBox },
      { code: "EXP", name: "Ekspres", sub: "Cepat sampai tujuan", icon: FiZap },
      { code: "SDY", name: "Sameday", sub: "Hari ini sampai", icon: FiSend },
      { code: "KRG", name: "Kargo", sub: "Paket besar hingga 200 kg", icon: FiTruck },
    ],
    []
  );

  const main = SERVICE_DETAIL[active];
  const mainQuote = quotes[active];
  const MainIcon = main.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b225d] via-[#1545ab] to-[#2675ec] px-6 py-8 sm:px-9 sm:py-10 text-white shadow-xl shadow-blue-950/15">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-7">
          <div className="max-w-xl space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/20 px-3 py-1 text-xs font-bold text-sky-200">
              <FiLayers className="h-3.5 w-3.5" />
              Layanan Pengiriman
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold leading-tight tracking-tight">
              Pilihan Layanan Lengkap <br />
              untuk Semua <span className="text-sky-300">Kebutuhan Anda</span>
            </h1>
            <p className="text-sm text-blue-100 leading-relaxed max-w-lg">
              LacakIn menyediakan berbagai layanan pengiriman dengan kecepatan, keamanan, dan harga terbaik di seluruh Jawa Timur.
            </p>
            <div className="flex flex-wrap gap-4 pt-2 text-xs font-semibold text-blue-100">
              <span className="inline-flex items-center gap-1.5">
                <FiShield className="h-4 w-4 text-sky-300" /> Pengiriman Aman
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FiZap className="h-4 w-4 text-sky-300" /> Proses Cepat
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FiStar className="h-4 w-4 text-sky-300" /> Harga Transparan
              </span>
            </div>
          </div>
          <div className="w-full lg:w-[330px] shrink-0">
            <div className="overflow-hidden rounded-2xl border border-white/25 bg-white/10 p-2 backdrop-blur-md shadow-2xl">
              <img
                src="/images/service-kargo.webp"
                alt="Armada LacakIn Jawa Timur"
                className="aspect-[3/2] w-full rounded-xl object-contain bg-white"
              />
            </div>
          </div>
        </div>
      </section>

      {/* BODY: Sidebar + Detail */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Left: Jenis Layanan */}
        <aside className="xl:col-span-3 space-y-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900 mb-3">
              <FiLayers className="h-4 w-4 text-blue-600" />
              Jenis Layanan
            </div>
            <div className="space-y-1.5">
              {sideItems.map((s) => {
                const SIcon = s.icon;
                const isActive = active === s.code;
                return (
                  <button
                    key={s.code}
                    type="button"
                    onClick={() => setActive(s.code)}
                    className={`flex w-full min-h-[48px] items-center gap-3 rounded-xl px-3 text-left transition-colors cursor-pointer ${
                      isActive ? "bg-blue-50 ring-1 ring-blue-200" : "hover:bg-slate-50"
                    }`}
                  >
                    <SIcon className={`h-[18px] w-[18px] shrink-0 ${isActive ? "text-blue-600" : "text-slate-500"}`} />
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm font-extrabold ${isActive ? "text-blue-700" : "text-slate-800"}`}>
                        {s.name}
                      </span>
                      <span className="block text-[11px] text-slate-500">{s.sub}</span>
                    </span>
                  </button>
                );
              })}
              {["Nasional (Antar Provinsi)"].map((n) => (
                <div
                  key={n}
                  className="flex min-h-[48px] items-center gap-3 rounded-xl px-3 opacity-60"
                  title="Belum tersedia"
                >
                  <FiGlobe className="h-[18px] w-[18px] shrink-0 text-slate-400" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-extrabold text-slate-600">{n}</span>
                    <span className="block text-[11px] text-slate-400">Segera hadir</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-[#eef5ff] to-white p-4 shadow-xs">
            <div className="text-sm font-extrabold text-slate-900">Butuh Bantuan?</div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Tanyakan layanan yang tepat kepada petugas di gerai LacakIn terdekat.
            </p>
            <Link
              to="/tarif"
              className="mt-3 inline-flex min-h-[38px] items-center gap-1.5 text-xs font-extrabold text-blue-700 hover:underline no-underline"
            >
              Hitung Tarif Sekarang
            </Link>
          </div>
        </aside>

        {/* Right: Main detail + other services + FAQ */}
        <div className="xl:col-span-9 space-y-5">
          {/* Featured Service Card */}
          <div className={`rounded-2xl border bg-gradient-to-br ${main.cardCls} p-5 sm:p-6 shadow-xs`}>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
              <div className="md:col-span-7 space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${main.iconCls}`}>
                    <MainIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="inline-block rounded-full bg-blue-600 px-2.5 py-0.5 text-[10.5px] font-extrabold text-white">
                      {main.tag}
                    </span>
                    <h2 className="text-2xl font-extrabold text-slate-900 leading-tight">
                      {sideItems.find((s) => s.code === active)?.name}
                    </h2>
                  </div>
                </div>

                <p className="text-sm text-slate-600 leading-relaxed">{main.desc}</p>

                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                  {main.perks.map((p) => (
                    <span key={p} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <FiCheckCircle className="h-4 w-4 text-emerald-500" />
                      {p}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="rounded-xl border border-slate-200/80 bg-white p-3.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                      <FiClock className="h-3.5 w-3.5 text-blue-600" /> Estimasi Waktu
                    </div>
                    <div className="text-lg font-extrabold text-slate-900 mt-1">{eta(mainQuote)}</div>
                    <div className="text-[10.5px] text-slate-400">contoh rute Surabaya - Sidoarjo</div>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[11px] font-bold text-slate-400">Tarif Contoh (1 kg)</div>
                      <div className="text-lg font-extrabold text-blue-700 mt-1">
                        {mainQuote ? formatRupiah(mainQuote.total_cost) : "-"}
                      </div>
                    </div>
                    <Link
                      to="/tarif"
                      className="shrink-0 rounded-lg bg-blue-50 px-3 py-1.5 text-[11px] font-extrabold text-blue-700 hover:bg-blue-100 no-underline"
                    >
                      Pilih Layanan
                    </Link>
                  </div>
                </div>
              </div>

              <div className="md:col-span-5">
                <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-2 shadow-xs">
                  <img
                    src={main.image}
                    alt={sideItems.find((s) => s.code === active)?.name || active}
                    className="aspect-[3/2] w-full rounded-xl object-contain"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Other Services */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {["EXP", "SDY", "KRG", "REG"]
              .filter((c) => c !== active)
              .slice(0, 3)
              .map((code) => {
                const d = SERVICE_DETAIL[code];
                const q = quotes[code];
                const DIcon = d.icon;
                return (
                  <div key={code} className={`rounded-2xl border bg-gradient-to-br ${d.cardCls} p-5 shadow-xs flex flex-col justify-between gap-3`}>
                    <div>
                      <div className="mb-3 overflow-hidden rounded-xl border border-slate-200/70 bg-white">
                        <img
                          src={d.image}
                          alt={sideItems.find((s) => s.code === code)?.name || code}
                          className="aspect-[3/2] w-full object-contain"
                        />
                      </div>
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className={`grid h-10 w-10 place-items-center rounded-xl ${d.iconCls}`}>
                          <DIcon className="h-5 w-5" />
                        </div>
                        <h3 className="text-base font-extrabold text-slate-900">
                          {sideItems.find((s) => s.code === code)?.name}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{d.desc}</p>
                      <ul className="mt-2.5 space-y-1">
                        {d.perks.map((p) => (
                          <li key={p} className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-700">
                            <FiCheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex items-end justify-between gap-2 pt-1">
                      <div>
                        <div className="text-[10.5px] text-slate-400 font-semibold">Mulai dari</div>
                        <div className="text-base font-extrabold text-slate-900">
                          {q ? formatRupiah(q.total_cost) : "-"}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActive(code)}
                        className="inline-flex items-center gap-1 text-xs font-extrabold text-blue-700 hover:underline cursor-pointer"
                      >
                        Pelajari Detail
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* FAQ */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900 mb-3">
              <FiHelpCircle className="h-4 w-4 text-blue-600" />
              Pertanyaan yang Sering Diajukan
            </div>
            <div className="divide-y divide-slate-100">
              {FAQS.map((f, idx) => {
                const open = openFaq === idx;
                return (
                  <div key={f.q}>
                    <button
                      type="button"
                      onClick={() => setOpenFaq(open ? -1 : idx)}
                      aria-expanded={open}
                      className="flex w-full min-h-[46px] items-center justify-between gap-3 text-left text-sm font-bold text-slate-800 cursor-pointer"
                    >
                      {f.q}
                      <FiChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
                    </button>
                    {open && <p className="pb-3 text-xs text-slate-600 leading-relaxed">{f.a}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* CTA Banner */}
      <section className="rounded-2xl bg-gradient-to-r from-[#0f2c78] via-[#1646b0] to-[#1d5bd6] px-6 py-6 sm:px-9 text-white shadow-lg shadow-blue-900/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">Mulai Kirim Paket Sekarang Bersama LacakIn!</h2>
          <p className="mt-1 text-sm text-blue-100">Nikmati layanan terbaik dengan proses yang mudah dan cepat.</p>
        </div>
        <Link
          to="/tarif"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-white px-5 text-sm font-extrabold text-[#123892] shadow-sm hover:bg-blue-50 no-underline shrink-0"
        >
          Hitung Tarif Pengiriman
          <FiMapPin className="h-4 w-4" />
        </Link>
      </section>
    </motion.div>
  );
}
