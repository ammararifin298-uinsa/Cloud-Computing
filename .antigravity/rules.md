# Aturan Permanen Proyek Frontend Mobile-First (LacakIn)

## 1. Prinsip Mobile-First dan Responsif (Wajib)
- Selalu desain mulai dari ukuran layar HP (`375px`) hingga desktop (`1440px`) tanpa *horizontal scroll* (`overflow-x: clip`).
- Gunakan unit viewport modern (`min-h-dvh`) agar tampilan pada browser HP (Safari iOS / Chrome Android) tidak terpotong *address bar*.
- Pastikan setiap tombol dan elemen interaktif memiliki area sentuh nyaman minimal **`44x44px`**.
- Pastikan seluruh `<input>`, `<select>`, dan `<textarea>` memiliki `font-size` minimal **`16px`** di perangkat mobile agar tidak memicu *auto-zoom* pada Safari/iOS.
- Gunakan komponen **`Sheet`** (drawer slide-in) untuk navigasi menu pada layar HP, dan **`Navbar`** penuh pada layar desktop.

## 2. Sinergi 4 AI Skills (`.agents/skills/`)
1. **UI/UX Pro Max** (`ui-ux-pro-max`) — Sistem desain, palet warna, tipografi, kontras, dan tata letak.
2. **Modern Web Guidance** (`modern-web-guidance`) — CSS modern, semantik HTML5, aksesibilitas ARIA, dan performa web.
3. **Emil Skills** (`emil-design-eng`, `animate`, `gestures`, `mobile-native`) — Animasi halus, transisi drawer/modal, dan interaksi sentuh.
4. **Impeccable** — Audit kualitas visual dan perapian tata letak.

## 3. Tech Stack Wajib (Dilarang Mengganti dengan Library Lain)
1. **Shadcn UI** (`@/components/ui/*`: `button`, `input`, `card`, `label`, `sheet`, `sonner`) untuk seluruh komponen antarmuka.
2. **React Icons** (`react-icons/*`) untuk semua ikon antarmuka (jangan gunakan `lucide-react` kecuali diminta eksplisit).
3. **Motion** (`motion/react`) untuk transisi dan animasi halus (patuhi `prefers-reduced-motion` via `<MotionConfig reducedMotion="user">`).
4. **Zod** (`zod`) untuk skema validasi data dan type inference (`z.infer`).
5. **React Hook Form** (`react-hook-form` + `@hookform/resolvers/zod`) untuk manajemen seluruh form.
6. **Axios** (`src/lib/axios.ts`) dengan instance terpusat beserta request dan response interceptor.
7. **Zustand** (`src/store/*`) untuk global state management.
8. **Swiper.js** (`swiper/react`) untuk slider atau carousel interaktif dengan dukungan *touch swipe* penuh.

## 4. Aturan Konten Publik LacakIn
- Jangan mengekspos istilah arsitektur internal (`CDN`, `replikasi`, `backup`, `JWT`, `PBKDF2`, contoh resi internal) pada halaman publik (`/lacak`, `/tarif`, `/login`, `/register`).
- Gunakan kata `dan` (jangan simbol `&`) pada teks antarmuka berbahasa Indonesia.
