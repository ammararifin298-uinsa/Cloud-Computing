/* ==========================================================
   Dashboard Logistik dan Rantai Pasok - Kelompok 6
   Modul bersama: layout adaptif (HP, iPad, Laptop), API, format
   ========================================================== */

const NAV = [
  { href: "/", label: "Ringkasan" },
  { href: "/checkpoint", label: "Catat Checkpoint" },
  { href: "/pengiriman", label: "Master Pengiriman" },
  { href: "/lacak", label: "Lacak Pengiriman" },
  { href: "/backup", label: "Backup dan DR" },
];

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

/* ---------- Helper umum ---------- */

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
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
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

  // Isi Sidebar Desktop / Mobile Drawer
  sidebar.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <a class="brand" href="/" style="margin-bottom:0;padding-bottom:0;border-bottom:0">
        <div class="brand-mark">K6</div>
        <div>
          <div class="brand-name">LogistikPro</div>
          <div class="brand-sub">Supply Chain Hub</div>
        </div>
      </a>
      <button type="button" class="btn ghost sm btn-close-drawer" style="display:none" id="btnCloseDrawer">Tutup</button>
    </div>
    <div class="nav-label" style="margin-top:14px">Menu Halaman</div>
    <nav class="nav">
      ${NAV.map((n) => `<a href="${n.href}" class="${n.href === path ? "active" : ""}">${n.label}</a>`).join("")}
    </nav>
    <div class="side-status">
      <small>Status database</small>
      <div class="row"><span class="dot" id="sysDot"></span><span id="sysText">Memeriksa</span></div>
      <div class="meta" id="sysMeta">-</div>
    </div>`;

  // Render Mobile Navigation Wrap (Top Bar & Tabs untuk HP & iPad)
  let mobileNavWrap = document.querySelector(".mobile-nav-wrap");
  if (!mobileNavWrap) {
    mobileNavWrap = document.createElement("div");
    mobileNavWrap.className = "mobile-nav-wrap";
    mobileNavWrap.innerHTML = `
      <header class="mobile-bar">
        <a class="brand" href="/" style="border:0;margin:0;padding:0">
          <div class="brand-mark">K6</div>
          <div class="brand-name">LogistikPro</div>
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
        ${NAV.map((n) => `<a href="${n.href}" class="${n.href === path ? "active" : ""}">${n.label}</a>`).join("")}
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

renderSidebar();
