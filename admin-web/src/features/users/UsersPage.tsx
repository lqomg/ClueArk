import { useRef, useState } from 'react';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { Button, Modal, Form, Input, Select, message, Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import { createUser, listUsers, setUserActive } from '@/features/users/api';
import { useAuthStore } from '@/features/auth/authStore';
import { USER_ROLE } from '@/shared/constants';
import { formatDateTime } from '@/shared/utils';
import type { AdminUser } from '@/shared/types';
import { ApiError } from '@/shared/api/http';

export function UsersPage() {
  const { t } = useTranslation();
  const actionRef = useRef<ActionType>();
  const selfId = useAuthStore((s) => s.user?.id);
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();
  const [creating, setCreating] = useState(false);

  const columns: ProColumns<AdminUser>[] = [
    {
      title: t('users.keyword'),
      dataIndex: 'keyword',
      hideInTable: true,
    },
    { title: t('users.email'), dataIndex: 'email', copyable: true, search: false },
    { title: t('users.username'), dataIndex: 'username', search: false },
    {
      title: t('users.role'),
      dataIndex: 'role',
      width: 100,
      render: (_, row) => (
        <Tag color={row.role === USER_ROLE.Admin ? 'blue' : 'default'}>
          {row.role === USER_ROLE.Admin ? t('users.roleAdmin') : t('users.roleUser')}
        </Tag>
      ),
    },
    {
      title: t('users.status'),
      dataIndex: 'isActive',
      width: 100,
      render: (_, row) =>
        row.isActive ? <Tag color="success">{t('users.statusActive')}</Tag> : <Tag>{t('users.statusInactive')}</Tag>,
    },
    {
      title: t('users.createdAt'),
      dataIndex: 'createdAt',
      width: 180,
      render: (_, row) => formatDateTime(row.createdAt),
    },
    {
      title: t('common.actions'),
      valueType: 'option',
      width: 120,
      render: (_, row) => [
        <Button
          key="toggle"
          type="link"
          size="small"
          disabled={row.id === selfId}
          onClick={async () => {
            try {
              await setUserActive(row.id, !row.isActive);
              message.success(row.isActive ? t('users.deactivated') : t('users.activated'));
              actionRef.current?.reload();
            } catch (e) {
              message.error(e instanceof ApiError ? e.message : t('common.operationFailed'));
            }
          }}
        >
          {row.isActive ? t('users.deactivate') : t('users.activate')}
        </Button>,
      ],
    },
  ];

  return (
    <>
      <ProTable<AdminUser>
        headerTitle={t('users.title')}
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        search={{ labelWidth: 'auto' }}
        toolBarRender={() => [
          <Button key="create" type="primary" onClick={() => setCreateOpen(true)}>
            {t('users.create')}
          </Button>,
        ]}
        request={async (params) => {
          const res = await listUsers({
            page: params.current ?? 1,
            pageSize: params.pageSize ?? 20,
            search: typeof params.keyword === 'string' ? params.keyword : undefined,
          });
          return { data: res.items, total: res.total, success: true };
        }}
        pagination={{ defaultPageSize: 20 }}
      />

      <Modal
        title={t('users.createTitle')}
        open={createOpen}
        confirmLoading={creating}
        onCancel={() => {
          setCreateOpen(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ role: USER_ROLE.User }}
          onFinish={async (values) => {
            setCreating(true);
            try {
              await createUser({
                email: values.email,
                password: values.password,
                role: values.role,
                username: values.username?.trim() || undefined,
              });
              message.success(t('users.createdMsg'));
              setCreateOpen(false);
              form.resetFields();
              actionRef.current?.reload();
            } catch (e) {
              message.error(e instanceof ApiError ? e.message : t('common.createFailed'));
            } finally {
              setCreating(false);
            }
          }}
        >
          <Form.Item name="email" label={t('users.email')} rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label={t('auth.password')} rules={[{ required: true, min: 6 }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="username" label={t('users.username')}>
            <Input />
          </Form.Item>
          <Form.Item name="role" label={t('users.role')} rules={[{ required: true }]}>
            <Select
              options={[
                { value: USER_ROLE.User, label: t('users.roleUser') },
                { value: USER_ROLE.Admin, label: t('users.roleAdmin') },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
