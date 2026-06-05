import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Descriptions, Popconfirm, Space, Spin, Tag, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { deleteMonitor, getMonitor } from '@/features/monitors/api';
import { formatDateTime } from '@/shared/utils';
import type { AdminMonitorDetail } from '@/shared/types';
import { ApiError } from '@/shared/api/http';

export function MonitorDetailPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [row, setRow] = useState<AdminMonitorDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getMonitor(id)
      .then((data) => {
        if (alive) setRow(data);
      })
      .catch((e) => {
        message.error(e instanceof ApiError ? e.message : t('common.loadFailed'));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id, t]);

  if (loading) {
    return <Spin style={{ display: 'block', margin: '80px auto' }} />;
  }
  if (!row) {
    return <Card>{t('monitors.notFound')}</Card>;
  }

  const dash = t('common.dash');

  return (
    <Card
      title={row.title || t('monitors.detailTitle')}
      extra={
        <Space>
          <Link to={`/jobs?monitorId=${row.id}`}>{t('monitors.relatedJobs')}</Link>
          <Popconfirm
            title={t('monitors.confirmDelete')}
            onConfirm={async () => {
              try {
                await deleteMonitor(row.id);
                message.success(t('common.deleted'));
                navigate('/monitors', { replace: true });
              } catch (e) {
                message.error(e instanceof ApiError ? e.message : t('common.deleteFailed'));
              }
            }}
          >
            <Button danger>{t('common.delete')}</Button>
          </Popconfirm>
        </Space>
      }
    >
      <Descriptions column={1} bordered size="small">
        <Descriptions.Item label={t('monitors.id')}>{row.id}</Descriptions.Item>
        <Descriptions.Item label={t('monitors.owner')}>
          {row.owner.email} ({row.owner.username})
        </Descriptions.Item>
        <Descriptions.Item label={t('monitors.topic')}>{row.topicPrompt || dash}</Descriptions.Item>
        <Descriptions.Item label={t('monitors.description')}>{row.description || dash}</Descriptions.Item>
        <Descriptions.Item label={t('monitors.snapshotStatus')}>
          <Tag>{row.snapshotStatus}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label={t('monitors.snapshotComputedAt')}>
          {formatDateTime(row.snapshotComputedAt)}
        </Descriptions.Item>
        <Descriptions.Item label={t('monitors.minCosine')}>{row.minCosine}</Descriptions.Item>
        <Descriptions.Item label={t('monitors.sourceCount')}>{row.sourceCount}</Descriptions.Item>
        <Descriptions.Item label={t('monitors.keywords')}>
          {row.keywords.join('、') || dash}
        </Descriptions.Item>
        <Descriptions.Item label={t('monitors.entities')}>
          {row.entities.join('、') || dash}
        </Descriptions.Item>
        <Descriptions.Item label={t('monitors.createdAt')}>{formatDateTime(row.createdAt)}</Descriptions.Item>
        <Descriptions.Item label={t('monitors.updatedAt')}>{formatDateTime(row.updatedAt)}</Descriptions.Item>
      </Descriptions>
    </Card>
  );
}
