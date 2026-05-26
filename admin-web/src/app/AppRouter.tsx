import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from '@/layouts/AdminLayout';
import { GuestOnly, RequireAdmin } from '@/features/auth/RequireAdmin';
import { LoginPage } from '@/features/auth/LoginPage';
import { UsersPage } from '@/features/users/UsersPage';
import { MonitorsPage } from '@/features/monitors/MonitorsPage';
import { MonitorDetailPage } from '@/features/monitors/MonitorDetailPage';
import { SourcesPage } from '@/features/sources/SourcesPage';
import { PolicyPage } from '@/features/policy/PolicyPage';
import { JobsPage } from '@/features/jobs/JobsPage';

export function AppRouter() {
  return (
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
        path="/"
        element={
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        }
      >
        <Route index element={<Navigate to="/users" replace />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="monitors" element={<MonitorsPage />} />
        <Route path="monitors/:id" element={<MonitorDetailPage />} />
        <Route path="sources" element={<SourcesPage />} />
        <Route path="policy" element={<PolicyPage />} />
        <Route path="jobs" element={<JobsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/users" replace />} />
    </Routes>
  );
}
