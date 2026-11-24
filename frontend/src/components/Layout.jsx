import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  FiBarChart2,
  FiBell,
  FiDatabase,
  FiHome,
  FiLogOut,
  FiMapPin,
  FiMenu,
  FiPackage,
  FiPlusSquare,
  FiSearch,
  FiSettings,
  FiSliders,
  FiTruck,
  FiUser,
  FiUsers,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext.jsx";
import { ROLE_LABEL, apiFetch, hasRole } from "../lib/api.js";
import { Navbar } from "@/components/shared/Navbar";
import { Sheet } from "@/components/ui/sheet";
import Toast from "./Toast.jsx";

export function PublicLayout() {
  const { degradedMessage, setDegradedMessage } = useAuth();
  const location = useLocation();
  const isFullBleedAuth = location.pathname === "/login";

  if (isFullBleedAuth) {
    return (
      <div className="min-h-dvh w-full">
        <Outlet />
        <Toast />
      </div>
    );
  }

  return (
    <div className="pub-shell">
      <Navbar />

      <main className="pub-content">
        {degradedMessage && (
          <div className="degraded-banner" role="alert">
            <span>{degradedMessage}</span>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: "4px 10px", fontSize: 12 }}
              onClick={() => setDegradedMessage(null)}
            >
              Tutup
            </button>
          </div>
        )}
        <Outlet />
      </main>

      <footer className="bg-[#0a1a42] text-slate-300 border-t border-white/10 mt-auto">
        <div className="mx-auto max-w-[1240px] px-5 py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 text-white">
              <img src="/logo.svg" alt="LacakIn" className="h-8 w-8 rounded-lg" />
              <div>
                <div className="font-extrabold text-base leading-none">LacakIn</div>
                <div className="text-[11px] text-blue-200/80">Logistics dan Tracking System</div>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Platform pengiriman dan pelacakan paket terintegrasi untuk kebutuhan individu, bisnis, dan korporasi di Jawa Timur.
            </p>
          </div>

          <div>
            <div className="text-xs font-extrabold uppercase tracking-wider text-white mb-3">Navigasi</div>
            <div className="flex flex-col gap-2 text-xs">
              <Link to="/beranda" className="text-slate-300 hover:text-white no-underline">Beranda</Link>
              <Link to="/lacak" className="text-slate-300 hover:text-white no-underline">Lacak Paket</Link>
              <Link to="/tarif" className="text-slate-300 hover:text-white no-underline">Cek Tarif</Link>
              <Link to="/layanan" className="text-slate-300 hover:text-white no-underline">Layanan</Link>
              <Link to="/bantuan" className="text-slate-300 hover:text-white no-underline">Pusat Bantuan</Link>
            </div>
          </div>

          <div>
            <div className="text-xs font-extrabold uppercase tracking-wider text-white mb-3">Layanan</div>
            <div className="flex flex-col gap-2 text-xs text-slate-300">
              <span>Reguler (REG)</span>
              <span>Ekspres (EXP)</span>
              <span>Sameday (SDY)</span>
              <span>Kargo (KRG)</span>
            </div>
          </div>

          <div>
            <div className="text-xs font-extrabold uppercase tracking-wider text-white mb-3">Area Layanan</div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Melayani 38 Kabupaten dan Kota serta 32 titik gerai dan hub distribusi di seluruh Provinsi Jawa Timur.
            </p>
          </div>
        </div>
      </footer>
      <Toast />
    </div>
  );
}

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { to: "/", label: "Dashboard", icon: FiHome, roles: ["superadmin", "admin", "supervisor", "operator", "kurir"], end: true },
    ],
  },
  {
    label: "Operasional",
    items: [
      { to: "/kirim", label: "Buat Pesanan", icon: FiPlusSquare, roles: ["superadmin", "admin", "operator"] },
      { to: "/checkpoint", label: "Input Checkpoint", icon: FiMapPin, roles: ["superadmin", "admin", "operator", "kurir"] },
      { to: "/pengiriman", label: "Daftar Pengiriman", icon: FiPackage, roles: ["superadmin", "admin", "supervisor", "operator", "kurir"] },
      { to: "/laporan", label: "Laporan", icon: FiBarChart2, roles: ["superadmin", "admin", "supervisor", "operator", "kurir"] },
    ],
  },
  {
    label: "Layanan",
    items: [
      { to: "/lacak", label: "Lacak Resi", icon: FiSearch, roles: ["superadmin", "admin", "supervisor", "operator", "kurir"] },
      { to: "/tarif", label: "Kalkulator Tarif", icon: FiSliders, roles: ["superadmin", "admin", "supervisor", "operator", "kurir"] },
    ],
  },
  {
    label: "Administrasi",
    items: [
      { to: "/pengajuan-kurir", label: "Manajemen Kurir", icon: FiTruck, roles: ["superadmin", "admin", "supervisor"] },
      { to: "/pegawai", label: "Manajemen Pegawai", icon: FiUsers, roles: ["superadmin", "admin"] },
      { to: "/backup", label: "Cadangan Data", icon: FiDatabase, roles: ["superadmin"] },
    ],
  },
  {
    label: "Akun",
    items: [
      { to: "/notifikasi", label: "Notifikasi", icon: FiBell, roles: ["superadmin", "admin", "supervisor", "operator", "kurir"] },
      { to: "/pengaturan", label: "Pengaturan", icon: FiSettings, roles: ["superadmin", "admin", "supervisor", "operator", "kurir"] },
      { to: "/profil", label: "Profil Saya", icon: FiUser, roles: ["superadmin", "admin", "supervisor", "operator", "kurir"] },
    ],
  },
];

function SidebarContent({ user, onNavigate, onLogoutClick }) {
  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-[#0f2354] via-[#0b1b42] to-[#081330] text-slate-200 select-none">
      {/* Brand Header */}
      <Link
        to="/"
        onClick={onNavigate}
        className="flex items-center gap-3 px-5 py-5 border-b border-white/10 no-underline text-white"
      >
        <img src="/logo.svg" alt="LacakIn" className="h-9 w-9 shrink-0 rounded-lg" />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[17px] font-extrabold tracking-tight leading-none">
            <span>LacakIn</span>
            <span className="rounded bg-blue-500/25 px-1.5 py-0.5 text-[10px] font-bold text-sky-300">v2</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400 font-medium truncate">
            Logistics dan Tracking System
          </div>
        </div>
      </Link>

      {/* Grouped Navigation */}
      <nav className="no-scrollbar flex-1 overflow-y-auto px-3.5 py-4 space-y-5" aria-label="Navigasi utama">
        {NAV_GROUPS.map((group) => {
          const visible = group.items.filter((item) => hasRole(user, item.roles));
          if (visible.length === 0) return null;
          return (
            <div key={group.label}>
              <div className="px-3 pb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-400/90">
                {group.label}
              </div>
              <div className="space-y-1">
                {visible.map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        `flex min-h-[42px] items-center gap-3 rounded-xl px-3.5 text-[13.5px] font-semibold transition-all no-underline ${
                          isActive
                            ? "bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-white shadow-md shadow-blue-900/40"
                            : "text-slate-300 hover:bg-white/8 hover:text-white"
                        }`
                      }
                    >
                      <ItemIcon className="h-[17px] w-[17px] shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Bottom Mini Fleet Card + Logout */}
      <div className="p-3.5 border-t border-white/10 space-y-2.5">
        <div className="rounded-xl bg-white/[0.06] border border-white/10 p-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs font-bold text-white truncate">{user?.full_name}</div>
            <div className="text-[11px] text-sky-300/90 truncate">
              {ROLE_LABEL[user?.role] || user?.role} · {user?.employee_code}
            </div>
          </div>
          <button
            type="button"
            onClick={onLogoutClick}
            title="Keluar"
            aria-label="Keluar dari akun"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-slate-200 hover:bg-red-500/80 hover:text-white transition-colors cursor-pointer"
          >
            <FiLogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppLayout() {
  const { user, logout, degradedMessage, setDegradedMessage } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [quickQuery, setQuickQuery] = useState("");
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifItems, setNotifItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(() => {
    const saved = localStorage.getItem("lacakin_unread_count");
    return saved === null ? 0 : Number(saved) || 0;
  });
  const searchRef = useRef(null);
  const notifRef = useRef(null);
  const navigate = useNavigate();

  // Load role-filtered notifications for header popover
  useEffect(() => {
    let active = true;
    const role = user?.role || "kurir";
    const canReviewCouriers = ["superadmin", "admin", "supervisor"].includes(role);
    const canCp = ["superadmin", "admin", "operator", "kurir"].includes(role);
    const courierSet = new Set(["BOOKED", "DITERIMA", "DALAM_PERJALANAN", "DIKIRIM", "GAGAL_KIRIM"]);
    const operatorSet = new Set(["BOOKED", "DITERIMA", "DISIMPAN", "DALAM_PERJALANAN", "GAGAL_KIRIM"]);
    const supSet = new Set(["GAGAL_KIRIM", "RETUR", "DALAM_PERJALANAN", "SELESAI"]);
    const readStorageKey = `lacakin_read_notifs_${user?.id || "anon"}`;

    (async () => {
      try {
        const [shipRes, userRes] = await Promise.all([
          apiFetch("/api/shipments?limit=15").catch(() => ({ items: [] })),
          canReviewCouriers ? apiFetch("/api/couriers/applications").catch(() => []) : Promise.resolve([]),
        ]);
        if (!active) return;
        const list = [];
        if (canReviewCouriers && Array.isArray(userRes)) {
          userRes.filter((u) => !u.is_active && u.review_status !== "rejected").forEach((u) => {
            list.push({
              id: `user-${u.id}`,
              title: `Pengajuan Kurir: ${u.full_name}`,
              sub: `${u.employee_code} menunggu verifikasi dokumen`,
              to: "/pengajuan-kurir",
            });
          });
        }
        const ships = Array.isArray(shipRes?.items) ? shipRes.items : [];
        ships.forEach((s) => {
          if (role === "kurir" && !courierSet.has(s.current_status)) return;
          if (role === "operator" && !operatorSet.has(s.current_status)) return;
          if (role === "supervisor" && !supSet.has(s.current_status)) return;
          const isPickup = s.current_status === "BOOKED";
          const isAssignedToMe = user?.id && Number(s.assigned_courier_id) === Number(user.id);
          let title = `Resi ${s.code}`;
          if (isPickup && canCp) title = `Pickup Online: ${s.code}`;
          else if (role === "kurir" && isAssignedToMe) title = `Tugas Anda: ${s.code}`;
          else if (role === "operator") title = `Gudang: ${s.code}`;
          list.push({
            id: `ship-${s.code}-${s.version || 1}`,
            title,
            sub: `${s.current_location || "-"} · ${s.current_status}`,
            to: (isPickup || role === "kurir") && canCp ? `/checkpoint?code=${encodeURIComponent(s.code)}` : `/lacak?code=${encodeURIComponent(s.code)}`,
          });
        });
        setNotifItems(list.slice(0, 6));
        const readIds = JSON.parse(localStorage.getItem(readStorageKey) || "[]");
        const unread = list.filter((n) => !readIds.includes(n.id)).length;
        setUnreadCount(unread);
        localStorage.setItem("lacakin_unread_count", String(unread));
      } catch {
        // ignore transient error
      }
    })();

    const onClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      active = false;
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [user?.role]);

  // Sync unread notification badge across pages & tabs
  useEffect(() => {
    const onNotifUpdate = (e) => {
      const val = e?.detail?.unread;
      if (typeof val === "number") {
        setUnreadCount(val);
      } else {
        setUnreadCount(Number(localStorage.getItem("lacakin_unread_count") || 0));
      }
    };
    window.addEventListener("lacakin:notif-updated", onNotifUpdate);
    window.addEventListener("storage", onNotifUpdate);
    return () => {
      window.removeEventListener("lacakin:notif-updated", onNotifUpdate);
      window.removeEventListener("storage", onNotifUpdate);
    };
  }, []);

  // Ctrl+K shortcut for global search bar
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleQuickSearch = (e) => {
    e.preventDefault();
    const clean = quickQuery.trim().toUpperCase();
    if (!clean) return;
    if (/^(LOG|DR|LOAD)-/i.test(clean)) {
      navigate(`/lacak?code=${encodeURIComponent(clean)}`);
    } else {
      navigate(`/pengiriman`);
    }
    setQuickQuery("");
  };

  const doLogout = () => {
    setConfirmLogout(false);
    logout();
    navigate("/lacak");
  };

  const initials = (user?.full_name || "U")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-dvh w-full bg-[#f3f6fc]">
      {/* Fixed Desktop Dark Navy Sidebar */}
      <aside className="hidden lg:block w-[256px] shrink-0 sticky top-0 h-dvh">
        <SidebarContent
          user={user}
          onNavigate={() => {}}
          onLogoutClick={() => setConfirmLogout(true)}
        />
      </aside>

      {/* Mobile Drawer Sheet */}
      <Sheet
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        side="left"
        title="Menu LacakIn"
        className="p-0"
      >
        <div className="-m-5 h-full">
          <SidebarContent
            user={user}
            onNavigate={() => setDrawerOpen(false)}
            onLogoutClick={() => {
              setDrawerOpen(false);
              setConfirmLogout(true);
            }}
          />
        </div>
      </Sheet>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 py-3 sm:px-7">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Buka menu navigasi"
                className="inline-flex lg:hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <FiMenu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <div className="text-base sm:text-xl font-extrabold tracking-tight text-slate-900 truncate">
                  Selamat Datang, {user?.full_name}
                </div>
                <div className="hidden sm:block text-xs text-slate-500 truncate">
                  Pantau dan kelola seluruh aktivitas pengiriman LacakIn dari satu dashboard.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3">
              {/* Global Search Input (Ctrl K) */}
              <form onSubmit={handleQuickSearch} className="hidden md:flex items-center relative w-[290px] xl:w-[340px]">
                <FiSearch className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  ref={searchRef}
                  type="text"
                  value={quickQuery}
                  onChange={(e) => setQuickQuery(e.target.value)}
                  placeholder="Cari resi, lokasi, atau pengiriman..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-14 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <kbd className="pointer-events-none absolute right-2.5 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-semibold text-slate-400">
                  Ctrl K
                </kbd>
              </form>

              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={() => setNotifOpen((v) => !v)}
                  aria-label="Notifikasi aktivitas terbaru"
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  <FiBell className="h-[18px] w-[18px]" />
                  {unreadCount > 0 && (
                    <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-[320px] sm:w-[360px] rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15 z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/70">
                      <div className="text-xs font-extrabold text-slate-900">
                        Notifikasi ({ROLE_LABEL[user?.role] || user?.role})
                      </div>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const key = `lacakin_read_notifs_${user?.id || "anon"}`;
                            const readIds = JSON.parse(localStorage.getItem(key) || "[]");
                            const merged = Array.from(new Set([...readIds, ...notifItems.map((n) => n.id)]));
                            localStorage.setItem(key, JSON.stringify(merged));
                            localStorage.setItem("lacakin_unread_count", "0");
                            setUnreadCount(0);
                            window.dispatchEvent(new CustomEvent("lacakin:notif-updated", { detail: { unread: 0 } }));
                          }}
                          className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                        >
                          Tandai Dibaca
                        </button>
                      )}
                    </div>

                    <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-100">
                      {notifItems.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-500">
                          Belum ada notifikasi baru untuk peran Anda.
                        </div>
                      ) : (
                        notifItems.map((n) => (
                          <Link
                            key={n.id}
                            to={n.to}
                            onClick={() => setNotifOpen(false)}
                            className="block px-4 py-3 hover:bg-blue-50/50 transition-colors no-underline"
                          >
                            <div className="text-xs font-extrabold text-slate-900 truncate">{n.title}</div>
                            <div className="text-[11px] text-slate-500 truncate mt-0.5">{n.sub}</div>
                          </Link>
                        ))
                      )}
                    </div>

                    <Link
                      to="/notifikasi"
                      onClick={() => setNotifOpen(false)}
                      className="block border-t border-slate-100 bg-slate-50/80 py-2.5 text-center text-xs font-extrabold text-blue-700 hover:bg-blue-50 no-underline"
                    >
                      Lihat Semua Notifikasi
                    </Link>
                  </div>
                )}
              </div>

              <Link
                to="/profil"
                title="Profil Saya"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] text-xs font-extrabold text-white shadow-sm overflow-hidden no-underline"
              >
                {user?.avatar_url && !avatarFailed ? (
                  <img
                    src={user.avatar_url}
                    alt={user.full_name}
                    onError={() => setAvatarFailed(true)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials
                )}
              </Link>
            </div>
          </div>
        </header>

        {/* Page Outlet */}
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-5 sm:px-7 sm:py-6">
          {degradedMessage && (
            <div className="degraded-banner" role="alert">
              <span>{degradedMessage}</span>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: "4px 10px", fontSize: 12 }}
                onClick={() => setDegradedMessage(null)}
              >
                Tutup
              </button>
            </div>
          )}
          <Outlet />
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      {confirmLogout && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Konfirmasi Keluar">
          <div className="card-box" style={{ width: "100%", maxWidth: 380, textAlign: "center" }}>
            <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 8 }}>Keluar dari Akun?</h3>
            <p style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 20 }}>
              Anda perlu masuk kembali untuk mengakses panel operasional pegawai.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button type="button" className="btn-secondary" onClick={() => setConfirmLogout(false)}>
                Batal
              </button>
              <button type="button" className="btn-danger" style={{ padding: "9px 18px" }} onClick={doLogout}>
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast />
    </div>
  );
}
