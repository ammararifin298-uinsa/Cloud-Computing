import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { FiGrid, FiLogIn, FiMenu, FiSearch, FiSliders, FiUserPlus } from "react-icons/fi";
import { Sheet } from "@/components/ui/sheet";
import { useAuth } from "@/context/AuthContext.jsx";

export function Navbar() {
  const { isAuthenticated } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `inline-flex min-h-[44px] items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition-colors ${
      isActive
        ? "bg-secondary text-primary font-bold"
        : "text-slate-700 hover:bg-muted hover:text-foreground"
    }`;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1160px] items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <Link to="/lacak" className="flex min-h-[44px] items-center gap-2.5 no-underline">
          <img src="/logo.svg" alt="Logo LacakIn" className="h-9 w-9 shrink-0" />
          <span className="text-lg font-extrabold tracking-tight text-foreground">LacakIn</span>
        </Link>

        {/* Desktop Navbar */}
        <nav className="hidden md:flex items-center gap-1.5" aria-label="Navigasi desktop">
          <NavLink to="/lacak" className={linkCls}>
            <FiSearch className="h-4 w-4" />
            Lacak Paket
          </NavLink>
          <NavLink to="/tarif" className={linkCls}>
            <FiSliders className="h-4 w-4" />
            Cek Tarif
          </NavLink>
          {isAuthenticated ? (
            <NavLink
              to="/"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-sm hover:bg-[#085ab0] transition-colors no-underline"
            >
              <FiGrid className="h-4 w-4" />
              Panel Operasional
            </NavLink>
          ) : (
            <>
              <NavLink to="/register" className={linkCls}>
                <FiUserPlus className="h-4 w-4" />
                Daftar Kurir
              </NavLink>
              <NavLink
                to="/login"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-sm hover:bg-[#085ab0] transition-colors no-underline"
              >
                <FiLogIn className="h-4 w-4" />
                Masuk Pegawai
              </NavLink>
            </>
          )}
        </nav>

        {/* Mobile Menu Trigger (44x44px touch target) */}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Buka menu navigasi"
          className="inline-flex md:hidden h-11 w-11 items-center justify-center rounded-xl border border-border bg-card text-foreground hover:bg-muted cursor-pointer"
        >
          <FiMenu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile Sheet Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen} side="right" title="Navigasi LacakIn">
        <nav className="flex flex-col gap-2" aria-label="Navigasi mobile">
          <NavLink to="/lacak" className={linkCls} onClick={() => setDrawerOpen(false)}>
            <FiSearch className="h-4 w-4" />
            Lacak Paket
          </NavLink>
          <NavLink to="/tarif" className={linkCls} onClick={() => setDrawerOpen(false)}>
            <FiSliders className="h-4 w-4" />
            Cek Tarif Jawa Timur
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
              <NavLink to="/register" className={linkCls} onClick={() => setDrawerOpen(false)}>
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
