import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { RequireAuth } from '@/routes/RequireAuth';
import { AppShell } from '@/components/layout/AppShell';
import { LoginPage } from '@/pages/auth/login';
import { RegisterPage } from '@/pages/auth/register';
import { ForgotPasswordPage } from '@/pages/auth/forgot-password';
import { LegalTermsPage } from '@/pages/legal/terms';
import { LegalPrivacyPage } from '@/pages/legal/privacy';
import { SourcesPage } from '@/pages/app/sources';
import { NotificationsPage } from '@/pages/app/notifications';
import { MonitorOverviewPage } from '@/pages/app/monitors';
import { MonitorDetailPage } from '@/pages/app/monitors/detail';
import { MonitorManagePage } from '@/pages/app/monitors/manage';
import { MonitorSettingsPage } from '@/pages/app/monitors/settings';
import { HomePage } from '@/pages/app/home';
import { ProfilePage } from '@/pages/app/me';

function AuthBootstrap() {
  const hydrate = useAuthStore((s) => s.hydrate);
  useEffect(() => {
    hydrate();
  }, [hydrate]);
  return null;
}

function GuestOnly({ children }: { children: React.ReactElement }) {
  const token = useAuthStore((s) => s.token);
  const location = useLocation();
  if (token) {
    const to = (location.state as { from?: string } | null)?.from || '/app/home';
    return <Navigate to={to} replace />;
  }
  return children;
}

export default function App() {
  return (
    <>
      <AuthBootstrap />
      <Routes>
        <Route
          path="/login"
          element={
            <GuestOnly>
              <LoginPage />
            </GuestOnly>
          }
        />
        <Route
          path="/register"
          element={
            <GuestOnly>
              <RegisterPage />
            </GuestOnly>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <GuestOnly>
              <ForgotPasswordPage />
            </GuestOnly>
          }
        />
        <Route path="/legal/terms" element={<LegalTermsPage />} />
        <Route path="/legal/privacy" element={<LegalPrivacyPage />} />
        <Route
          path="/app"
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="home" replace />} />
          <Route path="home" element={<HomePage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="monitors/new" element={<Navigate to="/app/monitors/manage" replace />} />
          <Route path="monitors/manage" element={<MonitorManagePage />} />
          <Route path="monitors/:id/settings" element={<MonitorSettingsPage />} />
          <Route path="monitors/:id/timeline" element={<MonitorDetailPage />} />
          <Route path="monitors" element={<MonitorOverviewPage />} />
          <Route path="sources" element={<SourcesPage />} />
          <Route path="me" element={<ProfilePage />} />
        </Route>
        <Route path="/" element={<Navigate to="/app/home" replace />} />
        <Route path="*" element={<Navigate to="/app/home" replace />} />
      </Routes>
    </>
  );
}
