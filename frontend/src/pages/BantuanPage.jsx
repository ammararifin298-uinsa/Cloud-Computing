import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiBookOpen,
  FiChevronDown,
  FiChevronRight,
  FiClock,
  FiHeadphones,
  FiHelpCircle,
  FiInfo,
  FiMail,
  FiMessageCircle,
  FiPackage,
  FiPhoneCall,
  FiSearch,
  FiShield,
  FiSliders,
  FiTruck,
  FiUser,
  FiZap,
} from "react-icons/fi";

const HELP_CATEGORIES = [
  { id: "all", label: "Semua Topik", icon: FiPackage },
  { id: "tracking", label: "Pengiriman dan Pelacakan", icon: FiTruck },
  { id: "tariff", label: "Tarif dan Pembayaran", icon: FiSliders },
  { id: "services", label: "Layanan Pengiriman", icon: FiPackage },
  { id: "account", label: "Akun dan Akses Pegawai", icon: FiUser },
  { id: "claim", label: "Klaim dan Kendala", icon: FiShield },
  { id: "other", label: "Lainnya", icon: FiInfo },
];

const FAQ_DATA = [
  {
    id: "faq-1",
    category: "tracking",
    q: "Bagaimana cara melacak paket saya?",
    a: "Anda dapat melacak paket dengan memasukkan nomor resi pada menu Lacak Paket di halaman utama. Setelah itu, sistem akan menampilkan status dan riwayat perjalanan paket secara real-time.",
  },
  {
    id: "faq-2",
    category: "services",
    q: "Berapa lama estimasi pengiriman?",
    a: "Estimasi waktu pengiriman bergantung pada layanan yang dipilih: Sameday (SDY) tiba di hari yang sama (maksimal 8 jam untuk rute kota/kabupaten terdekat), Ekspres (EXP) 1 hari kerja, dan Reguler (REG) 1 hingga 3 hari kerja di seluruh 38 kabupaten/kota Jawa Timur.",
  },
  {
    id: "faq-3",
    category: "tariff",
    q: "Bagaimana cara mengecek tarif pengiriman?",
    a: "Buka menu Cek Tarif, pilih kota atau kabupaten asal dan tujuan di Jawa Timur, masukkan berat aktual paket beserta dimensi panjang, lebar, dan tinggi (opsional), lalu klik Hitung Tarif untuk melihat estimasi biaya resmi seluruh layanan.",
  },
  {
    id: "faq-4",
    category: "services",
    q: "Apa saja layanan pengiriman yang tersedia di LacakIn?",
    a: "LacakIn menyediakan tiga layanan aktif utama di Jawa Timur yaitu Reguler (REG), Ekspres (EXP), dan Sameday (SDY), serta layanan Kargo untuk paket berukuran besar dan Pengiriman Internasional yang sedang dalam tahap perluasan jaringan.",
  },
  {
    id: "faq-5",
    category: "tracking",
    q: "Bagaimana jika paket saya terlambat atau tidak bergerak?",
    a: "Jika status resi tidak berubah melebihi estimasi waktu layanan, silakan hubungi tim dukungan pelanggan kami melalui WhatsApp, Email, atau Call Center 24/7 dengan menyertakan nomor resi agar tim operasional hub terkait dapat segera melakukan pengecekan.",
  },
  {
    id: "faq-6",
    category: "claim",
    q: "Bagaimana cara mengajukan klaim jika paket bermasalah?",
    a: "Untuk paket yang mengalami kerusakan atau kendala pengiriman, siapkan nomor resi, foto bukti kondisi paket saat diterima, dan informasi nilai barang yang tercatat. Hubungi layanan pelanggan LacakIn maksimal 3x24 jam setelah paket diterima untuk proses verifikasi klaim asuransi.",
  },
  {
    id: "faq-7",
    category: "account",
    q: "Bagaimana cara mendaftar sebagai kurir atau masuk ke Portal Pegawai?",
    a: "Calon kurir dapat mendaftar melalui tombol Daftar Kurir di bagian atas halaman dengan memilih hub kota penugasan di Jawa Timur. Setelah akun diverifikasi oleh administrator, Anda dapat masuk melalui halaman Masuk Pegawai untuk memperbarui checkpoint dan mengunggah foto bukti serah terima.",
  },
  {
    id: "faq-8",
    category: "other",
    q: "Bagaimana perhitungan berat volumetrik pada paket berukuran besar?",
    a: "Berat volumetrik dihitung menggunakan rumus (Panjang x Lebar x Tinggi dalam cm) dibagi 6.000. Sistem LacakIn secara otomatis membandingkan berat aktual dan berat volumetrik, kemudian menggunakan nilai yang lebih besar sebagai berat tagih.",
  },
];

const USAGE_GUIDES = [
  {
    step: "1",
    title: "Cek Tarif dan Pilih Layanan",
    desc: "Gunakan menu Cek Tarif untuk menghitung estimasi ongkos kirim antar 38 kabupaten/kota di Jawa Timur sesuai berat dan dimensi paket.",
    to: "/tarif",
    action: "Buka Kalkulator Tarif",
  },
  {
    step: "2",
    title: "Kirim Paket di Gerai atau Hub LacakIn",
    desc: "Serahkan paket ke petugas loket atau kurir penjemput untuk mendapatkan nomor resi resmi beserta barcode pelacakan.",
    to: "/layanan",
    action: "Lihat Jenis Layanan",
  },
  {
    step: "3",
    title: "Pantau Status dan Bukti Foto Real-Time",
    desc: "Masukkan nomor resi di halaman Lacak Paket untuk melihat riwayat perjalanan paket dari hub asal hingga bukti foto diterima.",
    to: "/lacak",
    action: "Lacak Resi Sekarang",
  },
];

export default function BantuanPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [openFaqId, setOpenFaqId] = useState("faq-1");
  const [showGuideModal, setShowGuideModal] = useState(false);

  const filteredFaqs = useMemo(() => {
    const query = (appliedSearch || searchInput).trim().toLowerCase();
    return FAQ_DATA.filter((item) => {
      const matchCat = selectedCategory === "all" || item.category === selectedCategory;
      const matchQuery =
        !query ||
        item.q.toLowerCase().includes(query) ||
        item.a.toLowerCase().includes(query);
      return matchCat && matchQuery;
    });
  }, [selectedCategory, appliedSearch, searchInput]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    setAppliedSearch(searchInput);
  }

  return (
    <div className="space-y-6 pb-8">
      {/* HERO BANNER */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#081948] via-[#123d94] to-[#1e64d8] text-white shadow-xl">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 18% 22%, rgba(56,189,248,0.5) 0%, transparent 45%), radial-gradient(circle at 82% 65%, rgba(255,255,255,0.28) 0%, transparent 50%)",
          }}
        />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 items-center gap-6 p-6 sm:p-8 lg:px-10 lg:pt-9 lg:pb-16">
          {/* Left Hero Copy & Search Bar */}
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-md px-3.5 py-1 text-xs font-bold text-sky-200 border border-white/15">
              <FiPackage className="h-3.5 w-3.5 text-sky-300" />
              Pusat Bantuan
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              Pusat Bantuan <span className="text-sky-300">LacakIn</span>
            </h1>

            <p className="text-xs sm:text-sm text-blue-100/90 max-w-xl leading-relaxed">
              Temukan panduan, solusi, dan jawaban atas pertanyaan seputar pengiriman paket Anda.
            </p>

            {/* White Pill Search Form */}
            <form
              onSubmit={handleSearchSubmit}
              className="mt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-2xl bg-white p-2 shadow-lg max-w-xl"
            >
              <div className="relative flex-1 flex items-center">
                <FiSearch className="absolute left-3.5 h-4 w-4 text-blue-500 pointer-events-none" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    if (!e.target.value) setAppliedSearch("");
                  }}
                  placeholder="Cari pertanyaan, panduan, atau topik bantuan..."
                  className="h-11 w-full rounded-xl bg-transparent pl-10 pr-3 text-base sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 px-6 text-sm font-bold text-white shadow-sm transition-colors cursor-pointer shrink-0"
              >
                Cari
              </button>
            </form>
          </div>

          {/* Right Illustration: Customer Service Representative */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="w-full max-w-[380px] overflow-hidden rounded-2xl border border-white/25 bg-white/10 p-2 backdrop-blur-md shadow-2xl">
              <img
                src="/images/bantuan-cs.webp"
                alt="Tim Layanan Pelanggan LacakIn"
                className="aspect-[3/2] w-full rounded-xl object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* OVERLAPPING 4-PILL TRUST RIBBON */}
      <div className="relative z-20 -mt-11 mx-auto max-w-[1060px] px-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 rounded-2xl bg-white/95 backdrop-blur-md p-3.5 sm:p-4 shadow-lg border border-blue-100">
          {[
            { icon: FiZap, title: "Respon Cepat", sub: "dan Ramah" },
            { icon: FiShield, title: "Informasi", sub: "Akurat" },
            { icon: FiBookOpen, title: "Panduan", sub: "Lengkap" },
            { icon: FiClock, title: "Dukungan", sub: "24/7" },
          ].map((badge) => {
            const Icon = badge.icon;
            return (
              <div
                key={badge.title}
                className="flex items-center gap-3 px-3 py-1.5 border-r last:border-r-0 border-slate-100"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 ring-4 ring-blue-50/50">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-xs sm:text-[13px] font-extrabold text-slate-800 leading-tight">
                  <div>{badge.title}</div>
                  <div className="text-slate-600">{badge.sub}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MAIN 3-COLUMN HELP CENTER LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-2">
        {/* LEFT SIDEBAR: Kategori Bantuan */}
        <aside className="lg:col-span-3 rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-sm space-y-2">
          <h2 className="px-2 pb-2 text-base font-extrabold text-slate-900">
            Kategori Bantuan
          </h2>

          <div className="space-y-1.5">
            {HELP_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex w-full min-h-[46px] items-center justify-between gap-2.5 rounded-2xl px-3.5 py-2.5 text-left transition-all cursor-pointer ${
                    active
                      ? "bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-white font-bold shadow-md shadow-blue-600/20"
                      : "bg-transparent hover:bg-slate-50 text-slate-700 font-semibold"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                        active ? "bg-white/20 text-white" : "bg-blue-50 text-blue-600"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs sm:text-[13px] leading-snug">{cat.label}</span>
                  </div>
                  {active && <FiChevronRight className="h-4 w-4 shrink-0 text-white" />}
                </button>
              );
            })}
          </div>
        </aside>

        {/* CENTER COLUMN: Pertanyaan yang Sering Diajukan (FAQ) */}
        <section className="lg:col-span-5 space-y-4">
          <div>
            <div className="h-1 w-9 rounded-full bg-blue-600 mb-2" />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                Pertanyaan yang Sering Diajukan (FAQ)
              </h2>
              {(selectedCategory !== "all" || searchInput) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory("all");
                    setSearchInput("");
                    setAppliedSearch("");
                  }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  Reset Filter
                </button>
              )}
            </div>
          </div>

          {filteredFaqs.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center space-y-3 shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <FiHelpCircle className="h-6 w-6" />
              </div>
              <div className="text-base font-extrabold text-slate-900">
                Pertanyaan tidak ditemukan
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Tidak ada topik bantuan yang cocok dengan kata kunci pencarian Anda. Coba gunakan kata kunci lain atau pilih Semua Topik.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory("all");
                  setSearchInput("");
                  setAppliedSearch("");
                }}
                className="inline-flex min-h-[40px] items-center justify-center rounded-xl bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 cursor-pointer"
              >
                Tampilkan Semua Pertanyaan
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFaqs.map((faq) => {
                const isOpen = openFaqId === faq.id;
                return (
                  <div
                    key={faq.id}
                    className={`rounded-2xl border transition-all bg-white shadow-sm ${
                      isOpen
                        ? "border-blue-300 ring-2 ring-blue-500/10"
                        : "border-slate-200/90 hover:border-blue-200"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqId(isOpen ? "" : faq.id)}
                      className="flex w-full min-h-[54px] items-center justify-between gap-3 px-4 sm:px-5 py-3.5 text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                          <FiHelpCircle className="h-4 w-4" />
                        </div>
                        <span className="text-sm sm:text-[15px] font-extrabold text-slate-900">
                          {faq.q}
                        </span>
                      </div>
                      <FiChevronDown
                        className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${
                          isOpen ? "rotate-180 text-blue-600" : ""
                        }`}
                      />
                    </button>

                    {isOpen && (
                      <div className="px-4 sm:px-5 pb-4 pt-0">
                        <div className="rounded-xl bg-blue-50/60 border border-blue-100/80 p-3.5 sm:p-4 text-xs sm:text-[13px] text-slate-700 leading-relaxed">
                          {faq.a}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* RIGHT COLUMN: Panduan Penggunaan + Butuh Bantuan Lebih Lanjut? */}
        <aside className="lg:col-span-4 space-y-5">
          {/* Top Card: Panduan Penggunaan */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3.5">
              {/* Box + Magnifier SVG */}
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
                <svg viewBox="0 0 80 80" className="h-12 w-12" aria-hidden="true">
                  <polygon points="40,12 66,24 40,36 14,24" fill="#fbbf24" />
                  <polygon points="14,24 40,36 40,64 14,52" fill="#f59e0b" />
                  <polygon points="66,24 40,36 40,64 66,52" fill="#d97706" />
                  <circle cx="54" cy="52" r="12" fill="#dbeafe" stroke="#2563eb" strokeWidth="3.5" />
                  <line x1="63" y1="61" x2="72" y2="70" stroke="#1e40af" strokeWidth="4.5" strokeLinecap="round" />
                </svg>
              </div>

              <div className="space-y-2 min-w-0 flex-1">
                <h3 className="text-base font-extrabold text-slate-900">
                  Panduan Penggunaan
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Pelajari cara menggunakan fitur LacakIn dengan mudah.
                </p>
                <button
                  type="button"
                  onClick={() => setShowGuideModal((v) => !v)}
                  className="inline-flex min-h-[36px] items-center gap-1.5 whitespace-nowrap rounded-xl border border-blue-300 bg-blue-50/70 hover:bg-blue-100/80 px-3.5 py-1.5 text-xs font-extrabold text-blue-700 transition-colors cursor-pointer"
                >
                  {showGuideModal ? "Tutup Panduan" : "Lihat Panduan"}
                  <FiChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {showGuideModal && (
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                {USAGE_GUIDES.map((g) => (
                  <div key={g.step} className="rounded-2xl bg-slate-50 p-3 border border-slate-200/70 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[11px] font-extrabold text-white">
                        {g.step}
                      </span>
                      <span className="text-xs font-extrabold text-slate-800">{g.title}</span>
                    </div>
                    <p className="text-[11.5px] text-slate-600 leading-relaxed pl-7">{g.desc}</p>
                    <div className="pl-7 pt-1">
                      <Link
                        to={g.to}
                        className="inline-flex items-center gap-1 text-[11.5px] font-bold text-blue-600 hover:text-blue-700 no-underline"
                      >
                        {g.action}
                        <FiChevronRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Card: Butuh Bantuan Lebih Lanjut? */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0a1d52] via-[#133b94] to-[#1e64d8] p-5 text-white shadow-lg space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 border border-white/20 shadow-inner">
                <FiHeadphones className="h-7 w-7 text-sky-300" />
              </div>
              <div>
                <h3 className="text-base font-extrabold leading-snug">
                  Butuh Bantuan Lebih Lanjut?
                </h3>
                <p className="text-xs text-blue-100/90 mt-1 leading-relaxed">
                  Tim dukungan LacakIn siap membantu Anda kapan saja.
                </p>
              </div>
            </div>

            {/* 3 Contact Action Rows */}
            <div className="space-y-2.5">
              <a
                href="https://wa.me/6281234567890"
                target="_blank"
                rel="noreferrer"
                className="flex min-h-[54px] items-center justify-between gap-3 rounded-2xl bg-white px-3.5 py-2.5 text-slate-900 shadow-sm hover:bg-blue-50 transition-colors no-underline"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <FiMessageCircle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-slate-900">WhatsApp</div>
                    <div className="text-xs font-semibold text-slate-600 truncate">+62 812-3456-7890</div>
                  </div>
                </div>
                <FiChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
              </a>

              <a
                href="mailto:support@lacakin.id"
                className="flex min-h-[54px] items-center justify-between gap-3 rounded-2xl bg-white px-3.5 py-2.5 text-slate-900 shadow-sm hover:bg-blue-50 transition-colors no-underline"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                    <FiMail className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-slate-900">Email</div>
                    <div className="text-xs font-semibold text-slate-600 truncate">support@lacakin.id</div>
                  </div>
                </div>
                <FiChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
              </a>

              <a
                href="tel:03112345678"
                className="flex min-h-[54px] items-center justify-between gap-3 rounded-2xl bg-white px-3.5 py-2.5 text-slate-900 shadow-sm hover:bg-blue-50 transition-colors no-underline"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
                    <FiPhoneCall className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-slate-900">Call Center</div>
                    <div className="text-xs font-semibold text-slate-600 truncate">(031) 1234-5678</div>
                  </div>
                </div>
                <FiChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
              </a>
            </div>

            {/* 24 Hour Footer Pill */}
            <div className="flex items-center justify-center gap-2 rounded-xl bg-white/15 border border-white/15 px-3 py-2 text-xs font-bold text-blue-50">
              <FiClock className="h-3.5 w-3.5 text-sky-300 shrink-0" />
              <span>Layanan tersedia setiap hari, 24 jam</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
