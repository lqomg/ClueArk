import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
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
import { ExplorePage } from '@/pages/app/explore';
import { topicSettingsPath, topicTimelinePath } from '@/pages/app/topics/paths';

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

function LegacyMonitorTimelineRedirect() {
  const { id = '' } = useParams<{ id: string }>();
  return <Navigate to={topicTimelinePath(id)} replace />;
}

function LegacyMonitorSettingsRedirect() {
  const { id = '' } = useParams<{ id: string }>();
  return <Navigate to={topicSettingsPath(id)} replace />;
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
          <Route path="explore" element={<ExplorePage />} />
          <Route path="notifications" element={<NotificationsPage />} />

          {/* 专题（对外路径） */}
          <Route path="topics" element={<MonitorOverviewPage />} />
          <Route path="my-topics" element={<MonitorManagePage />} />
          <Route path="topics/new" element={<Navigate to="/app/my-topics" replace />} />
          <Route path="topics/:id/settings" element={<MonitorSettingsPage />} />
          <Route path="topics/:id" element={<MonitorDetailPage />} />
          <Route path="topics/:id/timeline" element={<LegacyMonitorTimelineRedirect />} />

          {/* 旧 monitors 路径兼容 */}
          <Route path="monitors" element={<Navigate to="/app/topics" replace />} />
          <Route path="monitors/new" element={<Navigate to="/app/my-topics" replace />} />
          <Route path="monitors/manage" element={<Navigate to="/app/my-topics" replace />} />
          <Route path="monitors/:id/settings" element={<LegacyMonitorSettingsRedirect />} />
          <Route path="monitors/:id/timeline" element={<LegacyMonitorTimelineRedirect />} />
          <Route path="monitors/:id" element={<LegacyMonitorTimelineRedirect />} />

          <Route path="sources" element={<SourcesPage />} />
          <Route path="me" element={<ProfilePage />} />
        </Route>
        <Route path="/" element={<Navigate to="/app/home" replace />} />
        <Route path="*" element={<Navigate to="/app/home" replace />} />
      </Routes>
    </>
  );
}
