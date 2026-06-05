import { useRef } from 'react';
import { Link } from 'react-router-dom';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { Button, Popconfirm, Tag, message } from 'antd';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const actionRef = useRef<ActionType>();

  const columns: ProColumns<AdminMonitorListItem>[] = [
    {
      title: t('monitors.labelTitle'),
      dataIndex: 'title',
      ellipsis: true,
      render: (_, row) => (
        <Link to={`/monitors/${row.id}`}>{row.title || t('monitors.noTitle')}</Link>
      ),
    },
    { title: t('monitors.topic'), dataIndex: 'topicPrompt', ellipsis: true, search: false },
    {
      title: t('monitors.owner'),
      dataIndex: ['owner', 'email'],
      render: (_, row) => row.owner.email || row.owner.username || row.userId,
    },
    {
      title: t('monitors.ownerEmail'),
      dataIndex: 'ownerEmail',
      hideInTable: true,
    },
    {
      title: t('monitors.snapshotStatus'),
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: Object.fromEntries(SNAPSHOT_STATUSES.map((s) => [s, { text: s }])),
      render: (_, row) => <Tag color={statusColor[row.snapshotStatus] ?? 'default'}>{row.snapshotStatus}</Tag>,
    },
    { title: t('monitors.sourceCount'), dataIndex: 'sourceCount', search: false, width: 80 },
    {
      title: t('monitors.createdAt'),
      dataIndex: 'createdAt',
      search: false,
      width: 180,
      render: (_, row) => formatDateTime(row.createdAt),
    },
    {
      title: t('common.actions'),
      valueType: 'option',
      width: 160,
      render: (_, row) => [
        <Link key="detail" to={`/monitors/${row.id}`}>
          {t('monitors.detail')}
        </Link>,
        <Popconfirm
          key="delete"
          title={t('monitors.confirmDelete')}
          onConfirm={async () => {
            try {
              await deleteMonitor(row.id);
              message.success(t('common.deleted'));
              actionRef.current?.reload();
            } catch (e) {
              message.error(e instanceof ApiError ? e.message : t('common.deleteFailed'));
            }
          }}
        >
          <Button type="link" danger size="small">
            {t('common.delete')}
          </Button>
        </Popconfirm>,
      ],
    },
  ];

  return (
    <ProTable<AdminMonitorListItem>
      headerTitle={t('monitors.title')}
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
