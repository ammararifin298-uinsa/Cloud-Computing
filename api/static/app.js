/* ==========================================================
   Dashboard Logistik dan Rantai Pasok - Kelompok 6
   Modul bersama: layout adaptif (HP, iPad, Laptop), API, format
   ========================================================== */

const ICONS = {
  dashboard: '<svg class="ui-ico" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>',
  checkpoint: '<svg class="ui-ico" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>',
  package: '<svg class="ui-ico" viewBox="0 0 24 24"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>',
  track: '<svg class="ui-ico" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
  users: '<svg class="ui-ico" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  shield: '<svg class="ui-ico" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/></svg>',
  login: '<svg class="ui-ico" viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg>',
  logout: '<svg class="ui-ico" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>',
  eye: '<svg class="ui-ico" viewBox="0 0 24 24"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeOff: '<svg class="ui-ico" viewBox="0 0 24 24"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>',
};

const ROLE_LABELS = {
  guest: "Tamu",
  kurir: "Kurir",
  operator: "Operator Gudang",
  supervisor: "Supervisor",
  admin: "Admin",
  superadmin: "Superadmin",
};

const ROLE_COLORS = {
  superadmin: "#7c3aed",
  admin: "#2563eb",
  supervisor: "#0d9488",
  operator: "#d97706",
  kurir: "#16a34a",
};

function defaultAvatarDataUri(user) {
  const name = user?.full_name || user?.username || "Pegawai";
  const parts = String(name).trim().split(/\s+/);
  const initials = ((parts[0]?.[0] || "") + (parts[1]?.[0] || parts[0]?.[1] || "")).toUpperCase();
  const bg = ROLE_COLORS[user?.role] || "#2563eb";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="48" fill="${bg}"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="34" font-weight="800">${initials}</text></svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

function userAvatarUrl(user) {
  return user?.avatar_url || defaultAvatarDataUri(user);
}

const NAV = [
  { href: "/", label: "Ringkasan", icon: "dashboard", roles: ["kurir", "operator", "supervisor", "admin", "superadmin"] },
  { href: "/checkpoint", label: "Catat Checkpoint", icon: "checkpoint", roles: ["kurir", "operator", "admin", "superadmin"] },
  { href: "/pengiriman", label: "Daftar Pengiriman", icon: "package", roles: ["kurir", "operator", "supervisor", "admin", "superadmin"] },
  { href: "/lacak", label: "Lacak Pengiriman", icon: "track", roles: ["kurir", "operator", "supervisor", "admin", "superadmin"] },
  { href: "/pegawai", label: "Manajemen Pegawai", icon: "users", roles: ["admin", "superadmin"] },
  { href: "/backup", label: "Backup dan Sistem", icon: "shield", roles: ["superadmin"] },
  { href: "/profil", label: "Profil dan Akun", icon: "users", roles: ["kurir", "operator", "supervisor", "admin", "superadmin"] },
];

function requireEmployeeAuth() {
  const auth = getAuth();
  if (!auth) {
    location.replace("/login");
    return null;
  }
  return auth;
}

function getAuth() {
  try {
    const token = localStorage.getItem("logistik_token");
    const user = JSON.parse(localStorage.getItem("logistik_user") || "null");
    return token && user ? { token, user } : null;
  } catch {
    return null;
  }
}

function setAuth(token, user) {
  localStorage.setItem("logistik_token", token);
  localStorage.setItem("logistik_user", JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem("logistik_token");
  localStorage.removeItem("logistik_user");
}

const STATUS = {
  DITERIMA:         { label: "Diterima",         color: "#2563eb", desc: "Barang diterima di gudang asal" },
  DISIMPAN:         { label: "Disimpan",         color: "#d97706", desc: "Masuk rak penyimpanan atau staging" },
  DALAM_PERJALANAN: { label: "Dalam Perjalanan", color: "#0d9488", desc: "Armada bergerak antar kota atau hub" },
  DIKIRIM:          { label: "Dikirim",          color: "#ea580c", desc: "Kurir last-mile menuju penerima" },
  SELESAI:          { label: "Selesai",          color: "#16a34a", desc: "Paket diterima di tujuan akhir" },
};
const STATUS_ORDER = Object.keys(STATUS);

const LOCATIONS = [
  { group: "Gudang Asal (Fulfillment Center)", items: [
    "DC Cakung, Jakarta Timur",
    "DC Marunda, Jakarta Utara",
    "DC Cikarang, Bekasi",
  ]},
  { group: "Hub Transit dan Sortir", items: [
    "Hub Sortir Cilegon, Banten",
    "Hub Transit Banyumanik, Semarang",
    "Hub Cross-Dock Kartasura, Solo",
  ]},
  { group: "Terminal Kargo", items: [
    "Terminal Kargo Soekarno-Hatta (CGK)",
    "Terminal Kargo Juanda (SUB)",
    "Terminal Peti Kemas Tanjung Priok",
  ]},
  { group: "Distribution Center Regional", items: [
    "DC Rungkut, Surabaya",
    "DC Gedebage, Bandung",
    "DC Sunggal, Medan",
  ]},
  { group: "Last-Mile", items: [
    "Hub Kurir Last-Mile",
    "Alamat Penerima",
  ]},
];

/* ---------- Password Visibility Toggle Setup ---------- */

function attachPasswordToggle(inputId, toggleBtnId) {
  const inp = $(inputId);
  const btn = $(toggleBtnId);
  if (!inp || !btn) return;
  btn.innerHTML = ICONS.eye;
  btn.setAttribute("aria-label", "Tampilkan kata sandi");
  btn.onclick = () => {
    const isPass = inp.type === "password";
    inp.type = isPass ? "text" : "password";
    btn.innerHTML = isPass ? ICONS.eyeOff : ICONS.eye;
    btn.setAttribute("aria-label", isPass ? "Sembunyikan kata sandi" : "Tampilkan kata sandi");
  };
}

const $ = (id) => document.getElementById(id);

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => (
  { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
));

const badge = (s) => `<span class="badge s-${esc(s)}">${esc(STATUS[s]?.label || s)}</span>`;

function fmtDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function fmtAgo(iso) {
  if (!iso) return "-";
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s} detik lalu`;
  if (s < 3600) return `${Math.floor(s / 60)} menit lalu`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
  return `${Math.floor(s / 86400)} hari lalu`;
}

function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1048576).toFixed(2)} MB`;
}

function qs(name) {
  return new URLSearchParams(location.search).get(name);
}

/* ---------- API ---------- */

async function api(path, options = {}) {
  const auth = getAuth();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (auth?.token) headers.Authorization = `Bearer ${auth.token}`;
  const res = await fetch(path, {
    ...options,
    headers,
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (typeof body.detail === "string") detail = body.detail;
    } catch { /* abaikan */ }
    const err = new Error(detail);
    err.status = res.status;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}

/* ---------- Kode resi otomatis ---------- */

function generateResi(existing = []) {
  const d = new Date();
  const date = `${String(d.getFullYear()).slice(-2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const taken = new Set(existing);
  let code;
  do {
    let rnd = "";
    for (let i = 0; i < 4; i++) rnd += chars[Math.floor(Math.random() * chars.length)];
    code = `LOG-${date}-${rnd}`;
  } while (taken.has(code));
  return code;
}

/* ---------- Toast ---------- */

function toast(message, type = "ok") {
  let host = document.querySelector(".toast-host");
  if (!host) {
    host = document.createElement("div");
    host.className = "toast-host";
    document.body.appendChild(host);
  }
  const el = document.createElement("div");
  el.className = `toast ${type === "err" ? "err" : ""}`;
  el.textContent = message;
  host.appendChild(el);
  setTimeout(() => el.remove(), 3800);
}

/* ---------- Dialog konfirmasi ---------- */

function confirmDialog({ title, message, confirmText = "Ya, lanjutkan", danger = false }) {
  return new Promise((resolve) => {
    const wrap = document.createElement("div");
    wrap.className = "modal-backdrop";
    wrap.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <h3>${esc(title)}</h3>
        <p>${message}</p>
        <div class="actions">
          <button type="button" class="btn ghost" data-act="no">Batal</button>
          <button type="button" class="btn ${danger ? "danger" : ""}" data-act="yes">${esc(confirmText)}</button>
        </div>
      </div>`;
    const close = (val) => { wrap.remove(); document.removeEventListener("keydown", onKey); resolve(val); };
    const onKey = (e) => { if (e.key === "Escape") close(false); };
    wrap.addEventListener("click", (e) => {
      if (e.target === wrap) close(false);
      const act = e.target.dataset?.act;
      if (act) close(act === "yes");
    });
    document.addEventListener("keydown", onKey);
    document.body.appendChild(wrap);
    wrap.querySelector('[data-act="yes"]').focus();
  });
}

/* ---------- Layout: sidebar, mobile topbar, drawer backdrop ---------- */

function renderSidebar() {
  const sidebar = $("sidebar");
  if (!sidebar) return;
  const path = location.pathname.replace(/\/+$/, "") || "/";
  const auth = getAuth();

  if (!auth) {
    sidebar.style.display = "none";
    document.body.classList.add("pub-mode");
    if (!document.querySelector(".pub-bar")) {
      const bar = document.createElement("header");
      bar.className = "pub-bar";
      bar.innerHTML = `
        <a class="brand" href="/lacak">
          <img class="brand-mark" src="/static/logo.svg" alt="LacakIn" width="36" height="36" style="width:36px;height:36px;background:none">
          <div>
            <div class="brand-name">LacakIn</div>
            <div class="brand-sub">Layanan Lacak Pengiriman</div>
          </div>
        </a>
        <a class="btn sm ghost" href="/login">${ICONS.login} Portal Pegawai</a>`;
      document.body.insertBefore(bar, sidebar);
    }
    return;
  }

  const role = auth.user.role;
  const visibleNav = NAV.filter((n) => n.roles.includes(role));
  const empCode = auth.user.employee_code ? `<span class="u-code">${esc(auth.user.employee_code)}</span>` : "";

  const avatarSrc = userAvatarUrl(auth.user);
  const userBox = `<div class="side-user" style="display:flex;align-items:center;gap:10px">
    <a href="/profil" title="Lihat dan Edit Profil" style="display:flex;align-items:center;gap:10px;text-decoration:none;color:inherit;flex:1;min-width:0">
      <img id="sideAvatarImg" src="${esc(avatarSrc)}" alt="Foto Profil" style="width:38px;height:38px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid #e2e8f0">
      <div class="u-info" style="min-width:0">
        <div class="u-name" title="${esc(auth.user.full_name)}">${esc(auth.user.full_name)}</div>
        <div class="u-meta">${empCode}<span class="u-role">${esc(ROLE_LABELS[role] || role)}</span></div>
      </div>
    </a>
    <button type="button" class="btn ghost sm u-logout" id="btnLogout" title="Keluar">${ICONS.logout}</button>
  </div>`;

  // Isi Sidebar Desktop / Mobile Drawer
  sidebar.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <a class="brand" href="/" style="margin-bottom:0;padding-bottom:0;border-bottom:0">
        <img class="brand-mark" src="/static/logo.svg" alt="LacakIn" width="38" height="38" style="background:none">
        <div>
          <div class="brand-name">LacakIn</div>
          <div class="brand-sub">Logistik dan Rantai Pasok</div>
        </div>
      </a>
      <button type="button" class="btn ghost sm btn-close-drawer" style="display:none" id="btnCloseDrawer">Tutup</button>
    </div>
    <div class="nav-label" style="margin-top:14px">Menu Navigasi</div>
    <nav class="nav">
      ${visibleNav.map((n) => `<a href="${n.href}" class="${n.href === path ? "active" : ""}">${ICONS[n.icon] || ""}${n.label}</a>`).join("")}
    </nav>
    <div class="side-footer">
      ${userBox}
      <div class="side-status">
        <small>Status database</small>
        <div class="row"><span class="dot" id="sysDot"></span><span id="sysText">Memeriksa</span></div>
        <div class="meta" id="sysMeta">-</div>
      </div>
    </div>`;

  const btnLogout = $("btnLogout");
  if (!window.__meSynced) {
    window.__meSynced = true;
    api("/api/auth/me").then((me) => {
      const cur = getAuth();
      if (cur && me) {
        setAuth(cur.token, { ...cur.user, ...me });
        const img = $("sideAvatarImg");
        if (img) img.src = userAvatarUrl(me);
      }
    }).catch(() => {});
  }
  if (btnLogout) {
    btnLogout.onclick = async () => {
      const ok = await confirmDialog({
        title: "Konfirmasi Keluar",
        message: "Apakah Anda yakin ingin keluar dari sesi sistem LacakIn?",
        confirmText: "Keluar",
        danger: true,
      });
      if (ok) {
        clearAuth();
        location.href = "/login";
      }
    };
  }

  // Render Mobile Navigation Wrap (Top Bar & Tabs untuk HP & iPad)
  let mobileNavWrap = document.querySelector(".mobile-nav-wrap");
  if (!mobileNavWrap) {
    mobileNavWrap = document.createElement("div");
    mobileNavWrap.className = "mobile-nav-wrap";
    mobileNavWrap.innerHTML = `
      <header class="mobile-bar">
        <a class="brand" href="/" style="border:0;margin:0;padding:0">
          <img class="brand-mark" src="/static/logo.svg" alt="LacakIn" width="34" height="34" style="width:34px;height:34px;background:none">
          <div class="brand-name">LacakIn</div>
        </a>
        <div class="mobile-bar-actions">
          <div class="mobile-status">
            <span class="dot" id="sysDotMobile"></span>
            <span id="sysTextMobile">DB</span>
          </div>
          <button type="button" class="btn-menu" id="btnOpenMenu">Menu</button>
        </div>
      </header>
      <nav class="mobile-tabs">
        ${visibleNav.map((n) => `<a href="${n.href}" class="${n.href === path ? "active" : ""}">${n.label}</a>`).join("")}
      </nav>
    `;
    document.body.insertBefore(mobileNavWrap, sidebar);
  }

  // Backdrop untuk Drawer Menu
  let backdrop = document.querySelector(".drawer-backdrop");
  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.className = "drawer-backdrop";
    document.body.appendChild(backdrop);
  }

  // Handler Buka & Tutup Drawer
  const openDrawer = () => {
    sidebar.classList.add("open");
    backdrop.classList.add("show");
  };
  const closeDrawer = () => {
    sidebar.classList.remove("open");
    backdrop.classList.remove("show");
  };

  const btnOpen = $("btnOpenMenu");
  if (btnOpen) btnOpen.onclick = openDrawer;
  backdrop.onclick = closeDrawer;

  const btnClose = $("btnCloseDrawer");
  if (btnClose) {
    if (window.innerWidth <= 860) btnClose.style.display = "inline-flex";
    btnClose.onclick = closeDrawer;
  }
}

async function checkHealth() {
  const dot = $("sysDot"), text = $("sysText"), meta = $("sysMeta");
  const dotMobile = $("sysDotMobile"), textMobile = $("sysTextMobile");
  const started = performance.now();
  let ok = false;
  try {
    await api("/health");
    ok = true;
  } catch { /* status ditangani di bawah */ }
  const ms = Math.round(performance.now() - started);

  const statusClass = `dot ${ok ? "ok" : "bad"}`;
  if (dot) dot.className = statusClass;
  if (text) text.textContent = ok ? "Terhubung" : "Tidak tersedia";
  if (meta) meta.textContent = ok ? `Latensi ${ms} ms` : "Periksa container database";

  if (dotMobile) dotMobile.className = statusClass;
  if (textMobile) textMobile.textContent = ok ? "Online" : "Offline";

  const alert = $("dbAlert");
  if (alert) alert.classList.toggle("show", !ok);
  return ok;
}

/* Jalankan fungsi load secara berkala, plus cek kesehatan sistem. */
function autoRefresh(loadFn, intervalMs = 10000) {
  const run = async () => {
    const ok = await checkHealth();
    if (ok && loadFn) {
      try { await loadFn(); } catch (e) { console.error(e); }
    }
    const up = $("updated");
    if (up) up.textContent = `Diperbarui ${new Date().toLocaleTimeString("id-ID")}`;
  };
  run();
  setInterval(run, intervalMs);
  return run;
}

/* ---------- Generator Laporan Harian, Mingguan, Bulanan (Excel .xls & PDF) ---------- */
async function exportOperationalReport(period = "daily", format = "excel") {
  try {
    const auth = getAuth();
    const role = auth?.user?.role;
    if (!["operator", "supervisor", "admin", "superadmin"].includes(role)) {
      return toast("Fitur cetak laporan hanya untuk Operator, Supervisor, Admin, dan Superadmin.", "err");
    }
    const all = await api("/api/shipments");
    const now = new Date();
    const filtered = all.filter((s) => {
      if (!s.updated_at) return true;
      const d = new Date(s.updated_at);
      if (period === "daily") {
        return d.getFullYear() === now.getFullYear() &&
               d.getMonth() === now.getMonth() &&
               d.getDate() === now.getDate();
      }
      if (period === "weekly") {
        const diffDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 7;
      }
      if (period === "monthly") {
        return d.getFullYear() === now.getFullYear() &&
               d.getMonth() === now.getMonth();
      }
      return true;
    });
    const rows = filtered.length ? filtered : all;
    const periodName = period === "daily" ? "Harian" : (period === "weekly" ? "Mingguan" : "Bulanan");
    const periodLabel = period === "daily"
      ? `Harian (${now.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })})`
      : period === "weekly"
      ? `Mingguan (7 Hari Terakhir s/d ${now.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })})`
      : `Bulanan (${now.toLocaleDateString("id-ID", { month: "long", year: "numeric" })})`;
    const officer = auth?.user ? `${auth.user.name} (${auth.user.employee_id || auth.user.role})` : "Operator";

    if (format === "excel") {
      const tableHtml = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head><meta charset="UTF-8"></head>
        <body>
          <h2>LAPORAN OPERASIONAL PENGIRIMAN LACAKIN</h2>
          <p><b>Periode:</b> ${esc(periodLabel)} | <b>Dicetak oleh:</b> ${esc(officer)} | <b>Total Paket:</b> ${rows.length}</p>
          <table border="1" cellpadding="6" cellspacing="0">
            <thead style="background:#1d4ed8;color:#ffffff;font-weight:bold">
              <tr>
                <th>No</th>
                <th>Kode Resi</th>
                <th>Status Terakhir</th>
                <th>Lokasi Terakhir</th>
                <th>Jumlah Event</th>
                <th>Waktu Diperbarui</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map((r, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${esc(r.code)}</td>
                  <td>${esc(STATUS[r.current_status]?.label || r.current_status)}</td>
                  <td>${esc(r.current_location)}</td>
                  <td>${r.total_events}</td>
                  <td>${esc(fmtDate(r.updated_at))}</td>
                </tr>`).join("")}
            </tbody>
          </table>
        </body></html>`;
      const blob = new Blob([tableHtml], { type: "application/vnd.ms-excel;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Laporan_${periodName}_LacakIn_${now.toISOString().slice(0, 10)}.xls`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast(`Laporan ${periodName} (Excel) berhasil diunduh.`);
    } else {
      const win = window.open("", "_blank");
      if (!win) return toast("Izinkan pop-up browser untuk mencetak PDF.", "err");
      win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
        <title>Laporan ${esc(periodLabel)} - LacakIn</title>
        <style>
          body { font-family: Arial, sans-serif; color: #0f172a; margin: 28px; }
          .head { border-bottom: 2px solid #1d4ed8; padding-bottom: 12px; margin-bottom: 16px; display:flex; justify-content:space-between; }
          h1 { margin: 0 0 4px 0; font-size: 20px; color: #1e3a8a; }
          .meta { font-size: 12px; color: #475569; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
          th { background: #eff6ff; color: #1e3a8a; }
          .foot { margin-top: 32px; display:flex; justify-content:flex-end; font-size: 12px; }
        </style></head><body>
        <div class="head">
          <div>
            <h1>LAPORAN OPERASIONAL PENGIRIMAN — LACAKIN</h1>
            <div class="meta">Periode: <b>${esc(periodLabel)}</b> | Total Pengiriman: <b>${rows.length} paket</b></div>
          </div>
          <div class="meta" style="text-align:right">
            Dicetak: ${esc(fmtDate(now.toISOString()))}<br>Petugas: <b>${esc(officer)}</b>
          </div>
        </div>
        <table>
          <thead><tr><th>No</th><th>Kode Resi</th><th>Status</th><th>Lokasi Terakhir</th><th>Jumlah Checkpoint</th><th>Waktu Update</th></tr></thead>
          <tbody>
            ${rows.map((r, i) => `<tr>
              <td>${i + 1}</td>
              <td><b>${esc(r.code)}</b></td>
              <td>${esc(STATUS[r.current_status]?.label || r.current_status)}</td>
              <td>${esc(r.current_location)}</td>
              <td>${r.total_events}</td>
              <td>${esc(fmtDate(r.updated_at))}</td>
            </tr>`).join("")}
          </tbody>
        </table>
        <div class="foot"><div>Mengetahui,<br><br><br><b>${esc(officer)}</b></div></div>
        <script>window.onload = () => { window.print(); };<\/script>
      </body></html>`);
      win.document.close();
    }
  } catch (e) {
    toast(`Gagal membuat laporan: ${e.message}`, "err");
  }
}

renderSidebar();
