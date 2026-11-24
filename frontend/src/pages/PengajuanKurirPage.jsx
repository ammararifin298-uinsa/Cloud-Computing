import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiAlertCircle,
  FiCalendar,
  FiCheck,
  FiCheckCircle,
  FiChevronRight,
  FiClock,
  FiCreditCard,
  FiEdit3,
  FiEye,
  FiEyeOff,
  FiFileText,
  FiFilter,
  FiHome,
  FiMail,
  FiMapPin,
  FiMessageSquare,
  FiPhone,
  FiPlus,
  FiSearch,
  FiShield,
  FiTruck,
  FiUploadCloud,
  FiUser,
  FiUserCheck,
  FiUsers,
  FiX,
  FiXCircle,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext.jsx";
import { ROLE_LABEL, apiFetch } from "../lib/api.js";

const STATUS_META = {
  pending: {
    label: "Menunggu Review",
    badgeCls: "bg-amber-50 text-amber-700 border-amber-200",
    dotCls: "bg-amber-500",
  },
  approved: {
    label: "Disetujui",
    badgeCls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotCls: "bg-emerald-500",
  },
  rejected: {
    label: "Ditolak",
    badgeCls: "bg-rose-50 text-rose-700 border-rose-200",
    dotCls: "bg-rose-500",
  },
  revision: {
    label: "Perlu Perbaikan",
    badgeCls: "bg-violet-50 text-violet-700 border-violet-200",
    dotCls: "bg-violet-500",
  },
};

const DEFAULT_CHECKLIST = [
  { id: "ktp", label: "Data diri sesuai KTP", checked: true },
  { id: "docs", label: "Dokumen lengkap dan valid", checked: true },
  { id: "vehicle", label: "Kepemilikan kendaraan terverifikasi", checked: true },
  { id: "bank", label: "Rekening atas nama pemohon", checked: true },
  { id: "unique", label: "Tidak terdaftar sebagai kurir aktif", checked: false },
];

export default function PengajuanKurirPage() {
  const { user, showToast } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Local review overrides (for rejection / revision notes & audit trail alongside real is_active from DB)
  const [reviewOverrides, setReviewOverrides] = useState({});
  const [activeTab, setActiveTab] = useState("all"); // all | pending | approved | rejected | revision
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedId, setSelectedId] = useState(null);
  const [detailTab, setDetailTab] = useState("info"); // info | docs | audit
  const [checklist, setChecklist] = useState(DEFAULT_CHECKLIST);
  const [reviewerNote, setReviewerNote] = useState(
    "Data dan dokumen lengkap. Kendaraan sesuai dengan ketentuan. Siap untuk disetujui."
  );

  // Modal state: null | "approve" | "reject" | "revision"
  const [modalAction, setModalAction] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Lightbox preview for uploaded documents
  const [previewDoc, setPreviewDoc] = useState(null);

  // Add Courier Modal (Admin/Superadmin direct staff input)
  const canCreateCourier = user?.role === "superadmin" || user?.role === "admin";
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCourierPw, setShowCourierPw] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState("");
  const [hubs, setHubs] = useState([]);
  const [cities, setCities] = useState([]);
  const [vehicleModels, setVehicleModels] = useState([]);
  const [courierForm, setCourierForm] = useState({
    full_name: "",
    nik: "",
    phone: "",
    email: "",
    hub_id: "",
    station: "",
    city_id: "",
    vehicle_type: "Sepeda Motor",
    vehicle_model_id: "",
    vehicle_year: "2023",
    plate_number: "",
    sim_number: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    bank_name: "BRI",
    bank_account: "",
    doc_ktp_url: "",
    doc_sim_url: "",
    doc_stnk_url: "",
    doc_selfie_url: "",
    username: "",
    password: "",
  });

  useEffect(() => {
    if (!canCreateCourier) return;
    apiFetch("/api/reference")
      .then((d) => {
        setHubs(Array.isArray(d?.hubs) ? d.hubs : []);
        setCities(Array.isArray(d?.cities) ? d.cities : []);
      })
      .catch(() => {});
    apiFetch("/api/reference/vehicles")
      .then((list) => setVehicleModels(Array.isArray(list) ? list : []))
      .catch(() => {});
  }, [canCreateCourier]);

  const handleDocUpload = async (docType, file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast("Ukuran foto dokumen maksimal 5 MB", "error");
      return;
    }
    setUploadingDoc(docType);
    try {
      const fd = new FormData();
      fd.append("doc_type", docType);
      fd.append("file", file);
      const res = await apiFetch("/api/auth/register-doc", {
        method: "POST",
        body: fd,
        isFormData: true,
      });
      setCourierForm((prev) => ({ ...prev, [`doc_${docType}_url`]: res.url }));
      showToast(`Foto ${docType.toUpperCase()} terunggah`, "success");
    } catch (err) {
      showToast(err.message || "Gagal mengunggah dokumen", "error");
    } finally {
      setUploadingDoc("");
    }
  };

  const handleCreateCourier = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await apiFetch("/api/users", {
        method: "POST",
        body: {
          role: "kurir",
          full_name: courierForm.full_name.trim(),
          nik: courierForm.nik.trim(),
          phone: courierForm.phone.trim(),
          email: courierForm.email.trim(),
          hub_id: courierForm.hub_id ? Number(courierForm.hub_id) : null,
          station: courierForm.station.trim(),
          city_id: courierForm.city_id ? Number(courierForm.city_id) : null,
          vehicle_type: courierForm.vehicle_type || null,
          vehicle_model_id: courierForm.vehicle_model_id ? Number(courierForm.vehicle_model_id) : null,
          vehicle_year: courierForm.vehicle_year ? Number(courierForm.vehicle_year) : null,
          plate_number: courierForm.plate_number?.trim() || null,
          sim_number: courierForm.sim_number?.trim() || null,
          emergency_contact_name: courierForm.emergency_contact_name?.trim() || null,
          emergency_contact_phone: courierForm.emergency_contact_phone?.trim() || null,
          bank_name: courierForm.bank_name?.trim() || null,
          bank_account: courierForm.bank_account?.trim() || null,
          bank_holder: courierForm.bank_holder?.trim() || null,
          doc_ktp_url: courierForm.doc_ktp_url || null,
          doc_sim_url: courierForm.doc_sim_url || null,
          doc_stnk_url: courierForm.doc_stnk_url || null,
          doc_selfie_url: courierForm.doc_selfie_url || null,
          username: courierForm.username.trim(),
          password: courierForm.password,
          is_active: true,
        },
      });
      showToast(`Kurir ${courierForm.full_name} berhasil ditambahkan`, "success");
      setShowAddModal(false);
      await loadUsers();
    } catch (err) {
      showToast(err.message || "Gagal menambahkan kurir", "error");
    } finally {
      setCreating(false);
    }
  };

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/api/couriers/applications");
      setUsers(Array.isArray(data) ? data : []);
      setError("");
    } catch (err) {
      setError(err.message || "Gagal memuat data pengajuan kurir.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Map kurir accounts from DB into application rows
  const applications = useMemo(() => {
    return users.map((u) => {
      const override = reviewOverrides[u.id];
      const status = override?.status || u.review_status || (u.is_active ? "approved" : "pending");
      const docUrls = [u.doc_ktp_url, u.doc_sim_url, u.doc_stnk_url, u.doc_selfie_url].filter(Boolean);
      return {
        ...u,
        appStatus: status,
        note: override?.note ?? u.review_note ?? "",
        uploadedDocsCount: docUrls.length,
        audit: override?.audit || [
          {
            time: u.created_at
              ? new Date(u.created_at).toLocaleString("id-ID", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Baru saja",
            text: "Pengajuan dibuat oleh pemohon.",
            state: "done",
          },
          {
            time: "Kelengkapan Berkas",
            text: `${docUrls.length}/4 dokumen foto terunggah oleh pemohon.`,
            state: docUrls.length > 0 ? "done" : "active",
          },
          {
            time: u.reviewed_at
              ? new Date(u.reviewed_at).toLocaleString("id-ID", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Saat Ini",
            text:
              status === "approved"
                ? `Disetujui dan diaktifkan oleh ${u.reviewed_by_name || "Admin / Supervisor"}.`
                : status === "rejected"
                ? `Ditolak oleh ${u.reviewed_by_name || "Admin / Supervisor"}${u.review_note ? `: ${u.review_note}` : "."}`
                : status === "revision"
                ? `Diminta perbaikan oleh ${u.reviewed_by_name || "Admin / Supervisor"}${u.review_note ? `: ${u.review_note}` : "."}`
                : `Menunggu verifikasi dokumen oleh Admin / Supervisor.`,
            state: status === "pending" ? "active" : "done",
          },
        ],
      };
    });
  }, [users, reviewOverrides]);

  // KPI counts
  const counts = useMemo(() => {
    const total = applications.length;
    const pending = applications.filter((a) => a.appStatus === "pending").length;
    const approved = applications.filter((a) => a.appStatus === "approved").length;
    const rejected = applications.filter((a) => a.appStatus === "rejected").length;
    const revision = applications.filter((a) => a.appStatus === "revision").length;
    return { total, pending, approved, rejected, revision };
  }, [applications]);

  const stations = useMemo(() => {
    const set = new Set(applications.map((a) => a.station).filter(Boolean));
    return Array.from(set).sort();
  }, [applications]);

  const filteredApps = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = applications.filter((a) => {
      const matchTab = activeTab === "all" || a.appStatus === activeTab;
      const matchCity = !cityFilter || a.station === cityFilter;
      const matchQuery =
        !q ||
        (a.employee_code || "").toLowerCase().includes(q) ||
        (a.full_name || "").toLowerCase().includes(q) ||
        (a.station || "").toLowerCase().includes(q) ||
        (a.email || "").toLowerCase().includes(q);
      return matchTab && matchCity && matchQuery;
    });

    return list.sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : a.id;
      const tb = b.created_at ? new Date(b.created_at).getTime() : b.id;
      return sortBy === "newest" ? tb - ta : ta - tb;
    });
  }, [applications, activeTab, cityFilter, search, sortBy]);

  const selectedApp = useMemo(() => {
    if (!filteredApps.length) return null;
    return filteredApps.find((a) => a.id === selectedId) || filteredApps[0];
  }, [filteredApps, selectedId]);

  const checkedCount = checklist.filter((c) => c.checked).length;

  function toggleChecklistItem(id) {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  }

  async function handleConfirmDecision() {
    if (!selectedApp || !modalAction) return;
    setSubmitting(true);
    try {
      const nextStatus =
        modalAction === "approve"
          ? "approved"
          : modalAction === "reject"
          ? "rejected"
          : "revision";

      await apiFetch(`/api/couriers/applications/${selectedApp.id}`, {
        method: "PATCH",
        body: {
          review_status: nextStatus,
          review_note: reviewerNote.trim() || null,
        },
      });

      setReviewOverrides((prev) => {
        const copy = { ...prev };
        delete copy[selectedApp.id];
        return copy;
      });

      showToast(
        nextStatus === "approved"
          ? `Kurir ${selectedApp.full_name} berhasil disetujui dan diaktifkan.`
          : nextStatus === "rejected"
          ? `Pengajuan ${selectedApp.full_name} ditolak.`
          : `Permintaan perbaikan dikirim ke ${selectedApp.full_name}.`,
        "success"
      );
      await loadUsers();
      setModalAction(null);
    } catch (err) {
      showToast(err.message || "Gagal memperbarui status pengajuan.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5 pb-8">
      {/* BREADCRUMB & HEADER + RIGHT PROMO BANNER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        <div className="lg:col-span-8 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <Link to="/" className="hover:text-blue-600 no-underline text-slate-500">
              <FiHome className="h-3.5 w-3.5" />
            </Link>
            <FiChevronRight className="h-3.5 w-3.5 text-slate-400" />
            <span>Administrasi</span>
            <FiChevronRight className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-bold text-slate-800">Manajemen Kurir</span>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 shadow-xs">
              <FiUserCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
                Manajemen dan Pengajuan Kurir
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Verifikasi pendaftar baru, kelola data armada kendaraan, domisili, serta status kurir LacakIn.
              </p>
            </div>
          </div>

          {canCreateCourier && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 text-xs sm:text-sm font-extrabold text-white shadow-sm cursor-pointer"
              >
                <FiPlus className="h-4 w-4" />
                <span>Tambah Kurir</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Top Banner: Rekrut Kurir Berkualitas */}
        <div className="lg:col-span-4 rounded-2xl bg-gradient-to-r from-[#0e2d7d] via-[#1b50c2] to-[#2563eb] p-4 text-white shadow-md flex items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="text-xs font-extrabold uppercase tracking-wider text-sky-200">
              Rekrut Kurir
            </div>
            <div className="text-base font-extrabold leading-tight">BERKUALITAS</div>
            <div className="space-y-0.5 pt-1 text-[11px] text-blue-100">
              <div className="flex items-center gap-1.5">
                <FiCheckCircle className="h-3 w-3 text-sky-300 shrink-0" />
                <span>Verifikasi Dokumen</span>
              </div>
              <div className="flex items-center gap-1.5">
                <FiCheckCircle className="h-3 w-3 text-sky-300 shrink-0" />
                <span>Validasi Kendaraan</span>
              </div>
              <div className="flex items-center gap-1.5">
                <FiCheckCircle className="h-3 w-3 text-sky-300 shrink-0" />
                <span>Siap Operasional</span>
              </div>
            </div>
          </div>
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 border border-white/20">
            <FiTruck className="h-8 w-8 text-sky-200" />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">
          {error}
        </div>
      )}

      {/* 5 KPI STAT CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {[
          {
            label: "Total Pengajuan",
            value: counts.total,
            sub: "Akun kurir terdaftar",
            icon: FiUsers,
            cls: "bg-white border-slate-200/90",
            iconCls: "bg-blue-50 text-blue-600",
          },
          {
            label: "Menunggu Review",
            value: counts.pending,
            sub: "Perlu verifikasi",
            icon: FiClock,
            cls: "bg-amber-50/40 border-amber-200/80",
            iconCls: "bg-amber-100 text-amber-600",
          },
          {
            label: "Disetujui",
            value: counts.approved,
            sub: "Kurir aktif",
            icon: FiCheckCircle,
            cls: "bg-emerald-50/40 border-emerald-200/80",
            iconCls: "bg-emerald-100 text-emerald-600",
          },
          {
            label: "Ditolak",
            value: counts.rejected,
            sub: "Tidak memenuhi syarat",
            icon: FiXCircle,
            cls: "bg-rose-50/40 border-rose-200/80",
            iconCls: "bg-rose-100 text-rose-600",
          },
          {
            label: "Perlu Perbaikan",
            value: counts.revision,
            sub: "Menunggu pemohon",
            icon: FiEdit3,
            cls: "bg-violet-50/40 border-violet-200/80",
            iconCls: "bg-violet-100 text-violet-600",
          },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className={`rounded-2xl border p-4 shadow-xs flex items-center gap-3 ${kpi.cls}`}
            >
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${kpi.iconCls}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xl font-extrabold text-slate-900 leading-none">
                  {kpi.value}
                </div>
                <div className="text-xs font-bold text-slate-700 mt-1 truncate">{kpi.label}</div>
                <div className="text-[10.5px] text-slate-500 truncate">{kpi.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* STATUS FILTER TABS */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: "all", label: `Semua (${counts.total})`, icon: FiUsers },
          { id: "pending", label: `Menunggu Review (${counts.pending})`, icon: FiClock },
          { id: "approved", label: `Disetujui (${counts.approved})`, icon: FiCheckCircle },
          { id: "rejected", label: `Ditolak (${counts.rejected})`, icon: FiXCircle },
          { id: "revision", label: `Perlu Perbaikan (${counts.revision})`, icon: FiEdit3 },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex min-h-[40px] items-center gap-2 rounded-xl px-4 text-xs font-bold transition-all cursor-pointer ${
                active
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SPLIT MASTER-DETAIL GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* LEFT TABLE COLUMN */}
        <div className="xl:col-span-7 rounded-3xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
          {/* Search & Filter Toolbar */}
          <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 min-w-[200px]">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari di daftar pengajuan..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-3 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
              />
            </div>

            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Semua Gerai / Domisili</option>
              {stations.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="newest">Urutkan: Terbaru</option>
              <option value="oldest">Urutkan: Terlama</option>
            </select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">#ID</th>
                  <th className="py-3 px-3">Nama Pemohon</th>
                  <th className="py-3 px-3">Gerai / Domisili</th>
                  <th className="py-3 px-3">Tanggal Daftar</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-500 font-medium">
                      Memuat daftar pengajuan kurir...
                    </td>
                  </tr>
                ) : filteredApps.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-500 font-medium">
                      Tidak ada data pengajuan yang sesuai filter.
                    </td>
                  </tr>
                ) : (
                  filteredApps.map((app) => {
                    const isSelected = selectedApp?.id === app.id;
                    const meta = STATUS_META[app.appStatus] || STATUS_META.pending;
                    return (
                      <tr
                        key={app.id}
                        onClick={() => setSelectedId(app.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? "bg-blue-50/75" : "hover:bg-slate-50/80"
                        }`}
                      >
                        <td className="py-3 px-4 font-mono font-bold text-blue-700 whitespace-nowrap">
                          {app.employee_code}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-extrabold text-blue-700">
                              {(app.full_name || "K").slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 truncate">
                                {app.full_name}
                              </div>
                              <div className="text-[11px] text-slate-500 truncate">
                                {ROLE_LABEL[app.role] || app.role}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-700 font-medium">
                          <span className="inline-flex items-center gap-1">
                            <FiMapPin className="h-3 w-3 text-blue-500 shrink-0" />
                            <span>{app.station || "-"}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                          {app.created_at
                            ? new Date(app.created_at).toLocaleDateString("id-ID", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "-"}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${meta.badgeCls}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${meta.dotCls}`} />
                            {meta.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT DETAIL PANEL */}
        <div className="xl:col-span-5 rounded-3xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
          {selectedApp ? (
            <div className="p-5 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-extrabold text-slate-900">
                    Detail Pengajuan Kurir
                  </h2>
                  <span className="rounded-lg bg-blue-50 border border-blue-100 px-2 py-0.5 font-mono text-xs font-bold text-blue-700">
                    {selectedApp.employee_code}
                  </span>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                    (STATUS_META[selectedApp.appStatus] || STATUS_META.pending).badgeCls
                  }`}
                >
                  {(STATUS_META[selectedApp.appStatus] || STATUS_META.pending).label}
                </span>
              </div>

              {/* Applicant Identity Card */}
              <div className="rounded-2xl bg-slate-50/80 border border-slate-200/70 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-sm font-extrabold text-white shadow-sm">
                    {(selectedApp.full_name || "K").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold text-slate-900 truncate">
                      {selectedApp.full_name}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <FiPhone className="h-3 w-3 text-blue-500" />
                      <span>{selectedApp.phone || "-"}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                      <FiMail className="h-3 w-3 text-blue-500" />
                      <span className="truncate">{selectedApp.email || "-"}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1 text-[11.5px] sm:border-l sm:border-slate-200 sm:pl-3">
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Gerai / Hub</span>
                    <span className="font-bold text-slate-800">{selectedApp.hub_name || selectedApp.station || "-"}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Username</span>
                    <span className="font-mono font-bold text-slate-800">{selectedApp.username}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Beban Paket</span>
                    <span className="font-bold text-blue-700">{selectedApp.active_shipments || 0} paket aktif</span>
                  </div>
                </div>
              </div>

              {/* Detail Tabs */}
              <div className="flex items-center gap-1 border-b border-slate-200">
                {[
                  { id: "info", label: "Informasi dan Verifikasi", icon: FiFileText },
                  { id: "docs", label: `Dokumen (${selectedApp.uploadedDocsCount || 0}/4)`, icon: FiCreditCard },
                  { id: "audit", label: "Catatan dan Riwayat", icon: FiMessageSquare },
                ].map((t) => {
                  const Icon = t.icon;
                  const active = detailTab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setDetailTab(t.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                        active
                          ? "border-blue-600 text-blue-700"
                          : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tab 1: Informasi dan Verifikasi */}
              {detailTab === "info" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Identitas Diri & Armada */}
                    <div className="rounded-2xl border border-slate-200/80 p-3.5 space-y-2 text-xs">
                      <div className="font-extrabold text-slate-800 flex items-center gap-1.5">
                        <FiTruck className="h-3.5 w-3.5 text-blue-600" />
                        <span>Identitas dan Armada Kurir</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">NIK</span>
                        <span className="font-mono font-bold text-slate-800">{selectedApp.nik_masked || "-"}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Kendaraan</span>
                        <span className="font-bold text-slate-800 text-right">
                          {selectedApp.vehicle_brand || selectedApp.vehicle_model
                            ? `${selectedApp.vehicle_brand || ""} ${selectedApp.vehicle_model || ""} (${selectedApp.vehicle_year || "-"})`
                            : selectedApp.vehicle_type || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Plat Nomor</span>
                        <span className="font-mono font-bold text-slate-800">{selectedApp.license_plate || "-"}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Domisili</span>
                        <span className="font-bold text-slate-800 text-right">
                          {selectedApp.city_name
                            ? `${selectedApp.district_name ? `${selectedApp.district_name}, ` : ""}${selectedApp.city_name}`
                            : "-"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Status Akun</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
                            selectedApp.is_active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {selectedApp.is_active ? "Aktif Bertugas" : "Menunggu / Nonaktif"}
                        </span>
                      </div>
                    </div>

                    {/* Checklist Verifikasi */}
                    <div className="rounded-2xl border border-slate-200/80 p-3.5 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-slate-800">Checklist Verifikasi</span>
                        <span className="font-bold text-emerald-600">
                          {checkedCount}/{checklist.length}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 transition-all"
                          style={{ width: `${(checkedCount / checklist.length) * 100}%` }}
                        />
                      </div>
                      <div className="space-y-1.5 pt-1">
                        {checklist.map((item) => (
                          <label
                            key={item.id}
                            className="flex items-center gap-2 text-[11px] font-medium text-slate-700 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={item.checked}
                              onChange={() => toggleChecklistItem(item.id)}
                              className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600"
                            />
                            <span>{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Catatan Reviewer */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-extrabold text-slate-800">
                      Catatan Reviewer
                    </label>
                    <textarea
                      rows={2}
                      maxLength={500}
                      value={reviewerNote}
                      onChange={(e) => setReviewerNote(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs font-medium text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
                    />
                    <div className="text-right text-[10.5px] text-slate-400">
                      {reviewerNote.length}/500
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Dokumen */}
              {detailTab === "docs" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {[
                    { name: "Foto KTP Asli", url: selectedApp.doc_ktp_url },
                    { name: "SIM C / SIM A Aktif", url: selectedApp.doc_sim_url },
                    { name: "STNK Kendaraan", url: selectedApp.doc_stnk_url },
                    { name: "Swafoto dengan KTP", url: selectedApp.doc_selfie_url },
                  ].map((doc) => (
                    <div
                      key={doc.name}
                      className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-extrabold text-slate-900">{doc.name}</div>
                        <span
                          className={`inline-flex items-center gap-1 text-[10.5px] font-bold ${
                            doc.url ? "text-emerald-600" : "text-amber-600"
                          }`}
                        >
                          {doc.url ? (
                            <>
                              <FiCheckCircle className="h-3 w-3" />
                              <span>Terunggah</span>
                            </>
                          ) : (
                            <span>Belum Diunggah</span>
                          )}
                        </span>
                      </div>
                      {doc.url ? (
                        <button
                          type="button"
                          onClick={() => setPreviewDoc(doc)}
                          className="block w-full overflow-hidden rounded-xl border border-slate-200 bg-white hover:ring-2 hover:ring-blue-500/40 transition-all cursor-pointer"
                        >
                          <img
                            src={doc.url}
                            alt={doc.name}
                            className="aspect-[3/2] w-full object-cover"
                          />
                        </button>
                      ) : (
                        <div className="flex aspect-[3/2] w-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-[11px] font-semibold text-slate-400">
                          Tidak ada lampiran foto
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Tab 3: Riwayat Audit Pengajuan */}
              {detailTab === "audit" && (
                <div className="rounded-2xl border border-slate-200/80 p-4 space-y-3">
                  <div className="text-xs font-extrabold text-slate-800">
                    Riwayat Audit Pengajuan
                  </div>
                  <div className="space-y-3 border-l-2 border-blue-100 pl-3.5">
                    {(selectedApp.audit || []).map((ev, idx) => (
                      <div key={idx} className="relative space-y-0.5 text-xs">
                        <span
                          className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-2 ring-white ${
                            ev.state === "active" ? "bg-blue-600" : "bg-emerald-500"
                          }`}
                        />
                        <div className="text-[11px] font-bold text-slate-500">{ev.time}</div>
                        <div className="font-semibold text-slate-800">{ev.text}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status-Aware Review Action Bar */}
              {selectedApp.review_status === "approved" ? (
                <div className="space-y-2.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2.5 text-xs">
                    <div className="flex items-center gap-2 font-extrabold text-emerald-800">
                      <FiCheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Sudah Disetujui dan Aktif</span>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-700">
                      Dokumen tetap dapat ditinjau di tab Dokumen
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setModalAction("revision")}
                      className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 hover:bg-violet-100 px-3 text-xs font-extrabold text-violet-700 cursor-pointer"
                    >
                      <FiEdit3 className="h-3.5 w-3.5" />
                      <span>Minta Revisi Berkas</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalAction("reject")}
                      className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 px-3 text-xs font-extrabold text-rose-700 cursor-pointer"
                    >
                      <FiX className="h-3.5 w-3.5" />
                      <span>Nonaktifkan / Tolak</span>
                    </button>
                  </div>
                </div>
              ) : selectedApp.review_status === "rejected" ? (
                <div className="space-y-2.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50/70 px-3.5 py-2 text-xs font-bold text-rose-800">
                    <span>Pengajuan Ditolak</span>
                    <span className="text-[11px] font-semibold text-rose-600">Dapat ditinjau ulang</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setModalAction("revision")}
                      className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 hover:bg-violet-100 px-3 text-xs font-extrabold text-violet-700 cursor-pointer"
                    >
                      <FiEdit3 className="h-3.5 w-3.5" />
                      <span>Minta Perbaikan</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalAction("approve")}
                      className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-3 text-xs font-extrabold text-white shadow-sm cursor-pointer"
                    >
                      <FiCheck className="h-3.5 w-3.5" />
                      <span>Setujui Ulang dan Aktifkan</span>
                    </button>
                  </div>
                </div>
              ) : selectedApp.review_status === "revision" ? (
                <div className="space-y-2.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-violet-200 bg-violet-50/70 px-3.5 py-2 text-xs font-bold text-violet-800">
                    <span>Menunggu Perbaikan Berkas Kurir</span>
                    <span className="text-[11px] font-semibold text-violet-600">Perlu verifikasi ulang</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setModalAction("reject")}
                      className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 px-3 text-xs font-extrabold text-rose-700 cursor-pointer"
                    >
                      <FiX className="h-3.5 w-3.5" />
                      <span>Tolak Pengajuan</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalAction("approve")}
                      className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-3 text-xs font-extrabold text-white shadow-sm cursor-pointer"
                    >
                      <FiCheck className="h-3.5 w-3.5" />
                      <span>Setujui dan Aktifkan</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalAction("revision")}
                    className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 hover:bg-violet-100 px-3 text-xs font-extrabold text-violet-700 cursor-pointer"
                  >
                    <FiEdit3 className="h-3.5 w-3.5" />
                    <span>Perlu Perbaikan</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalAction("reject")}
                    className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 px-3 text-xs font-extrabold text-rose-700 cursor-pointer"
                  >
                    <FiX className="h-3.5 w-3.5" />
                    <span>Tolak</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalAction("approve")}
                    className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-3 text-xs font-extrabold text-white shadow-sm cursor-pointer"
                  >
                    <FiCheck className="h-3.5 w-3.5" />
                    <span>Setujui dan Aktifkan</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-10 text-center text-xs text-slate-500">
              Pilih salah satu pengajuan kurir di sebelah kiri untuk melihat detail dan verifikasi.
            </div>
          )}
        </div>
      </div>

      {/* CONFIRMATION MODAL */}
      {modalAction && selectedApp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-[440px] rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                    modalAction === "approve"
                      ? "bg-emerald-50 text-emerald-600"
                      : modalAction === "reject"
                      ? "bg-rose-50 text-rose-600"
                      : "bg-violet-50 text-violet-600"
                  }`}
                >
                  {modalAction === "approve" ? (
                    <FiCheckCircle className="h-6 w-6" />
                  ) : modalAction === "reject" ? (
                    <FiXCircle className="h-6 w-6" />
                  ) : (
                    <FiEdit3 className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {modalAction === "approve"
                      ? "Setujui Pengajuan Kurir?"
                      : modalAction === "reject"
                      ? "Tolak Pengajuan Kurir?"
                      : "Minta Perbaikan Data?"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedApp.full_name} ({selectedApp.employee_code})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalAction(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-600 space-y-1.5 leading-relaxed">
              {modalAction === "approve" && (
                <>
                  <div className="font-bold text-slate-800">Setelah disetujui:</div>
                  <div>• Akun kurir akan langsung diaktifkan di sistem LacakIn.</div>
                  <div>• Pemohon dapat masuk menggunakan username dan menerima tugas pengiriman.</div>
                </>
              )}
              {modalAction === "reject" && (
                <>
                  <div className="font-bold text-rose-700">Setelah ditolak:</div>
                  <div>• Akun tidak akan diaktifkan untuk operasional.</div>
                  <div>• Keputusan akan tercatat di riwayat audit pengajuan.</div>
                </>
              )}
              {modalAction === "revision" && (
                <>
                  <div className="font-bold text-violet-700">Pemohon akan diminta untuk:</div>
                  <div>• Melengkapi atau memperbaiki data sesuai catatan reviewer.</div>
                  <div>• Mengirim ulang pengajuan untuk ditinjau kembali.</div>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setModalAction(null)}
                className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmDecision}
                className={`inline-flex min-h-[42px] items-center justify-center rounded-xl px-5 text-xs font-extrabold text-white shadow-sm cursor-pointer disabled:opacity-60 ${
                  modalAction === "approve"
                    ? "bg-blue-600 hover:bg-blue-700"
                    : modalAction === "reject"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-violet-600 hover:bg-violet-700"
                }`}
              >
                {submitting
                  ? "Memproses..."
                  : modalAction === "approve"
                  ? "Setujui dan Aktifkan"
                  : modalAction === "reject"
                  ? "Tolak Pengajuan"
                  : "Kirim Permintaan Perbaikan"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleCreateCourier}
            autoComplete="off"
            className="w-full max-w-[680px] max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Tambah Kurir Baru</h3>
                <p className="text-xs text-slate-500">Lengkapi data identitas, kendaraan, domisili, dan berkas kurir sesuai database.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Lengkap *</label>
                <input
                  required
                  value={courierForm.full_name}
                  onChange={(e) => setCourierForm({ ...courierForm, full_name: e.target.value })}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">NIK (16 Digit) *</label>
                <input
                  required
                  maxLength={16}
                  pattern="\d{16}"
                  value={courierForm.nik}
                  onChange={(e) => setCourierForm({ ...courierForm, nik: e.target.value.replace(/\D/g, "") })}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">No. HP *</label>
                <input
                  required
                  value={courierForm.phone}
                  onChange={(e) => setCourierForm({ ...courierForm, phone: e.target.value })}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Email *</label>
                <input
                  required
                  type="email"
                  value={courierForm.email}
                  onChange={(e) => setCourierForm({ ...courierForm, email: e.target.value })}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Gerai / Hub Penempatan *</label>
                <select
                  required
                  value={courierForm.hub_id}
                  onChange={(e) => {
                    const selected = hubs.find((h) => String(h.id) === e.target.value);
                    setCourierForm({
                      ...courierForm,
                      hub_id: e.target.value,
                      station: selected ? selected.name : "",
                    });
                  }}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3"
                >
                  <option value="">-- Pilih Gerai / Hub --</option>
                  {hubs.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.city_name})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Kota / Kabupaten Domisili</label>
                <select
                  value={courierForm.city_id}
                  onChange={(e) => setCourierForm({ ...courierForm, city_id: e.target.value })}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3"
                >
                  <option value="">-- Pilih Kota / Kab --</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Jenis Kendaraan</label>
                <select
                  value={courierForm.vehicle_type}
                  onChange={(e) =>
                    setCourierForm({ ...courierForm, vehicle_type: e.target.value, vehicle_model_id: "" })
                  }
                  className="h-10 w-full rounded-xl border border-slate-200 px-3"
                >
                  <option value="Sepeda Motor">Sepeda Motor</option>
                  <option value="Mobil Van / Blind Van">Mobil Van / Blind Van</option>
                  <option value="Pick Up / Box">Pick Up / Box</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Model Kendaraan</label>
                <select
                  value={courierForm.vehicle_model_id}
                  onChange={(e) => setCourierForm({ ...courierForm, vehicle_model_id: e.target.value })}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3"
                >
                  <option value="">-- Pilih Model --</option>
                  {vehicleModels
                    .filter((m) => m.vehicle_type === courierForm.vehicle_type)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.brand} {m.model} (min {m.min_year})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tahun dan Plat Nomor</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min={2010}
                    max={2026}
                    value={courierForm.vehicle_year}
                    onChange={(e) => setCourierForm({ ...courierForm, vehicle_year: e.target.value })}
                    placeholder="Tahun"
                    className="h-10 w-full rounded-xl border border-slate-200 px-2.5"
                  />
                  <input
                    value={courierForm.plate_number}
                    onChange={(e) =>
                      setCourierForm({ ...courierForm, plate_number: e.target.value.toUpperCase() })
                    }
                    placeholder="L 1234 AB"
                    className="h-10 w-full rounded-xl border border-slate-200 px-2.5 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nomor SIM Aktif</label>
                <input
                  value={courierForm.sim_number}
                  onChange={(e) => setCourierForm({ ...courierForm, sim_number: e.target.value })}
                  placeholder="Nomor SIM C / A"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Bank Payroll</label>
                <select
                  value={courierForm.bank_name}
                  onChange={(e) => setCourierForm({ ...courierForm, bank_name: e.target.value })}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3"
                >
                  {["BRI", "BCA", "Mandiri", "BNI", "BSI", "BTN", "Bank Jatim", "CIMB Niaga"].map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nomor Rekening Payroll</label>
                <input
                  value={courierForm.bank_account}
                  onChange={(e) =>
                    setCourierForm({ ...courierForm, bank_account: e.target.value.replace(/\D/g, "") })
                  }
                  placeholder="Nomor rekening sesuai buku tabungan"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Pemilik Rekening</label>
                <input
                  value={courierForm.bank_holder || ""}
                  onChange={(e) => setCourierForm({ ...courierForm, bank_holder: e.target.value })}
                  placeholder="Sesuai buku tabungan"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Username *</label>
                <input
                  required
                  name="courier_username_new"
                  autoComplete="off"
                  value={courierForm.username}
                  onChange={(e) => setCourierForm({ ...courierForm, username: e.target.value })}
                  placeholder="Username login kurir"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Password *</label>
                <div className="relative">
                  <input
                    required
                    name="courier_password_new"
                    autoComplete="new-password"
                    type={showCourierPw ? "text" : "password"}
                    minLength={6}
                    value={courierForm.password}
                    onChange={(e) => setCourierForm({ ...courierForm, password: e.target.value })}
                    placeholder="Minimal 6 karakter"
                    className="h-10 w-full rounded-xl border border-slate-200 pl-3 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCourierPw((v) => !v)}
                    aria-label={showCourierPw ? "Sembunyikan password" : "Lihat password"}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showCourierPw ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-1 border-t border-slate-100 space-y-2">
              <div className="text-xs font-extrabold text-slate-700">Unggah Berkas Kurir (Opsional)</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                {[
                  { key: "ktp", label: "Foto KTP" },
                  { key: "sim", label: "Foto SIM" },
                  { key: "stnk", label: "Foto STNK" },
                  { key: "selfie", label: "Swafoto" },
                ].map((d) => {
                  const url = courierForm[`doc_${d.key}_url`];
                  return (
                    <label
                      key={d.key}
                      className={`flex flex-col items-center justify-center rounded-xl border border-dashed p-2.5 text-center cursor-pointer ${
                        url ? "border-emerald-300 bg-emerald-50/50 text-emerald-700" : "border-slate-300 text-slate-500"
                      }`}
                    >
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => handleDocUpload(d.key, e.target.files?.[0])}
                      />
                      <FiUploadCloud className="h-4 w-4 mb-1" />
                      <span className="font-bold">
                        {uploadingDoc === d.key ? "..." : url ? `${d.label} ✓` : d.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="min-h-[40px] rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-700 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={creating}
                className="min-h-[40px] rounded-xl bg-blue-600 hover:bg-blue-700 px-5 text-xs font-extrabold text-white cursor-pointer"
              >
                {creating ? "Menyimpan..." : "Simpan Kurir"}
              </button>
            </div>
          </form>
        </div>
      )}

      {previewDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewDoc(null)}
        >
          <div
            className="w-full max-w-[680px] rounded-3xl bg-white p-4 shadow-2xl border border-slate-200 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="text-sm font-extrabold text-slate-900">{previewDoc.name}</div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-hidden rounded-2xl bg-slate-100 border border-slate-200">
              <img
                src={previewDoc.url}
                alt={previewDoc.name}
                className="max-h-[75vh] w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
