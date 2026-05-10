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
import { FeedPage } from '@/pages/app/feed';
import { MonitorsListPage } from '@/pages/app/monitors';
import { MonitorNewPage } from '@/pages/app/monitors/new';
import { MonitorDetailPage } from '@/pages/app/monitors/detail';
import { MonitorSettingsPage } from '@/pages/app/monitors/settings';
import { ProfilePage } from '@/pages/app/me';
import { RequireStaff } from '@/routes/RequireStaff';
import { RequireAdminOnly } from '@/routes/RequireAdminOnly';
import { AdminLayout } from '@/pages/admin/layout';
import { AdminUsersPage } from '@/pages/admin/users';
import { AdminSourcesPage } from '@/pages/admin/sources';
import { AdminAggregationPolicyPage } from '@/pages/admin/aggregation-policy';

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
    const to = (location.state as { from?: string } | null)?.from || '/app/feed';
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
          <Route index element={<Navigate to="feed" replace />} />
          <Route path="feed" element={<FeedPage />} />
          <Route path="monitors/new" element={<MonitorNewPage />} />
          <Route path="monitors/:id/settings" element={<MonitorSettingsPage />} />
          <Route path="monitors/:id" element={<MonitorDetailPage />} />
          <Route path="monitors" element={<MonitorsListPage />} />
          <Route path="sources" element={<SourcesPage />} />
          <Route path="me" element={<ProfilePage />} />
          <Route path="admin" element={<RequireStaff><AdminLayout /></RequireStaff>}>
            <Route index element={<Navigate to="sources" replace />} />
            <Route path="users" element={<RequireAdminOnly><AdminUsersPage /></RequireAdminOnly>} />
            <Route path="sources" element={<AdminSourcesPage />} />
            <Route path="aggregation-policy" element={<AdminAggregationPolicyPage />} />
            <Route path="sources/:id/edit" element={<Navigate to="/app/admin/sources" replace />} />
          </Route>
        </Route>
        <Route path="/" element={<Navigate to="/app/feed" replace />} />
        <Route path="*" element={<Navigate to="/app/feed" replace />} />
      </Routes>
    </>
  );
}
