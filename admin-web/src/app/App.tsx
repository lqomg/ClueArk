import { App as AntApp, Spin } from 'antd';
import { BrowserRouter } from 'react-router-dom';
import { AppRouter } from '@/app/AppRouter';
import { AuthBootstrap } from '@/features/auth/AuthBootstrap';
import { useAuthStore } from '@/features/auth/authStore';
import { AppLocaleProvider } from '@/i18n/AppLocaleProvider';
import '@/i18n';

function AppContent() {
  const authReady = useAuthStore((s) => s.authReady);

  if (!authReady) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return <AppRouter />;
}

export function App() {
  return (
    <AppLocaleProvider>
      <AntApp>
        <BrowserRouter>
          <AuthBootstrap />
          <AppContent />
        </BrowserRouter>
      </AntApp>
    </AppLocaleProvider>
  );
}
