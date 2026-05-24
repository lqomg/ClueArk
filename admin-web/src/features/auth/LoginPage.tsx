import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { adminLogin } from '@/features/auth/api';
import { useAuthStore } from '@/features/auth/authStore';
import { ApiError } from '@/shared/api/http';

export function LoginPage() {
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
      setError(e instanceof ApiError ? e.message : '登录失败');
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
          ClueArk 运营后台
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 24 }}>
          仅管理员账号可登录
        </Typography.Paragraph>
        {error ? <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} /> : null}
        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item name="account" label="账号" rules={[{ required: true, message: '请输入邮箱或用户名' }]}>
            <Input autoComplete="username" placeholder="邮箱或用户名" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password autoComplete="current-password" placeholder="密码" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            登录
          </Button>
        </Form>
      </Card>
    </div>
  );
}
