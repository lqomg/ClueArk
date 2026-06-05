import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { adminLogin } from '@/features/auth/api';
import { useAuthStore } from '@/features/auth/authStore';
import { ApiError } from '@/shared/api/http';

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((s) => s.setSession);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onFinish(values: { account: string; password: string }) {
    setLoading(true);
    setError(null);
    try {
      const res = await adminLogin(values.account.trim(), values.password);
      setSession(res.access_token, res.user);
      const from = (location.state as { from?: string } | null)?.from || '/users';
      navigate(from, { replace: true });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f0f5ff 0%, #fafafa 100%)',
        padding: 24,
      }}
    >
      <Card style={{ width: 400, maxWidth: '100%' }} bordered={false}>
        <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 8 }}>
          {t('auth.title')}
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 24 }}>
          {t('auth.subtitle')}
        </Typography.Paragraph>
        {error ? <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} /> : null}
        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item
            name="account"
            label={t('auth.account')}
            rules={[{ required: true, message: t('auth.accountRequired') }]}
          >
            <Input autoComplete="username" placeholder={t('auth.accountPlaceholder')} />
          </Form.Item>
          <Form.Item
            name="password"
            label={t('auth.password')}
            rules={[{ required: true, message: t('auth.passwordRequired') }]}
          >
            <Input.Password autoComplete="current-password" placeholder={t('auth.passwordPlaceholder')} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            {t('auth.login')}
          </Button>
        </Form>
      </Card>
    </div>
  );
}
