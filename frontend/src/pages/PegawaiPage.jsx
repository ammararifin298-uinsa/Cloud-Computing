import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiCheckCircle,
  FiChevronRight,
  FiClock,
  FiCreditCard,
  FiEdit2,
  FiEye,
  FiEyeOff,
  FiFileText,
  FiHome,
  FiInfo,
  FiKey,
  FiMail,
  FiMapPin,
  FiPhone,
  FiPlus,
  FiPower,
  FiSearch,
  FiSettings,
  FiShield,
  FiSlash,
  FiUploadCloud,
  FiUser,
  FiUserCheck,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext.jsx";
import { ROLE_LABEL, apiFetch } from "../lib/api.js";

const ROLE_DESC = {
  superadmin: "Superadmin memiliki akses penuh seluruh sistem, pengaturan fitur, manajemen semua peran, dan cadangan data DR.",
  admin: "Admin mengelola akun pegawai (kecuali Superadmin dan Admin lain), verifikasi kurir, serta operasional sistem.",
  supervisor: "Supervisor memiliki akses pengelolaan operasional gerai, pemantauan pengiriman, serta laporan di area gerainya.",
  operator: "Operator menangani pembuatan pesanan pengiriman baru, pencetakan resi, dan pembaruan checkpoint di loket gerai.",
  kurir: "Kurir bertugas melakukan penjemputan, pengantaran paket, serta pembaruan checkpoint dan foto bukti di lapangan.",
};

function formatDateIndo(value) {
  if (!value) return "-";
  const raw = String(value).slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) return raw;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function PegawaiPage() {
  const { user, showToast } = useAuth();
  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters & Selection
  const [statusTab, setStatusTab] = useState("all"); // all | pending | active
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [detailTab, setDetailTab] = useState("hr"); // hr | admin | docs
  const [uploadingDoc, setUploadingDoc] = useState("");
  const [previewDoc, setPreviewDoc] = useState(null);
  const [hrModalOpen, setHrModalOpen] = useState(false);
  const [savingHr, setSavingHr] = useState(false);
  const [hrForm, setHrForm] = useState({});
  const [statusConfirmUser, setStatusConfirmUser] = useState(null);
  const [togglingStatus, setTogglingStatus] = useState(false);

  const confirmStatusToggle = async () => {
    if (!statusConfirmUser) return;
    setTogglingStatus(true);
    try {
      await patch(statusConfirmUser.id, { is_active: !statusConfirmUser.is_active });
      setStatusConfirmUser(null);
    } finally {
      setTogglingStatus(false);
    }
  };

  // Add Employee Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddPw, setShowAddPw] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploadingNewDoc, setUploadingNewDoc] = useState("");
  const [newForm, setNewForm] = useState({
    full_name: "",
    nik: "",
    phone: "",
    email: "",
    hub_id: "",
    station: "",
    role: "operator",
    username: "",
    password: "",
    department: "",
    job_title: "",
    employment_status: "PKWTT",
    join_date: "",
    gender: "",
    birth_place: "",
    birth_date: "",
    education_last: "",
    address_domicile: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    npwp: "",
    bpjs_kes: "",
    bpjs_tk: "",
    bank_name: "BRI",
    bank_account: "",
    bank_holder: "",
    doc_ktp_url: "",
    doc_ijazah_url: "",
    doc_skck_url: "",
    doc_contract_url: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [uList, refData] = await Promise.all([
        apiFetch("/api/users"),
        apiFetch("/api/reference").catch(() => ({ hubs: [] })),
      ]);
      setUsers(Array.isArray(uList) ? uList : []);
      setHubs(refData.hubs || []);
      if (user?.role === "superadmin") {
        const sList = await apiFetch("/api/settings");
        setSettings(Array.isArray(sList) ? sList : []);
      }
      setError("");
    } catch (e) {
      setError(e.message || "Gagal memuat data pegawai.");
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    load();
  }, [load]);

  const patch = async (id, body) => {
    try {
      await apiFetch(`/api/users/${id}`, { method: "PATCH", body });
      showToast("Data pegawai berhasil diperbarui", "success");
      load();
    } catch (e) {
      showToast(e.message || "Gagal memperbarui data pegawai", "error");
    }
  };

  const toggleSetting = async (key, enabled) => {
    try {
      await apiFetch(`/api/settings/${key}`, { method: "PATCH", body: { enabled } });
      showToast("Pengaturan fitur diperbarui", "success");
      load();
    } catch (e) {
      showToast(e.message || "Gagal memperbarui pengaturan", "error");
    }
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const created = await apiFetch("/api/users", {
        method: "POST",
        body: {
          role: newForm.role,
          full_name: newForm.full_name.trim(),
          nik: newForm.nik.trim(),
          phone: newForm.phone.trim(),
          email: newForm.email.trim(),
          station: newForm.station.trim(),
          hub_id: newForm.hub_id ? Number(newForm.hub_id) : null,
          username: newForm.username.trim(),
          password: newForm.password,
          is_active: true,
          department: newForm.department?.trim() || null,
          job_title: newForm.job_title?.trim() || null,
          employment_status: newForm.employment_status || "PKWTT",
          join_date: newForm.join_date || null,
          gender: newForm.gender || null,
          birth_place: newForm.birth_place?.trim() || null,
          birth_date: newForm.birth_date || null,
          education_last: newForm.education_last?.trim() || null,
          address_domicile: newForm.address_domicile?.trim() || null,
          emergency_contact_name: newForm.emergency_contact_name?.trim() || null,
          emergency_contact_phone: newForm.emergency_contact_phone?.trim() || null,
          npwp: newForm.npwp?.trim() || null,
          bpjs_kes: newForm.bpjs_kes?.trim() || null,
          bpjs_tk: newForm.bpjs_tk?.trim() || null,
          bank_name: newForm.bank_name?.trim() || null,
          bank_account: newForm.bank_account?.trim() || null,
          bank_holder: newForm.bank_holder?.trim() || null,
          doc_ktp_url: newForm.doc_ktp_url || null,
          doc_ijazah_url: newForm.doc_ijazah_url || null,
          doc_skck_url: newForm.doc_skck_url || null,
          doc_contract_url: newForm.doc_contract_url || null,
        },
      });
      showToast(created?.message || `Pegawai ${newForm.full_name} berhasil ditambahkan`, "success");
      setShowAddModal(false);
      setNewForm({
        full_name: "",
        nik: "",
        phone: "",
        email: "",
        hub_id: "",
        station: "",
        role: "operator",
        username: "",
        password: "",
        department: "",
        job_title: "",
        employment_status: "PKWTT",
        join_date: "",
        gender: "",
        birth_place: "",
        birth_date: "",
        education_last: "",
        address_domicile: "",
        emergency_contact_name: "",
        emergency_contact_phone: "",
        npwp: "",
        bpjs_kes: "",
        bpjs_tk: "",
        bank_name: "",
        bank_account: "",
        doc_ktp_url: "",
        doc_ijazah_url: "",
        doc_skck_url: "",
        doc_contract_url: "",
      });
      load();
    } catch (err) {
      showToast(err.message || "Gagal menambahkan pegawai baru", "error");
    } finally {
      setCreating(false);
    }
  };

  const openHrModal = (emp) => {
    setHrForm({
      id: emp.id,
      full_name: emp.full_name,
      department: emp.department || "",
      job_title: emp.job_title || "",
      employment_status: emp.employment_status || "PKWTT",
      join_date: emp.join_date ? String(emp.join_date).slice(0, 10) : "",
      contract_end_date: emp.contract_end_date ? String(emp.contract_end_date).slice(0, 10) : "",
      gender: emp.gender || "",
      birth_place: emp.birth_place || "",
      birth_date: emp.birth_date ? String(emp.birth_date).slice(0, 10) : "",
      address_domicile: emp.address_domicile || "",
      education_last: emp.education_last || "",
      emergency_contact_name: emp.emergency_contact_name || "",
      emergency_contact_relation: emp.emergency_contact_relation || "",
      emergency_contact_phone: emp.emergency_contact_phone || "",
      npwp: "",
      bpjs_kes: emp.bpjs_kes || "",
      bpjs_tk: emp.bpjs_tk || "",
      bank_name: emp.bank_name || "",
      bank_account: "",
      bank_holder: emp.bank_holder || "",
    });
    setHrModalOpen(true);
  };

  const saveHrProfile = async (e) => {
    e.preventDefault();
    if (!hrForm.id) return;
    setSavingHr(true);
    try {
      const payload = {
        department: hrForm.department || null,
        job_title: hrForm.job_title || null,
        employment_status: hrForm.employment_status || "PKWTT",
        join_date: hrForm.join_date || null,
        contract_end_date: hrForm.contract_end_date || null,
        gender: hrForm.gender || null,
        birth_place: hrForm.birth_place || null,
        birth_date: hrForm.birth_date || null,
        address_domicile: hrForm.address_domicile || null,
        education_last: hrForm.education_last || null,
        emergency_contact_name: hrForm.emergency_contact_name || null,
        emergency_contact_relation: hrForm.emergency_contact_relation || null,
        emergency_contact_phone: hrForm.emergency_contact_phone || null,
        bpjs_kes: hrForm.bpjs_kes || null,
        bpjs_tk: hrForm.bpjs_tk || null,
        bank_name: hrForm.bank_name || null,
        bank_holder: hrForm.bank_holder || null,
      };
      if (hrForm.npwp?.trim()) payload.npwp = hrForm.npwp.trim();
      if (hrForm.bank_account?.trim()) payload.bank_account = hrForm.bank_account.trim();
      await apiFetch(`/api/users/${hrForm.id}`, { method: "PATCH", body: payload });
      showToast("Data kepegawaian berhasil diperbarui", "success");
      setHrModalOpen(false);
      load();
    } catch (err) {
      showToast(err.message || "Gagal memperbarui data kepegawaian", "error");
    } finally {
      setSavingHr(false);
    }
  };

  const handleNewDocUpload = async (docType, file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast("Ukuran foto dokumen maksimal 5 MB", "error");
      return;
    }
    setUploadingNewDoc(docType);
    try {
      const fd = new FormData();
      fd.append("doc_type", docType);
      fd.append("file", file);
      const res = await apiFetch("/api/users/upload-doc", {
        method: "POST",
        body: fd,
        isFormData: true,
      });
      setNewForm((prev) => ({ ...prev, [`doc_${docType}_url`]: res.url }));
      showToast(`Dokumen ${docType.toUpperCase()} terunggah`, "success");
    } catch (err) {
      showToast(err.message || "Gagal mengunggah dokumen", "error");
    } finally {
      setUploadingNewDoc("");
    }
  };

  const handleEmployeeDocUpload = async (empId, docType, file) => {
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
      await apiFetch(`/api/users/${empId}/docs`, {
        method: "POST",
        body: fd,
        isFormData: true,
      });
      showToast(`Dokumen ${docType.toUpperCase()} berhasil diunggah`, "success");
      load();
    } catch (err) {
      showToast(err.message || "Gagal mengunggah dokumen pegawai", "error");
    } finally {
      setUploadingDoc("");
    }
  };

  // Internal staff only (kurir is managed separately in Manajemen Kurir)
  const staffUsers = useMemo(() => users.filter((u) => u.role !== "kurir"), [users]);

  // Counts
  const stats = useMemo(() => {
    const total = staffUsers.length;
    const pending = staffUsers.filter((u) => !u.is_active).length;
    const active = staffUsers.filter((u) => u.is_active).length;
    return { total, pending, active };
  }, [staffUsers]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staffUsers.filter((u) => {
      const matchTab =
        statusTab === "all" ||
        (statusTab === "pending" && !u.is_active) ||
        (statusTab === "active" && u.is_active);
      const matchRole = !roleFilter || u.role === roleFilter;
      const matchQuery =
        !q ||
        (u.full_name || "").toLowerCase().includes(q) ||
        (u.employee_code || "").toLowerCase().includes(q) ||
        (u.nik_masked || "").toLowerCase().includes(q) ||
        (u.station || "").toLowerCase().includes(q);
      return matchTab && matchRole && matchQuery;
    });
  }, [staffUsers, statusTab, roleFilter, search]);

  const selectedUser = useMemo(() => {
    if (!filteredUsers.length) return null;
    return filteredUsers.find((u) => u.id === selectedId) || filteredUsers[0];
  }, [filteredUsers, selectedId]);

  const editableRoles =
    user?.role === "superadmin"
      ? ["admin", "supervisor", "operator"]
      : ["supervisor", "operator"];

  const isLocked = (target) =>
    !target ||
    target.id === user?.id ||
    (user?.role === "admin" && ["admin", "superadmin"].includes(target.role));

  return (
    <div className="space-y-5 pb-8">
      {/* BREADCRUMB & TITLE */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          <Link to="/" className="hover:text-blue-600 no-underline text-slate-500">
            <FiHome className="h-3.5 w-3.5" />
          </Link>
          <FiChevronRight className="h-3.5 w-3.5 text-slate-400" />
          <span>Administrasi</span>
          <FiChevronRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="font-bold text-slate-800">Manajemen Pegawai</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 shadow-xs">
              <FiUsers className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
                Manajemen Pegawai
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Kelola akun, persetujuan, jabatan, dan akses pegawai.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/pengajuan-kurir"
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 text-xs sm:text-sm font-bold text-slate-700 shadow-xs no-underline"
            >
              <FiUserCheck className="h-4 w-4 text-blue-600" />
              <span>Kelola Kurir</span>
            </Link>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 text-xs sm:text-sm font-extrabold text-white shadow-sm shadow-blue-600/20 cursor-pointer"
            >
              <FiPlus className="h-4 w-4" />
              <span>Tambah Pegawai</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">
          {error}
        </div>
      )}

      {/* 4 KPI STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          {
            label: "Total Pegawai",
            value: stats.total,
            sub: "Terdaftar di sistem",
            icon: FiUsers,
            cls: "bg-white border-slate-200/90",
            iconCls: "bg-blue-50 text-blue-600",
          },
          {
            label: "Menunggu Persetujuan",
            value: stats.pending,
            sub: "Perlu verifikasi admin",
            icon: FiClock,
            cls: "bg-amber-50/40 border-amber-200/80",
            iconCls: "bg-amber-100 text-amber-600",
          },
          {
            label: "Pegawai Aktif",
            value: stats.active,
            sub: "Dapat mengakses sistem",
            icon: FiCheckCircle,
            cls: "bg-emerald-50/40 border-emerald-200/80",
            iconCls: "bg-emerald-100 text-emerald-600",
          },
          {
            label: "Nonaktif / Tertahan",
            value: stats.pending,
            sub: "Belum diaktifkan",
            icon: FiSlash,
            cls: "bg-rose-50/40 border-rose-200/80",
            iconCls: "bg-rose-100 text-rose-600",
          },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className={`rounded-2xl border p-4 shadow-xs flex items-center gap-3.5 ${kpi.cls}`}
            >
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${kpi.iconCls}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-2xl font-extrabold text-slate-900 leading-none">
                  {kpi.value}
                </div>
                <div className="text-xs font-bold text-slate-700 mt-1 truncate">{kpi.label}</div>
                <div className="text-[11px] text-slate-500 truncate">{kpi.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* STATUS TABS */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: "all", label: `Semua (${stats.total})`, icon: FiUsers },
          { id: "active", label: `Aktif (${stats.active})`, icon: FiCheckCircle },
          { id: "pending", label: `Nonaktif (${stats.pending})`, icon: FiSlash },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = statusTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusTab(tab.id)}
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

      {/* MASTER-DETAIL GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* LEFT TABLE */}
        <div className="xl:col-span-8 rounded-3xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, kode, atau NIK..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-3 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Jabatan: Semua Staf Internal</option>
              {Object.entries(ROLE_LABEL)
                .filter(([val]) => val !== "kurir")
                .map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Pegawai</th>
                  <th className="py-3 px-3">Gerai</th>
                  <th className="py-3 px-3">Jabatan</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-500">
                      Memuat daftar pegawai...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-500">
                      Tidak ada data pegawai yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const locked = isLocked(u);
                    const isSelected = selectedUser?.id === u.id;
                    return (
                      <tr
                        key={u.id}
                        onClick={() => setSelectedId(u.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-blue-50/75"
                            : !u.is_active
                            ? "bg-amber-50/35 hover:bg-amber-50/60"
                            : "hover:bg-slate-50/80"
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{u.full_name}</div>
                          <div className="font-mono text-[11px] font-bold text-blue-600 mt-0.5">
                            {u.employee_code}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-700">{u.station || "-"}</td>
                        <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                          {locked ? (
                            <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                              {ROLE_LABEL[u.role] || u.role}
                            </span>
                          ) : (
                            <select
                              value={u.role}
                              onChange={(e) => patch(u.id, { role: e.target.value })}
                              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
                            >
                              {editableRoles.map((r) => (
                                <option key={r} value={r}>
                                  {ROLE_LABEL[r]}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                              u.is_active
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                : "bg-amber-50 border-amber-200 text-amber-700"
                            }`}
                          >
                            {u.is_active ? "Aktif" : "Menunggu"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          {!locked && (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openHrModal(u)}
                                title="Edit data pegawai"
                                className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 text-[11px] font-extrabold text-blue-700 hover:bg-blue-100 cursor-pointer"
                              >
                                <FiEdit2 className="h-3 w-3" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setStatusConfirmUser(u)}
                                className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-extrabold transition-colors cursor-pointer ${
                                  u.is_active
                                    ? "border border-slate-200 bg-white text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
                                    : "bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
                                }`}
                              >
                                <FiPower className="h-3 w-3" />
                                <span>{u.is_active ? "Nonaktifkan" : "Aktifkan"}</span>
                              </button>
                            </div>
                          )}
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
        <div className="xl:col-span-4 rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-extrabold text-slate-900">Detail Pegawai</h2>
            <span className="text-[11px] font-bold text-slate-400">
              {selectedUser?.employee_code || "-"}
            </span>
          </div>

          {selectedUser ? (
            <div className="space-y-4">
              {/* Profile Header */}
              <div className="flex items-center gap-3.5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-base font-extrabold text-white shadow-sm">
                  {(selectedUser.full_name || "P").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-base font-extrabold text-slate-900 truncate">
                    {selectedUser.full_name}
                  </div>
                  <span
                    className={`mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      selectedUser.is_active
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {selectedUser.is_active ? "Akun Aktif" : "Menunggu Persetujuan"}
                  </span>
                </div>
              </div>

              {/* 3 Detail Tabs */}
              <div className="grid grid-cols-3 border-b border-slate-200">
                {[
                  { id: "hr", label: "Kepegawaian", icon: FiFileText },
                  { id: "admin", label: "UU PDP dan Bank", icon: FiCreditCard },
                  { id: "docs", label: "Dokumen Legal", icon: FiUploadCloud },
                ].map((t) => {
                  const Icon = t.icon;
                  const active = detailTab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setDetailTab(t.id)}
                      className={`inline-flex items-center justify-center gap-1.5 px-2 py-2.5 text-[11px] font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                        active
                          ? "border-blue-600 text-blue-700"
                          : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {detailTab === "hr" && (
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3.5 space-y-2 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Kode Pegawai</span>
                    <span className="font-mono font-bold text-slate-900">{selectedUser.employee_code}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Divisi</span>
                    <span className="font-bold text-slate-900 text-right">
                      {selectedUser.department || "Operasional"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Jabatan</span>
                    <span className="font-bold text-slate-900 text-right">
                      {selectedUser.job_title || ROLE_LABEL[selectedUser.role]}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Status Karyawan</span>
                    <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10.5px] font-extrabold text-blue-700">
                      {selectedUser.employment_status || "PKWTT"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Gerai / Hub</span>
                    <span className="font-bold text-slate-900">{selectedUser.station || "-"}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Tgl Bergabung</span>
                    <span className="font-semibold text-slate-800">
                      {formatDateIndo(selectedUser.join_date)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Tempat / Tgl Lahir</span>
                    <span className="font-semibold text-slate-800 text-right">
                      {selectedUser.birth_place || "-"}
                      {selectedUser.birth_date ? `, ${formatDateIndo(selectedUser.birth_date)}` : ""}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Pendidikan</span>
                    <span className="font-semibold text-slate-800">{selectedUser.education_last || "-"}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500 shrink-0">Email</span>
                    <span className="font-semibold text-slate-800 text-right break-all">
                      {selectedUser.email || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500 shrink-0">No. HP</span>
                    <span className="font-mono font-semibold text-slate-800 text-right">
                      {selectedUser.phone || "-"}
                    </span>
                  </div>
                  <div className="pt-1.5 border-t border-slate-200/70 flex justify-between gap-2">
                    <span className="text-slate-500">Kontak Darurat</span>
                    <span className="font-semibold text-slate-800 text-right">
                      {selectedUser.emergency_contact_name
                        ? `${selectedUser.emergency_contact_name} (${selectedUser.emergency_contact_relation || "Keluarga"}) · ${selectedUser.emergency_contact_phone || "-"}`
                        : "-"}
                    </span>
                  </div>
                </div>
              )}

              {detailTab === "admin" && (
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3.5 space-y-2.5 text-xs">
                  <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    <FiShield className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span>Dilindungi UU PDP (Akses Admin dan Superadmin)</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">NIK (Dukcapil)</span>
                    <span className="font-mono font-bold text-slate-900">{selectedUser.nik_masked || "-"}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">NPWP</span>
                    <span className="font-mono font-bold text-slate-900">{selectedUser.npwp_masked || "-"}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">BPJS Kesehatan</span>
                    <span className="font-mono font-semibold text-slate-800">{selectedUser.bpjs_kes || "-"}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">BPJS Ketenagakerjaan</span>
                    <span className="font-mono font-semibold text-slate-800">{selectedUser.bpjs_tk || "-"}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200/70 space-y-2">
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Bank Payroll</span>
                      <span className="font-bold text-slate-900">{selectedUser.bank_name || "-"}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Nomor Rekening</span>
                      <span className="font-mono font-bold text-slate-900">
                        {selectedUser.bank_account_masked || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Pemilik Rekening</span>
                      <span className="font-semibold text-slate-800">{selectedUser.bank_holder || "-"}</span>
                    </div>
                  </div>
                </div>
              )}

              {detailTab === "docs" && (
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  {[
                    { key: "ktp", label: "Foto e-KTP", url: selectedUser.doc_ktp_url },
                    { key: "ijazah", label: "Scan Ijazah", url: selectedUser.doc_ijazah_url },
                    { key: "skck", label: "Scan SKCK", url: selectedUser.doc_skck_url },
                    { key: "contract", label: "Kontrak Kerja", url: selectedUser.doc_contract_url },
                  ].map((doc) => (
                    <div
                      key={doc.key}
                      className="rounded-2xl border border-slate-200 bg-slate-50/70 p-2.5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-extrabold text-slate-800 truncate">{doc.label}</span>
                        {!isLocked(selectedUser) && (
                          <label className="text-[10.5px] font-bold text-blue-600 hover:underline cursor-pointer shrink-0">
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              className="hidden"
                              onChange={(e) =>
                                handleEmployeeDocUpload(selectedUser.id, doc.key, e.target.files?.[0])
                              }
                            />
                            {uploadingDoc === doc.key ? "..." : doc.url ? "Ganti" : "Unggah"}
                          </label>
                        )}
                      </div>
                      {doc.url ? (
                        <button
                          type="button"
                          onClick={() => setPreviewDoc({ name: doc.label, url: doc.url })}
                          className="block w-full overflow-hidden rounded-xl border border-slate-200 bg-white cursor-pointer"
                        >
                          <img src={doc.url} alt={doc.label} className="aspect-[3/2] w-full object-cover" />
                        </button>
                      ) : (
                        <div className="flex aspect-[3/2] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-[10.5px] text-slate-400">
                          Belum diunggah
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Aksi Cepat */}
              {!isLocked(selectedUser) && (
                <div className="space-y-2">
                  <div className="text-xs font-extrabold text-slate-800">Aksi Cepat</div>
                  <button
                    type="button"
                    onClick={() => openHrModal(selectedUser)}
                    className="flex w-full min-h-[40px] items-center justify-between rounded-xl border border-blue-200 bg-blue-50/70 px-3.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <FiEdit2 className="h-3.5 w-3.5" />
                      <span>Lengkapi atau Edit Data Pegawai</span>
                    </span>
                    <FiChevronRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusConfirmUser(selectedUser)}
                    className={`flex w-full min-h-[40px] items-center justify-between rounded-xl border px-3.5 text-xs font-bold transition-colors cursor-pointer ${
                      selectedUser.is_active
                        ? "border-rose-200 bg-rose-50/70 text-rose-700 hover:bg-rose-100"
                        : "border-emerald-200 bg-emerald-50/70 text-emerald-700 hover:bg-emerald-100"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <FiPower className="h-3.5 w-3.5" />
                      <span>{selectedUser.is_active ? "Nonaktifkan Akun" : "Setujui dan Aktifkan Akun"}</span>
                    </span>
                    <FiChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Informasi Hak Akses */}
              <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-blue-900">
                  <FiInfo className="h-3.5 w-3.5 text-blue-600" />
                  <span>Informasi Hak Akses</span>
                </div>
                <p className="text-[11.5px] text-slate-700 leading-relaxed">
                  {ROLE_DESC[selectedUser.role] || "Akses operasional sesuai peran yang ditetapkan."}
                </p>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center text-xs text-slate-500">
              Pilih pegawai pada tabel untuk melihat detail.
            </div>
          )}
        </div>
      </div>

      {/* PENGATURAN FITUR (KHUSUS SUPERADMIN) & KETENTUAN HAK AKSES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {user?.role === "superadmin" && (
          <div className="lg:col-span-7 rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <FiSettings className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-extrabold text-slate-900">Pengaturan Fitur</h2>
                    <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10.5px] font-extrabold text-amber-700">
                      Khusus Superadmin
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Kelola akses fitur sistem untuk seluruh peran pegawai.
                  </p>
                </div>
              </div>
            </div>

            {settings.length > 0 && (
              <div className="space-y-2.5">
                {settings.map((s) => (
                  <label
                    key={s.key}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3.5 cursor-pointer hover:bg-slate-50"
                  >
                    <div>
                      <div className="text-xs sm:text-sm font-extrabold text-slate-900">{s.label}</div>
                      <div className="text-[11.5px] text-slate-500 mt-0.5">{s.description}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={s.enabled}
                      onChange={(e) => toggleSetting(s.key, e.target.checked)}
                      className="h-5 w-5 rounded border-slate-300 text-blue-600 cursor-pointer shrink-0"
                    />
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Ketentuan Hak Akses */}
        <div
          className={`${
            user?.role === "superadmin" ? "lg:col-span-5" : "lg:col-span-12"
          } rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50/70 to-indigo-50/50 p-5 sm:p-6 shadow-sm space-y-3`}
        >
          <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <FiShield className="h-4 w-4 text-blue-600" />
            <span>Ketentuan Hak Akses</span>
          </div>
          <div className="space-y-2.5 text-xs text-slate-700 leading-relaxed">
            <div className="flex items-start gap-2">
              <FiCheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Superadmin:</strong> mengelola semua peran, mengatur fitur sistem, cadangan data, dan memiliki akses penuh.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <FiCheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Admin:</strong> mengelola pegawai (kecuali akun Superadmin dan Admin), verifikasi kurir, serta operasional sistem.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <FiInfo className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                <strong>Supervisor / Operator / Kurir:</strong> akses sesuai peran dan area operasional gerai yang ditetapkan.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL TAMBAH PEGAWAI */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleCreateEmployee}
            autoComplete="off"
            className="w-full max-w-[680px] max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Tambah Pegawai Baru</h3>
                <p className="text-xs text-slate-500">Lengkapi identitas, kepegawaian, kontak darurat, administrasi, dan dokumen pegawai.</p>
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
                  value={newForm.full_name}
                  onChange={(e) => setNewForm({ ...newForm, full_name: e.target.value })}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 font-medium"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">NIK (16 Digit) *</label>
                <input
                  required
                  maxLength={16}
                  pattern="\d{16}"
                  value={newForm.nik}
                  onChange={(e) => setNewForm({ ...newForm, nik: e.target.value.replace(/\D/g, "") })}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">No. HP *</label>
                <input
                  required
                  value={newForm.phone}
                  onChange={(e) => setNewForm({ ...newForm, phone: e.target.value })}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Email *</label>
                <input
                  required
                  type="email"
                  value={newForm.email}
                  onChange={(e) => setNewForm({ ...newForm, email: e.target.value })}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Gerai Penempatan *</label>
                <select
                  required
                  value={newForm.hub_id}
                  onChange={(e) => {
                    const selected = hubs.find((h) => String(h.id) === e.target.value);
                    setNewForm({
                      ...newForm,
                      hub_id: e.target.value,
                      station: selected ? selected.name : "",
                    });
                  }}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3"
                >
                  <option value="">-- Pilih Gerai --</option>
                  {hubs.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.city_name})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Peran Sistem (Hak Akses) *</label>
                <select
                  value={newForm.role}
                  onChange={(e) => setNewForm({ ...newForm, role: e.target.value })}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3"
                >
                  {editableRoles.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Username *</label>
                <input
                  required
                  name="emp_username_new"
                  autoComplete="off"
                  value={newForm.username}
                  onChange={(e) => setNewForm({ ...newForm, username: e.target.value })}
                  placeholder="Username login pegawai"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Password *</label>
                <div className="relative">
                  <input
                    required
                    name="emp_password_new"
                    autoComplete="new-password"
                    type={showAddPw ? "text" : "password"}
                    minLength={6}
                    value={newForm.password}
                    onChange={(e) => setNewForm({ ...newForm, password: e.target.value })}
                    placeholder="Minimal 6 karakter"
                    className="h-10 w-full rounded-xl border border-slate-200 pl-3 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddPw((v) => !v)}
                    aria-label={showAddPw ? "Sembunyikan password" : "Lihat password"}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showAddPw ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Divisi</label>
                <input
                  value={newForm.department}
                  onChange={(e) => setNewForm({ ...newForm, department: e.target.value })}
                  placeholder="Contoh: Operasional Gudang"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Jabatan</label>
                <input
                  value={newForm.job_title}
                  onChange={(e) => setNewForm({ ...newForm, job_title: e.target.value })}
                  placeholder="Contoh: Staff Sortir"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Status Karyawan</label>
                <select
                  value={newForm.employment_status}
                  onChange={(e) => setNewForm({ ...newForm, employment_status: e.target.value })}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3"
                >
                  <option value="PKWTT">PKWTT (Tetap)</option>
                  <option value="PKWT">PKWT (Kontrak)</option>
                  <option value="MAGANG">Magang</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tanggal Bergabung</label>
                <input
                  type="date"
                  value={newForm.join_date}
                  onChange={(e) => setNewForm({ ...newForm, join_date: e.target.value })}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tempat / Tgl Lahir</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={newForm.birth_place}
                    onChange={(e) => setNewForm({ ...newForm, birth_place: e.target.value })}
                    placeholder="Kota lahir"
                    className="h-10 w-full rounded-xl border border-slate-200 px-2.5"
                  />
                  <input
                    type="date"
                    value={newForm.birth_date}
                    onChange={(e) => setNewForm({ ...newForm, birth_date: e.target.value })}
                    className="h-10 w-full rounded-xl border border-slate-200 px-2"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Pendidikan Terakhir</label>
                <input
                  value={newForm.education_last}
                  onChange={(e) => setNewForm({ ...newForm, education_last: e.target.value })}
                  placeholder="Contoh: S1 Manajemen"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Alamat Domisili</label>
                <input
                  value={newForm.address_domicile}
                  onChange={(e) => setNewForm({ ...newForm, address_domicile: e.target.value })}
                  placeholder="Alamat tempat tinggal saat ini"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Kontak Darurat (Nama dan HP)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={newForm.emergency_contact_name}
                    onChange={(e) => setNewForm({ ...newForm, emergency_contact_name: e.target.value })}
                    placeholder="Nama keluarga"
                    className="h-10 w-full rounded-xl border border-slate-200 px-2.5"
                  />
                  <input
                    value={newForm.emergency_contact_phone}
                    onChange={(e) => setNewForm({ ...newForm, emergency_contact_phone: e.target.value })}
                    placeholder="08xxxxxxxx"
                    className="h-10 w-full rounded-xl border border-slate-200 px-2.5"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">NPWP (Opsional)</label>
                <input
                  value={newForm.npwp}
                  onChange={(e) => setNewForm({ ...newForm, npwp: e.target.value })}
                  placeholder="Nomor NPWP"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Bank Payroll</label>
                <select
                  value={newForm.bank_name}
                  onChange={(e) => setNewForm({ ...newForm, bank_name: e.target.value })}
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
                  value={newForm.bank_account}
                  onChange={(e) => setNewForm({ ...newForm, bank_account: e.target.value.replace(/\D/g, "") })}
                  placeholder="Nomor rekening sesuai buku tabungan"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Pemilik Rekening</label>
                <input
                  value={newForm.bank_holder}
                  onChange={(e) => setNewForm({ ...newForm, bank_holder: e.target.value })}
                  placeholder="Sesuai buku tabungan"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3"
                />
              </div>
            </div>

            <div className="pt-1 border-t border-slate-100 space-y-2">
              <div className="text-xs font-extrabold text-slate-700">Unggah Dokumen Legal Pegawai (Opsional)</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                {[
                  { key: "ktp", label: "Foto e-KTP" },
                  { key: "ijazah", label: "Scan Ijazah" },
                  { key: "skck", label: "Scan SKCK" },
                  { key: "contract", label: "Kontrak Kerja" },
                ].map((d) => {
                  const url = newForm[`doc_${d.key}_url`];
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
                        onChange={(e) => handleNewDocUpload(d.key, e.target.files?.[0])}
                      />
                      <FiUploadCloud className="h-4 w-4 mb-1" />
                      <span className="font-bold">
                        {uploadingNewDoc === d.key ? "..." : url ? `${d.label} ✓` : d.label}
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
                {creating ? "Menyimpan..." : "Simpan Pegawai"}
              </button>
            </div>
          </form>
        </div>
      )}
      {hrModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={saveHrProfile}
            className="w-full max-w-[640px] max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Data Pegawai: {hrForm.full_name}
                </h3>
                <p className="text-xs text-slate-500">
                  Lengkapi data kepegawaian, kontak darurat, dan administrasi sesuai UU PDP.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHrModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 cursor-pointer"
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Divisi</label>
                <input
                  value={hrForm.department || ""}
                  onChange={(e) => setHrForm({ ...hrForm, department: e.target.value })}
                  placeholder="Contoh: Operasional Gudang"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Jabatan</label>
                <input
                  value={hrForm.job_title || ""}
                  onChange={(e) => setHrForm({ ...hrForm, job_title: e.target.value })}
                  placeholder="Contoh: Kepala Shift Sortir"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Status Karyawan</label>
                <select
                  value={hrForm.employment_status || "PKWTT"}
                  onChange={(e) => setHrForm({ ...hrForm, employment_status: e.target.value })}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3"
                >
                  <option value="PKWTT">PKWTT (Karyawan Tetap)</option>
                  <option value="PKWT">PKWT (Kontrak)</option>
                  <option value="MAGANG">Internship / Magang</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tanggal Bergabung</label>
                <input
                  type="date"
                  value={hrForm.join_date || ""}
                  onChange={(e) => setHrForm({ ...hrForm, join_date: e.target.value })}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tempat Lahir</label>
                <input
                  value={hrForm.birth_place || ""}
                  onChange={(e) => setHrForm({ ...hrForm, birth_place: e.target.value })}
                  placeholder="Contoh: Surabaya"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tanggal Lahir</label>
                <input
                  type="date"
                  value={hrForm.birth_date || ""}
                  onChange={(e) => setHrForm({ ...hrForm, birth_date: e.target.value })}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Pendidikan Terakhir</label>
                <input
                  value={hrForm.education_last || ""}
                  onChange={(e) => setHrForm({ ...hrForm, education_last: e.target.value })}
                  placeholder="Contoh: S1 Manajemen Logistik"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Jenis Kelamin</label>
                <select
                  value={hrForm.gender || ""}
                  onChange={(e) => setHrForm({ ...hrForm, gender: e.target.value })}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3"
                >
                  <option value="">-- Pilih --</option>
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Alamat Domisili</label>
                <input
                  value={hrForm.address_domicile || ""}
                  onChange={(e) => setHrForm({ ...hrForm, address_domicile: e.target.value })}
                  placeholder="Alamat domisili saat ini"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Kontak Darurat</label>
                <input
                  value={hrForm.emergency_contact_name || ""}
                  onChange={(e) => setHrForm({ ...hrForm, emergency_contact_name: e.target.value })}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">No. HP Kontak Darurat</label>
                <input
                  value={hrForm.emergency_contact_phone || ""}
                  onChange={(e) => setHrForm({ ...hrForm, emergency_contact_phone: e.target.value })}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">NPWP (Opsional)</label>
                <input
                  value={hrForm.npwp || ""}
                  onChange={(e) => setHrForm({ ...hrForm, npwp: e.target.value })}
                  placeholder="Kosongkan jika tidak diubah"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">BPJS Kesehatan / Ketenagakerjaan</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={hrForm.bpjs_kes || ""}
                    onChange={(e) => setHrForm({ ...hrForm, bpjs_kes: e.target.value })}
                    placeholder="BPJS Kes"
                    className="h-10 w-full rounded-xl border border-slate-200 px-2.5 font-mono"
                  />
                  <input
                    value={hrForm.bpjs_tk || ""}
                    onChange={(e) => setHrForm({ ...hrForm, bpjs_tk: e.target.value })}
                    placeholder="BPJS TK"
                    className="h-10 w-full rounded-xl border border-slate-200 px-2.5 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Bank Payroll</label>
                <select
                  value={hrForm.bank_name || "BRI"}
                  onChange={(e) => setHrForm({ ...hrForm, bank_name: e.target.value })}
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
                <label className="block font-bold text-slate-700 mb-1">Nomor Rekening Payroll (Baru)</label>
                <input
                  value={hrForm.bank_account || ""}
                  onChange={(e) => setHrForm({ ...hrForm, bank_account: e.target.value.replace(/\D/g, "") })}
                  placeholder="Kosongkan jika tidak diubah"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Nama Pemilik Rekening</label>
                <input
                  value={hrForm.bank_holder || ""}
                  onChange={(e) => setHrForm({ ...hrForm, bank_holder: e.target.value })}
                  placeholder="Sesuai buku tabungan"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3"
                />
              </div>
            </div>

            {selectedUser && (
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="text-xs font-extrabold text-slate-700">
                  Dokumen Legal Pegawai (Unggah / Ganti)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  {[
                    { key: "ktp", label: "Foto e-KTP", url: selectedUser.doc_ktp_url },
                    { key: "ijazah", label: "Scan Ijazah", url: selectedUser.doc_ijazah_url },
                    { key: "skck", label: "Scan SKCK", url: selectedUser.doc_skck_url },
                    { key: "contract", label: "Kontrak Kerja", url: selectedUser.doc_contract_url },
                  ].map((d) => (
                    <div
                      key={`edit-doc-${d.key}`}
                      className={`flex flex-col items-center justify-between gap-1.5 rounded-xl border p-2 text-center ${
                        d.url ? "border-emerald-300 bg-emerald-50/40" : "border-dashed border-slate-300 bg-slate-50/50"
                      }`}
                    >
                      <span className="font-bold text-slate-800">{d.label}</span>
                      <div className="flex items-center gap-2">
                        <label className="font-bold text-blue-600 hover:underline cursor-pointer">
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={(e) =>
                              handleEmployeeDocUpload(selectedUser.id, d.key, e.target.files?.[0])
                            }
                          />
                          {uploadingDoc === d.key ? "..." : d.url ? "Ganti" : "Unggah"}
                        </label>
                        {d.url && (
                          <button
                            type="button"
                            onClick={() => setPreviewDoc({ name: d.label, url: d.url })}
                            className="font-bold text-emerald-700 hover:underline cursor-pointer"
                          >
                            Lihat
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setHrModalOpen(false)}
                className="min-h-[40px] rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-700 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={savingHr}
                className="min-h-[40px] rounded-xl bg-blue-600 hover:bg-blue-700 px-5 text-xs font-extrabold text-white cursor-pointer"
              >
                {savingHr ? "Menyimpan..." : "Simpan Data Pegawai"}
              </button>
            </div>
          </form>
        </div>
      )}

      {statusConfirmUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-[420px] rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                  statusConfirmUser.is_active
                    ? "bg-rose-50 text-rose-600"
                    : "bg-emerald-50 text-emerald-600"
                }`}
              >
                <FiPower className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {statusConfirmUser.is_active
                    ? "Nonaktifkan Akun Pegawai?"
                    : "Aktifkan Akun Pegawai?"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  <strong className="text-slate-800">{statusConfirmUser.full_name}</strong> (
                  <span className="font-mono">{statusConfirmUser.employee_code}</span>){" "}
                  {statusConfirmUser.is_active
                    ? "akan dicabut akses loginnya sementara."
                    : "akan diaktifkan kembali agar dapat mengakses sistem."}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setStatusConfirmUser(null)}
                className="min-h-[40px] rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={togglingStatus}
                onClick={confirmStatusToggle}
                className={`min-h-[40px] rounded-xl px-4 text-xs font-extrabold text-white shadow-xs cursor-pointer disabled:opacity-60 ${
                  statusConfirmUser.is_active
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {togglingStatus
                  ? "Memproses..."
                  : statusConfirmUser.is_active
                  ? "Ya, Nonaktifkan"
                  : "Ya, Aktifkan"}
              </button>
            </div>
          </div>
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
