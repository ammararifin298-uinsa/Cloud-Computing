import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { MotionConfig } from "motion/react";
import { AppLayout, PublicLayout } from "./components/Layout.jsx";
import { Toaster } from "@/components/ui/sonner";
import { useAuth } from "./context/AuthContext.jsx";
import { hasRole } from "./lib/api.js";
import BackupPage from "./pages/BackupPage.jsx";
import BantuanPage from "./pages/BantuanPage.jsx";
import BerandaPage from "./pages/BerandaPage.jsx";
import CheckpointPage from "./pages/CheckpointPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import KirimPage from "./pages/KirimPage.jsx";
import LacakPage from "./pages/LacakPage.jsx";
import LaporanPage from "./pages/LaporanPage.jsx";
import LayananPage from "./pages/LayananPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import NotifikasiPage from "./pages/NotifikasiPage.jsx";
import PegawaiPage from "./pages/PegawaiPage.jsx";
import PengajuanKurirPage from "./pages/PengajuanKurirPage.jsx";
import PengaturanPage from "./pages/PengaturanPage.jsx";
import PengirimanPage from "./pages/PengirimanPage.jsx";
import ProfilPage from "./pages/ProfilPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import TarifPage from "./pages/TarifPage.jsx";

function Guard({ roles, children }: { roles?: string[]; children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !hasRole(user, roles)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function Shell() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <AppLayout /> : <PublicLayout />;
}

const ALL = ["superadmin", "admin", "supervisor", "operator", "kurir"];
const STAFF = ["superadmin", "admin", "operator"];

export default function App() {
  const { isAuthenticated } = useAuth();
  return (
    <MotionConfig reducedMotion="user">
      <Routes>
        <Route element={<Shell />}>
          <Route path="/beranda" element={<BerandaPage />} />
          <Route path="/lacak" element={<LacakPage />} />
          <Route path="/tarif" element={<TarifPage />} />
          <Route path="/layanan" element={<LayananPage />} />
          <Route path="/bantuan" element={<BantuanPage />} />
          <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
          <Route path="/register" element={isAuthenticated ? <Navigate to="/" replace /> : <RegisterPage />} />
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <Guard roles={ALL}>
                  <DashboardPage />
                </Guard>
              ) : (
                <BerandaPage />
              )
            }
          />
          <Route path="/kirim" element={<KirimPage />} />
          <Route
            path="/checkpoint"
            element={
              <Guard roles={["superadmin", "admin", "operator", "kurir"]}>
                <CheckpointPage />
              </Guard>
            }
          />
          <Route
            path="/pengiriman"
            element={
              <Guard roles={ALL}>
                <PengirimanPage />
              </Guard>
            }
          />
          <Route
            path="/laporan"
            element={
              <Guard roles={ALL}>
                <LaporanPage />
              </Guard>
            }
          />
          <Route
            path="/pegawai"
            element={
              <Guard roles={["superadmin", "admin"]}>
                <PegawaiPage />
              </Guard>
            }
          />
          <Route
            path="/pengajuan-kurir"
            element={
              <Guard roles={["superadmin", "admin", "supervisor"]}>
                <PengajuanKurirPage />
              </Guard>
            }
          />
          <Route
            path="/backup"
            element={
              <Guard roles={["superadmin"]}>
                <BackupPage />
              </Guard>
            }
          />
          <Route
            path="/profil"
            element={
              <Guard roles={ALL}>
                <ProfilPage />
              </Guard>
            }
          />
          <Route
            path="/notifikasi"
            element={
              <Guard roles={ALL}>
                <NotifikasiPage />
              </Guard>
            }
          />
          <Route
            path="/pengaturan"
            element={
              <Guard roles={ALL}>
                <PengaturanPage />
              </Guard>
            }
          />
          <Route path="*" element={<Navigate to="/lacak" replace />} />
        </Route>
      </Routes>
      <Toaster />
    </MotionConfig>
  );
}
