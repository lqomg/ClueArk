import { App as AntApp, ConfigProvider, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { BrowserRouter } from 'react-router-dom';
import { AppRouter } from '@/app/AppRouter';
import { AuthBootstrap } from '@/features/auth/AuthBootstrap';
import { useAuthStore } from '@/features/auth/authStore';

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
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 6,
        },
      }}
    >
      <AntApp>
        <BrowserRouter>
          <AuthBootstrap />
          <AppContent />
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  );
}
