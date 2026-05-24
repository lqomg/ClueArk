import { LogoutOutlined } from '@ant-design/icons';
import { ProLayout } from '@ant-design/pro-components';
import { Dropdown } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/authStore';

const menuItems = [
  { path: '/users', name: '用户管理' },
  { path: '/monitors', name: '全站监控' },
  { path: '/sources', name: '信源管理' },
  { path: '/policy', name: '聚合策略' },
  { path: '/jobs', name: '任务日志' },
];

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);

  function logout() {
    clear();
    navigate('/login', { replace: true });
  }

  return (
    <ProLayout
      title="ClueArk 运营"
      layout="mix"
      fixSiderbar
      location={{ pathname: location.pathname }}
      route={{
        path: '/',
        routes: menuItems.map((m) => ({ path: m.path, name: m.name })),
      }}
      menuItemRender={(item, dom) => (
        <span
          onClick={() => {
            if (item.path) navigate(item.path);
          }}
        >
          {dom}
        </span>
      )}
      avatarProps={{
        title: user?.email ?? 'Admin',
        render: (_, dom) => (
          <Dropdown
            menu={{
              items: [
                {
                  key: 'logout',
                  icon: <LogoutOutlined />,
                  label: '退出登录',
                  onClick: logout,
                },
              ],
            }}
          >
            {dom}
          </Dropdown>
        ),
      }}
      contentStyle={{ padding: 24, minHeight: 'calc(100vh - 56px)' }}
    >
      <Outlet />
    </ProLayout>
  );
}
