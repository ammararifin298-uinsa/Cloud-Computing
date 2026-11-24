import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { FiGrid, FiHelpCircle, FiHome, FiLayers, FiLogIn, FiMenu, FiSearch, FiSliders, FiUserPlus } from "react-icons/fi";
import { Sheet } from "@/components/ui/sheet";
import { useAuth } from "@/context/AuthContext.jsx";

export function Navbar() {
  const { isAuthenticated } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const desktopLinkCls = ({ isActive }: { isActive: boolean }) =>
    `inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-full px-3 text-[13px] font-semibold transition-all no-underline ${
      isActive
        ? "bg-white text-[#0f2354] shadow-sm font-bold"
        : "text-blue-100 hover:bg-white/10 hover:text-white"
    }`;

  const mobileLinkCls = ({ isActive }: { isActive: boolean }) =>
    `inline-flex min-h-[44px] items-center gap-2.5 rounded-xl px-3.5 text-sm font-semibold transition-colors no-underline ${
      isActive
        ? "bg-blue-50 text-blue-700 font-bold"
        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
    }`;

  return (
    <header className="sticky top-0 z-40 w-full bg-gradient-to-r from-[#0a1d4e] via-[#0f2b6d] to-[#133a8f] border-b border-white/10 shadow-md shadow-blue-950/15">
      <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
        {/* Brand */}
        <Link to="/beranda" className="flex min-h-[44px] shrink-0 items-center gap-2.5 no-underline text-white">
          <img src="/logo.svg" alt="Logo LacakIn" className="h-9 w-9 shrink-0 rounded-lg" />
          <div>
            <div className="flex items-center gap-1.5 text-[17px] font-extrabold tracking-tight leading-none">
              <span>LacakIn</span>
              <span className="rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-bold text-sky-300">v2</span>
            </div>
            <div className="text-[10.5px] text-blue-200/80 font-medium mt-0.5 hidden xl:block whitespace-nowrap">
              Logistics dan Tracking System
            </div>
          </div>
        </Link>

        {/* Center Desktop Links */}
        <nav className="hidden lg:flex items-center gap-1" aria-label="Navigasi desktop">
          <NavLink to="/beranda" className={desktopLinkCls}>
            <FiHome className="h-4 w-4" />
            Beranda
          </NavLink>
          <NavLink to="/lacak" className={desktopLinkCls}>
            <FiSearch className="h-4 w-4" />
            Lacak Paket
          </NavLink>
          <NavLink to="/tarif" className={desktopLinkCls}>
            <FiSliders className="h-4 w-4" />
            Cek Tarif
          </NavLink>
          <NavLink to="/kirim" className={desktopLinkCls}>
            <FiGrid className="h-4 w-4" />
            Kirim Paket
          </NavLink>
          <NavLink to="/layanan" className={desktopLinkCls}>
            <FiLayers className="h-4 w-4" />
            Layanan
          </NavLink>
          <NavLink to="/bantuan" className={desktopLinkCls}>
            <FiHelpCircle className="h-4 w-4" />
            Bantuan
          </NavLink>
        </nav>

        {/* Right Desktop CTA */}
        <div className="hidden lg:flex items-center gap-2 shrink-0">
          {isAuthenticated ? (
            <NavLink
              to="/"
              className="inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap rounded-xl bg-white px-3.5 text-[13px] font-bold text-[#0f2354] shadow-sm hover:bg-blue-50 transition-colors no-underline"
            >
              <FiGrid className="h-4 w-4 text-blue-600" />
              Panel Operasional
            </NavLink>
          ) : (
            <>
              <NavLink
                to="/register"
                className="inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap rounded-xl border border-white/25 bg-white/10 px-3.5 text-[13px] font-bold text-white hover:bg-white/20 transition-colors no-underline"
              >
                <FiUserPlus className="h-4 w-4 text-sky-300" />
                Daftar Kurir
              </NavLink>
              <NavLink
                to="/login"
                className="inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap rounded-xl bg-white px-3.5 text-[13px] font-bold text-[#0f2354] shadow-sm hover:bg-blue-50 transition-colors no-underline"
              >
                <FiLogIn className="h-4 w-4 text-blue-600" />
                Masuk Pegawai
              </NavLink>
            </>
          )}
        </div>

        {/* Mobile Menu Trigger (44x44px) */}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Buka menu navigasi"
          className="inline-flex lg:hidden h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/20 cursor-pointer"
        >
          <FiMenu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile Sheet Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen} side="right" title="Navigasi LacakIn">
        <nav className="flex flex-col gap-2" aria-label="Navigasi mobile">
          <NavLink to="/beranda" className={mobileLinkCls} onClick={() => setDrawerOpen(false)}>
            <FiHome className="h-4 w-4" />
            Beranda
          </NavLink>
          <NavLink to="/lacak" className={mobileLinkCls} onClick={() => setDrawerOpen(false)}>
            <FiSearch className="h-4 w-4" />
            Lacak Paket
          </NavLink>
          <NavLink to="/tarif" className={mobileLinkCls} onClick={() => setDrawerOpen(false)}>
            <FiSliders className="h-4 w-4" />
            Cek Tarif Jawa Timur
          </NavLink>
          <NavLink to="/layanan" className={mobileLinkCls} onClick={() => setDrawerOpen(false)}>
            <FiLayers className="h-4 w-4" />
            Layanan
          </NavLink>
          <NavLink to="/bantuan" className={mobileLinkCls} onClick={() => setDrawerOpen(false)}>
            <FiHelpCircle className="h-4 w-4" />
            Pusat Bantuan
          </NavLink>
          <div className="my-2 border-t border-border" />
          {isAuthenticated ? (
            <NavLink
              to="/"
              onClick={() => setDrawerOpen(false)}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-sm no-underline"
            >
              <FiGrid className="h-4 w-4" />
              Buka Panel Operasional
            </NavLink>
          ) : (
            <>
              <NavLink to="/register" className={mobileLinkCls} onClick={() => setDrawerOpen(false)}>
                <FiUserPlus className="h-4 w-4" />
                Daftar Kurir Baru
              </NavLink>
              <NavLink
                to="/login"
                onClick={() => setDrawerOpen(false)}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-sm no-underline"
              >
                <FiLogIn className="h-4 w-4" />
                Masuk Portal Pegawai
              </NavLink>
            </>
          )}
        </nav>
      </Sheet>
    </header>
  );
}
