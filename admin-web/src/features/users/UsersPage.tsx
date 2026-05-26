import { useRef, useState } from 'react';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { Button, Modal, Form, Input, Select, message, Tag } from 'antd';
import { createUser, listUsers, setUserActive } from '@/features/users/api';
import { useAuthStore } from '@/features/auth/authStore';
import { USER_ROLE } from '@/shared/constants';
import { formatDateTime } from '@/shared/utils';
import type { AdminUser } from '@/shared/types';
import { ApiError } from '@/shared/api/http';

export function UsersPage() {
  const actionRef = useRef<ActionType>();
  const selfId = useAuthStore((s) => s.user?.id);
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();
  const [creating, setCreating] = useState(false);

  const columns: ProColumns<AdminUser>[] = [
    {
      title: '关键词',
      dataIndex: 'keyword',
      hideInTable: true,
    },
    { title: '邮箱', dataIndex: 'email', copyable: true, search: false },
    { title: '用户名', dataIndex: 'username', search: false },
    {
      title: '角色',
      dataIndex: 'role',
      width: 100,
      render: (_, row) => (
        <Tag color={row.role === USER_ROLE.Admin ? 'blue' : 'default'}>
          {row.role === USER_ROLE.Admin ? '管理员' : '用户'}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      width: 100,
      render: (_, row) => (row.isActive ? <Tag color="success">启用</Tag> : <Tag>停用</Tag>),
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      width: 180,
      render: (_, row) => formatDateTime(row.createdAt),
    },
    {
      title: '操作',
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
              message.success(row.isActive ? '已停用' : '已启用');
              actionRef.current?.reload();
            } catch (e) {
              message.error(e instanceof ApiError ? e.message : '操作失败');
            }
          }}
        >
          {row.isActive ? '停用' : '启用'}
        </Button>,
      ],
    },
  ];

  return (
    <>
      <ProTable<AdminUser>
        headerTitle="用户管理"
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        search={{ labelWidth: 'auto' }}
        toolBarRender={() => [
          <Button key="create" type="primary" onClick={() => setCreateOpen(true)}>
            新建用户
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
        title="新建用户"
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
              message.success('用户已创建');
              setCreateOpen(false);
              form.resetFields();
              actionRef.current?.reload();
            } catch (e) {
              message.error(e instanceof ApiError ? e.message : '创建失败');
            } finally {
              setCreating(false);
            }
          }}
        >
          <Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, min: 6 }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="username" label="用户名">
            <Input />
          </Form.Item>
          <Form.Item name="role" label="角色" rules={[{ required: true }]}>
            <Select
              options={[
                { value: USER_ROLE.User, label: '用户' },
                { value: USER_ROLE.Admin, label: '管理员' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
