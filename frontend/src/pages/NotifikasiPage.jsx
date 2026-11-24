import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiAlertCircle,
  FiBell,
  FiCheck,
  FiChevronRight,
  FiClock,
  FiHome,
  FiPackage,
  FiRefreshCw,
  FiSearch,
  FiTruck,
  FiUserCheck,
} from "react-icons/fi";
import StatusBadge from "../components/StatusBadge.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { ROLE_LABEL, apiFetch, formatDateTime } from "../lib/api.js";

const COURIER_RELEVANT = new Set(["BOOKED", "DITERIMA", "DALAM_PERJALANAN", "DIKIRIM", "GAGAL_KIRIM"]);
const OPERATOR_RELEVANT = new Set(["BOOKED", "DITERIMA", "DISIMPAN", "DALAM_PERJALANAN", "GAGAL_KIRIM"]);
const SUPERVISOR_ALERT = new Set(["GAGAL_KIRIM", "RETUR", "DALAM_PERJALANAN", "SELESAI"]);

export default function NotifikasiPage() {
  const { user, showToast } = useAuth();
  const [shipments, setShipments] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const readStorageKey = `lacakin_read_notifs_${user?.id || "anon"}`;
  const [readIds, setReadIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`lacakin_read_notifs_${user?.id || "anon"}`) || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      setReadIds(JSON.parse(localStorage.getItem(readStorageKey) || "[]"));
    } catch {
      setReadIds([]);
    }
  }, [readStorageKey]);

  const role = user?.role || "kurir";
  const canReviewCouriers = ["superadmin", "admin", "supervisor"].includes(role);
  const canCheckpoint = ["superadmin", "admin", "operator", "kurir"].includes(role);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const promises = [apiFetch("/api/shipments?limit=35")];
      if (canReviewCouriers) {
        promises.push(apiFetch("/api/couriers/applications").catch(() => []));
      }
      const [shipRes, userRes] = await Promise.all(promises);
      setShipments(Array.isArray(shipRes?.items) ? shipRes.items : Array.isArray(shipRes) ? shipRes : []);
      if (Array.isArray(userRes)) {
        setPendingUsers(userRes.filter((u) => !u.is_active && u.review_status !== "rejected"));
      }
    } catch {
      // keep existing state on transient error
    } finally {
      setLoading(false);
    }
  }, [canReviewCouriers]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const notifications = useMemo(() => {
    const items = [];

    // 1. Admin/Superadmin/Supervisor: pending courier document reviews
    if (canReviewCouriers) {
      pendingUsers.forEach((u) => {
        items.push({
          id: `user-${u.id}`,
          type: "admin",
          title: `Pengajuan Kurir Baru: ${u.full_name}`,
          desc: `${u.employee_code} (${u.hub_name || u.station || "Jawa Timur"}) menunggu verifikasi dokumen.`,
          time: u.created_at,
          to: "/pengajuan-kurir",
          status: null,
        });
      });
    }

    // 2. Role-filtered shipment notifications
    shipments.forEach((s) => {
      if (role === "kurir" && !COURIER_RELEVANT.has(s.current_status)) return;
      if (role === "operator" && !OPERATOR_RELEVANT.has(s.current_status)) return;
      if (role === "supervisor" && !SUPERVISOR_ALERT.has(s.current_status)) return;

      const isPickup = s.current_status === "BOOKED";
      const isAlert = s.current_status === "GAGAL_KIRIM" || s.current_status === "RETUR";
      const isAssignedToMe = user?.id && Number(s.assigned_courier_id) === Number(user.id);

      let title = `Resi ${s.code} (${s.receiver_name || "Pengiriman"})`;
      if (isPickup && canCheckpoint) {
        title = `Permintaan Pickup Online: ${s.code}`;
      } else if (role === "kurir" && isAssignedToMe) {
        title = `Tugas Anda: ${s.code}`;
      } else if (role === "operator") {
        title = `Gudang (${s.origin_hub_code || s.dest_hub_code || "Hub"}): ${s.code}`;
      } else if (isAlert) {
        title = `Perhatian Pengiriman: ${s.code}`;
      }

      const targetRoute =
        (isPickup || (role === "kurir" && COURIER_RELEVANT.has(s.current_status))) && canCheckpoint
          ? `/checkpoint?code=${encodeURIComponent(s.code)}`
          : `/lacak?code=${encodeURIComponent(s.code)}`;

      items.push({
        id: `ship-${s.code}-${s.version || 1}`,
        type: isPickup ? "pickup" : isAlert ? "alert" : "shipment",
        title,
        desc: `Lokasi terkini: ${s.current_location || "-"} (${s.service_code || "REG"})${
          s.assigned_courier_name ? ` · Kurir: ${s.assigned_courier_name}` : ""
        }`,
        time: s.updated_at || s.created_at,
        to: targetRoute,
        status: s.current_status,
      });
    });

    return items.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
  }, [pendingUsers, shipments, canReviewCouriers, role, canCheckpoint, user?.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notifications.filter((n) => {
      const isRead = readIds.includes(n.id);
      const matchTab =
        tab === "all" ||
        (tab === "unread" && !isRead) ||
        (tab === "pickup" && n.type === "pickup") ||
        (tab === "shipment" && (n.type === "shipment" || n.type === "alert")) ||
        (tab === "admin" && n.type === "admin");
      const matchSearch =
        !q || n.title.toLowerCase().includes(q) || n.desc.toLowerCase().includes(q);
      return matchTab && matchSearch;
    });
  }, [notifications, readIds, tab, search]);

  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length;

  useEffect(() => {
    localStorage.setItem("lacakin_unread_count", String(unreadCount));
    window.dispatchEvent(new CustomEvent("lacakin:notif-updated", { detail: { unread: unreadCount } }));
  }, [unreadCount]);

  function markAllRead() {
    const allIds = notifications.map((n) => n.id);
    setReadIds(allIds);
    localStorage.setItem(readStorageKey, JSON.stringify(allIds));
    localStorage.setItem("lacakin_unread_count", "0");
    window.dispatchEvent(new CustomEvent("lacakin:notif-updated", { detail: { unread: 0 } }));
    showToast("Semua notifikasi ditandai sudah dibaca", "success");
  }

  function markOneRead(id) {
    if (readIds.includes(id)) return;
    const next = [...readIds, id];
    const nextUnread = notifications.filter((n) => !next.includes(n.id)).length;
    setReadIds(next);
    localStorage.setItem(readStorageKey, JSON.stringify(next));
    localStorage.setItem("lacakin_unread_count", String(nextUnread));
    window.dispatchEvent(new CustomEvent("lacakin:notif-updated", { detail: { unread: nextUnread } }));
  }

  return (
    <div className="space-y-5 pb-8">
      {/* BREADCRUMB & HEADER */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          <Link to="/" className="hover:text-blue-600 no-underline text-slate-500">
            <FiHome className="h-3.5 w-3.5" />
          </Link>
          <FiChevronRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="font-bold text-slate-800">Notifikasi</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 shadow-xs">
              <FiBell className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
                  Pusat Notifikasi
                </h1>
                <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[11px] font-extrabold text-blue-700">
                  {ROLE_LABEL[role] || role}
                </span>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-rose-500 px-2.5 py-0.5 text-[11px] font-extrabold text-white">
                    {unreadCount} baru
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500">
                Notifikasi disaring otomatis sesuai tugas dan wewenang jabatan Anda.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadNotifications}
              disabled={loading}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 text-xs font-bold text-slate-700 cursor-pointer"
            >
              <FiRefreshCw className={`h-3.5 w-3.5 text-blue-600 ${loading ? "animate-spin" : ""}`} />
              <span>Segarkan</span>
            </button>

            <button
              type="button"
              onClick={markAllRead}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 text-xs font-extrabold text-white shadow-xs cursor-pointer"
            >
              <FiCheck className="h-3.5 w-3.5" />
              <span>Tandai Semua Dibaca</span>
            </button>
          </div>
        </div>
      </div>

      {/* FILTER TABS & SEARCH */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "all", label: `Semua (${notifications.length})` },
            { id: "unread", label: `Belum Dibaca (${unreadCount})` },
            ...(canCheckpoint ? [{ id: "pickup", label: "Pickup Online" }] : []),
            { id: "shipment", label: "Pengiriman" },
            ...(canReviewCouriers ? [{ id: "admin", label: "Persetujuan Kurir" }] : []),
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`min-h-[38px] rounded-xl px-4 text-xs font-bold transition-colors cursor-pointer ${
                tab === t.id
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-[280px]">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari resi atau aktivitas..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* NOTIFICATION LIST */}
      <div className="rounded-3xl border border-slate-200/90 bg-white shadow-sm overflow-hidden divide-y divide-slate-100">
        {loading && notifications.length === 0 ? (
          <div className="p-10 text-center text-xs font-medium text-slate-500">
            Memuat notifikasi terbaru...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <FiBell className="h-6 w-6" />
            </div>
            <div className="text-sm font-extrabold text-slate-800">Tidak ada notifikasi</div>
            <p className="text-xs text-slate-500">
              Belum ada aktivitas yang cocok dengan filter saat ini.
            </p>
          </div>
        ) : (
          filtered.map((n) => {
            const isRead = readIds.includes(n.id);
            return (
              <Link
                key={n.id}
                to={n.to}
                onClick={() => markOneRead(n.id)}
                className={`flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 p-4 sm:px-6 transition-colors no-underline ${
                  isRead ? "bg-white hover:bg-slate-50/70" : "bg-blue-50/45 hover:bg-blue-50/80"
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                      n.type === "admin"
                        ? "bg-amber-50 text-amber-600"
                        : n.type === "alert"
                        ? "bg-rose-50 text-rose-600"
                        : n.type === "pickup"
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-blue-50 text-blue-600"
                    }`}
                  >
                    {n.type === "admin" ? (
                      <FiUserCheck className="h-5 w-5" />
                    ) : n.type === "alert" ? (
                      <FiAlertCircle className="h-5 w-5" />
                    ) : n.type === "pickup" ? (
                      <FiPackage className="h-5 w-5" />
                    ) : (
                      <FiTruck className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {!isRead && <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />}
                      <span className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                        {n.title}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">{n.desc}</div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1">
                      <FiClock className="h-3 w-3" />
                      <span>{n.time ? formatDateTime(n.time) : "Baru saja"}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  {n.status && <StatusBadge status={n.status} />}
                  <FiChevronRight className="h-4 w-4 text-slate-400" />
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
