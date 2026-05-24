import { useRef } from 'react';
import { Link } from 'react-router-dom';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { Button, Popconfirm, Tag, message } from 'antd';
import { deleteMonitor, listMonitors } from '@/features/monitors/api';
import { SNAPSHOT_STATUSES } from '@/shared/constants';
import { formatDateTime } from '@/shared/utils';
import type { AdminMonitorListItem } from '@/shared/types';
import { ApiError } from '@/shared/api/http';

const statusColor: Record<string, string> = {
  ready: 'success',
  computing: 'processing',
  pending: 'default',
  failed: 'error',
  stale: 'warning',
};

export function MonitorsPage() {
  const actionRef = useRef<ActionType>();

  const columns: ProColumns<AdminMonitorListItem>[] = [
    {
      title: '标题',
      dataIndex: 'title',
      ellipsis: true,
      render: (_, row) => <Link to={`/monitors/${row.id}`}>{row.title || '（无标题）'}</Link>,
    },
    { title: '话题', dataIndex: 'topicPrompt', ellipsis: true, search: false },
    {
      title: '所属用户',
      dataIndex: ['owner', 'email'],
      render: (_, row) => row.owner.email || row.owner.username || row.userId,
    },
    {
      title: 'Owner 邮箱',
      dataIndex: 'ownerEmail',
      hideInTable: true,
    },
    {
      title: '快照状态',
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: Object.fromEntries(SNAPSHOT_STATUSES.map((s) => [s, { text: s }])),
      render: (_, row) => <Tag color={statusColor[row.snapshotStatus] ?? 'default'}>{row.snapshotStatus}</Tag>,
    },
    { title: '信源数', dataIndex: 'sourceCount', search: false, width: 80 },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      search: false,
      width: 180,
      render: (_, row) => formatDateTime(row.createdAt),
    },
    {
      title: '操作',
      valueType: 'option',
      width: 160,
      render: (_, row) => [
        <Link key="detail" to={`/monitors/${row.id}`}>
          详情
        </Link>,
        <Popconfirm
          key="delete"
          title="确认删除该监控？"
          onConfirm={async () => {
            try {
              await deleteMonitor(row.id);
              message.success('已删除');
              actionRef.current?.reload();
            } catch (e) {
              message.error(e instanceof ApiError ? e.message : '删除失败');
            }
          }}
        >
          <Button type="link" danger size="small">
            删除
          </Button>
        </Popconfirm>,
      ],
    },
  ];

  return (
    <ProTable<AdminMonitorListItem>
      headerTitle="全站监控"
      actionRef={actionRef}
      rowKey="id"
      columns={columns}
      search={{ labelWidth: 'auto' }}
      request={async (params) => {
        const res = await listMonitors({
          page: params.current ?? 1,
          pageSize: params.pageSize ?? 20,
          search: typeof params.title === 'string' ? params.title : undefined,
          ownerEmail: typeof params.ownerEmail === 'string' ? params.ownerEmail : undefined,
          status: typeof params.status === 'string' ? params.status : undefined,
        });
        return { data: res.items, total: res.total, success: true };
      }}
      pagination={{ defaultPageSize: 20 }}
    />
  );
}
