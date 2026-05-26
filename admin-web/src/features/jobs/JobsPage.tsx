import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { Card, Col, Descriptions, Drawer, Row, Statistic, Tag, Tooltip, Typography, message } from 'antd';
import { getJob, getJobStats, listJobs } from '@/features/jobs/api';
import {
  jobStatusLabel,
  jobStatusValueEnum,
  jobTypeHint,
  jobTypeLabel,
  jobTypeValueEnum,
  sourceKindLabel,
} from '@/shared/constants/job-labels';
import { formatDateTime, formatJsonDisplay } from '@/shared/utils';
import type { AdminJobDetail, AdminJobRow } from '@/shared/types';
import { ApiError } from '@/shared/api/http';

const statusColor: Record<string, string> = {
  completed: 'success',
  failed: 'error',
  active: 'processing',
  queued: 'warning',
  pending: 'default',
  cancelled: 'default',
};

function RelationCell({
  label,
  id,
}: {
  label: string | null | undefined;
  id: string | null | undefined;
}) {
  if (!id) return <span>—</span>;
  const text = label?.trim() || id;
  return (
    <Tooltip title={`ID: ${id}`}>
      <Typography.Text ellipsis style={{ maxWidth: 220 }}>
        {text}
      </Typography.Text>
    </Tooltip>
  );
}

export function JobsPage() {
  const actionRef = useRef<ActionType>();
  const [searchParams] = useSearchParams();
  const presetMonitorId = searchParams.get('monitorId') ?? undefined;
  const [stats, setStats] = useState<{ completed: number; failed: number; active: number }>({
    completed: 0,
    failed: 0,
    active: 0,
  });
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<AdminJobDetail | null>(null);

  useEffect(() => {
    getJobStats(24).then((res) => {
      let completed = 0;
      let failed = 0;
      let active = 0;
      for (const b of res.buckets) {
        const c = b.count;
        if (b._id.status === 'completed') completed += c;
        else if (b._id.status === 'failed') failed += c;
        else if (b._id.status === 'active' || b._id.status === 'queued') active += c;
      }
      setStats({ completed, failed, active });
    });
  }, []);

  const columns: ProColumns<AdminJobRow>[] = useMemo(
    () => [
      {
        title: '类型',
        dataIndex: 'type',
        width: 200,
        valueType: 'select',
        valueEnum: jobTypeValueEnum(),
        render: (_, row) => (
          <Tooltip title={`${jobTypeHint(row.type)}（${row.type}）`}>
            <span>{jobTypeLabel(row.type)}</span>
          </Tooltip>
        ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 100,
        valueType: 'select',
        valueEnum: jobStatusValueEnum(),
        render: (_, row) => (
          <Tooltip title={row.status}>
            <Tag color={statusColor[row.status] ?? 'default'}>{jobStatusLabel(row.status)}</Tag>
          </Tooltip>
        ),
      },
      {
        title: '监控',
        dataIndex: 'monitorId',
        width: 180,
        ellipsis: true,
        render: (_, row) => <RelationCell label={row.monitorTitle} id={row.monitorId} />,
      },
      {
        title: '信源',
        dataIndex: 'sourceId',
        width: 200,
        ellipsis: true,
        hideInSearch: true,
        render: (_, row) => {
          if (!row.sourceId) return '—';
          const kind = sourceKindLabel(row.sourceKind);
          const name = row.sourceName?.trim();
          const label = name ? (kind ? `${name}（${kind}）` : name) : row.sourceId;
          return <RelationCell label={label} id={row.sourceId} />;
        },
      },
      {
        title: '创建时间',
        dataIndex: 'createdAt',
        search: false,
        width: 180,
        render: (_, row) => formatDateTime(row.createdAt),
      },
      {
        title: '耗时(ms)',
        dataIndex: 'durationMs',
        search: false,
        width: 100,
      },
      {
        title: '操作',
        valueType: 'option',
        width: 80,
        render: (_, row) => [
          <a
            key="detail"
            onClick={async () => {
              try {
                const job = await getJob(row.id);
                setDetail(job);
                setDetailOpen(true);
              } catch (e) {
                message.error(e instanceof ApiError ? e.message : '加载失败');
              }
            }}
          >
            详情
          </a>,
        ],
      },
    ],
    [],
  );

  return (
    <>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card><Statistic title="近 24h 完成" value={stats.completed} /></Card>
        </Col>
        <Col span={8}>
          <Card><Statistic title="近 24h 失败" value={stats.failed} valueStyle={{ color: '#cf1322' }} /></Card>
        </Col>
        <Col span={8}>
          <Card><Statistic title="近 24h 进行中" value={stats.active} /></Card>
        </Col>
      </Row>

      <ProTable<AdminJobRow>
        headerTitle="任务日志"
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        search={{ labelWidth: 'auto' }}
        params={{ monitorId: presetMonitorId }}
        request={async (params) => {
          const res = await listJobs({
            page: params.current ?? 1,
            pageSize: params.pageSize ?? 30,
            type: params.type as string | undefined,
            status: params.status as string | undefined,
            monitorId: (params.monitorId as string | undefined) || presetMonitorId,
            sourceId: params.sourceId as string | undefined,
          });
          return { data: res.items, total: res.total, success: true };
        }}
        pagination={{ defaultPageSize: 30 }}
      />

      <Drawer title="任务详情" width={720} open={detailOpen} onClose={() => setDetailOpen(false)}>
        {detail ? (
          <>
            <Descriptions column={1} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="ID">{detail.id}</Descriptions.Item>
              <Descriptions.Item label="类型">
                {jobTypeLabel(detail.type)}
                <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
                  {detail.type}
                </Typography.Text>
              </Descriptions.Item>
              <Descriptions.Item label="状态">{jobStatusLabel(detail.status)}</Descriptions.Item>
              <Descriptions.Item label="队列">{detail.queue ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="触发">{detail.trigger ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="信源">
                {detail.sourceId ? (
                  <>
                    {detail.sourceName ?? detail.sourceId}
                    {detail.sourceKind ? `（${sourceKindLabel(detail.sourceKind)}）` : ''}
                    <Typography.Text type="secondary" copyable={{ text: detail.sourceId }} style={{ display: 'block' }}>
                      {detail.sourceId}
                    </Typography.Text>
                  </>
                ) : (
                  '—'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="监控">
                {detail.monitorId ? (
                  <>
                    {detail.monitorTitle ?? detail.monitorId}
                    <Typography.Text type="secondary" copyable={{ text: detail.monitorId }} style={{ display: 'block' }}>
                      {detail.monitorId}
                    </Typography.Text>
                  </>
                ) : (
                  '—'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="条目 ID">
                {detail.feedItemId ? (
                  <Typography.Text copyable>{detail.feedItemId}</Typography.Text>
                ) : (
                  '—'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="错误">
                {detail.errorMessage ? (
                  <Typography.Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                    {detail.errorMessage}
                  </Typography.Paragraph>
                ) : (
                  '—'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="结果摘要">
                {detail.resultSummary == null ? (
                  '—'
                ) : (
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {formatJsonDisplay(detail.resultSummary)}
                  </pre>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="开始">{formatDateTime(detail.startedAt)}</Descriptions.Item>
              <Descriptions.Item label="完成">{formatDateTime(detail.completedAt)}</Descriptions.Item>
            </Descriptions>
            <Card title="Payload" size="small">
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {JSON.stringify(detail.payload ?? {}, null, 2)}
              </pre>
            </Card>
          </>
        ) : null}
      </Drawer>
    </>
  );
}
