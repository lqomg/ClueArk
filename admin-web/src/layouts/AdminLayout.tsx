import { LogoutOutlined, GlobalOutlined } from '@ant-design/icons';
import { ProLayout } from '@ant-design/pro-components';
import { Dropdown } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/features/auth/authStore';
import { changeAdminLanguage } from '@/i18n';
import type { AdminSupportedLocale } from '@/i18n/localeStorage';

const LOCALE_OPTIONS: { value: AdminSupportedLocale; labelKey: 'locale.en' | 'locale.zhCN' | 'locale.ja' | 'locale.ko' }[] = [
  { value: 'en', labelKey: 'locale.en' },
  { value: 'zh-CN', labelKey: 'locale.zhCN' },
  { value: 'ja', labelKey: 'locale.ja' },
  { value: 'ko', labelKey: 'locale.ko' },
];

export function AdminLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);

  const menuItems = [
    { path: '/users', name: t('nav.users') },
    { path: '/monitors', name: t('nav.monitors') },
    { path: '/sources', name: t('nav.sources') },
    { path: '/policy', name: t('nav.policy') },
    { path: '/jobs', name: t('nav.jobs') },
  ];

  function logout() {
    clear();
    navigate('/login', { replace: true });
  }

  return (
    <ProLayout
      title={t('nav.title')}
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
                  key: 'locale',
                  icon: <GlobalOutlined />,
                  label: t('locale.label'),
                  children: LOCALE_OPTIONS.map((opt) => ({
                    key: opt.value,
                    label: t(opt.labelKey),
                    onClick: () => changeAdminLanguage(opt.value),
                  })),
                },
                { type: 'divider' },
                {
                  key: 'logout',
                  icon: <LogoutOutlined />,
                  label: t('auth.logout'),
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
