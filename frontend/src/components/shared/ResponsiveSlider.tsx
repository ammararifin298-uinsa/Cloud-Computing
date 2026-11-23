import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { FiClock, FiMapPin, FiShield, FiTruck } from "react-icons/fi";
import { useAppStore } from "@/store/useAppStore";

const ITEMS = [
  {
    badge: "Layanan Reguler",
    title: "Jangkauan 38 Kabupaten dan Kota Jawa Timur",
    desc: "Pengiriman ekonomis antarkota dengan pembaruan posisi paket transparan di setiap gerai.",
    icon: FiTruck,
    gradient: "from-[#0b72d9] via-[#0855a8] to-[#063975]",
  },
  {
    badge: "Layanan Ekspres dan Sameday",
    title: "Pengiriman Cepat dan Terukur Tepat Waktu",
    desc: "Prioritas rute lintas zona Surabaya, Malang, Kediri, Jember, hingga Banyuwangi.",
    icon: FiClock,
    gradient: "from-[#0284c7] via-[#0369a1] to-[#0c4a6e]",
  },
  {
    badge: "Bukti Foto dan Privasi",
    title: "Dokumentasi Serah Terima yang Aman dan Terjaga",
    desc: "Setiap penyerahan dilengkapi foto bukti asli dengan perlindungan privasi data pelanggan.",
    icon: FiShield,
    gradient: "from-[#0d9488] via-[#0f766e] to-[#115e59]",
  },
];

export function ResponsiveSlider() {
  const setActiveSlide = useAppStore((s) => s.setActiveSlide);

  return (
    <div className="w-full overflow-hidden rounded-2xl shadow-md">
      <Swiper
        modules={[Autoplay, Pagination]}
        spaceBetween={14}
        slidesPerView={1}
        grabCursor
        touchEventsTarget="container"
        autoplay={{ delay: 4500, disableOnInteraction: false }}
        pagination={{ clickable: true }}
        onSlideChange={(swiper) => setActiveSlide(swiper.activeIndex)}
        className="w-full"
      >
        {ITEMS.map((slide, idx) => {
          const SlideIcon = slide.icon;
          return (
            <SwiperSlide key={idx}>
              <div
                className={`bg-gradient-to-br ${slide.gradient} p-6 sm:p-8 text-white flex flex-col justify-between min-h-[185px] select-none`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="max-w-xl">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold tracking-wide">
                      <FiMapPin className="h-3.5 w-3.5" />
                      {slide.badge}
                    </span>
                    <h2 className="mt-3 text-lg sm:text-2xl font-extrabold tracking-tight leading-snug">
                      {slide.title}
                    </h2>
                    <p className="mt-2 text-sm text-white/90 leading-relaxed">{slide.desc}</p>
                  </div>
                  <div className="hidden sm:grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/15 border border-white/20">
                    <SlideIcon className="h-7 w-7 text-white" />
                  </div>
                </div>
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
}
