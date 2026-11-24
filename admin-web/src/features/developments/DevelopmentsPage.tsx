import { useRef } from 'react';
import { Link } from 'react-router-dom';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import { listDevelopments, type AdminDevelopmentListItem } from '@/features/developments/api';
import { formatDateTime } from '@/shared/utils';

export function DevelopmentsPage() {
  const { t } = useTranslation();
  const actionRef = useRef<ActionType>();

  const columns: ProColumns<AdminDevelopmentListItem>[] = [
    {
      title: t('developments.titleCol'),
      dataIndex: 'title',
      ellipsis: true,
    },
    {
      title: t('developments.monitorId'),
      dataIndex: 'monitorId',
      width: 220,
      render: (_, row) => <Link to={`/monitors/${row.monitorId}`}>{row.monitorId}</Link>,
    },
    {
      title: t('developments.type'),
      dataIndex: 'type',
      search: false,
      width: 120,
      render: (_, row) => <Tag>{row.type}</Tag>,
    },
    {
      title: t('developments.severity'),
      dataIndex: 'severity',
      search: false,
      width: 100,
      render: (_, row) => <Tag>{row.severity}</Tag>,
    },
    {
      title: t('developments.evidenceCount'),
      dataIndex: 'evidenceItemIds',
      search: false,
      width: 90,
      render: (_, row) => row.evidenceItemIds?.length ?? 0,
    },
    {
      title: t('developments.timelineAt'),
      dataIndex: 'timelineAt',
      search: false,
      width: 180,
      render: (_, row) => formatDateTime(row.timelineAt),
    },
    {
      title: t('developments.locale'),
      dataIndex: 'locale',
      search: false,
      width: 80,
      render: (_, row) => row.locale || t('common.dash'),
    },
    {
      title: t('developments.search'),
      dataIndex: 'search',
      hideInTable: true,
    },
  ];

  return (
    <ProTable<AdminDevelopmentListItem>
      headerTitle={t('developments.title')}
      actionRef={actionRef}
      rowKey="id"
      columns={columns}
      search={{ labelWidth: 'auto' }}
      request={async (params) => {
        const res = await listDevelopments({
          page: params.current ?? 1,
          pageSize: params.pageSize ?? 20,
          search: typeof params.search === 'string' ? params.search : undefined,
          monitorId: typeof params.monitorId === 'string' ? params.monitorId : undefined,
        });
        return { data: res.items, total: res.total, success: true };
      }}
      pagination={{ defaultPageSize: 20, showSizeChanger: true }}
    />
  );
}
