import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Descriptions, Popconfirm, Space, Spin, Tag, message } from 'antd';
import { deleteMonitor, getMonitor } from '@/features/monitors/api';
import { formatDateTime } from '@/shared/utils';
import type { AdminMonitorDetail } from '@/shared/types';
import { ApiError } from '@/shared/api/http';

export function MonitorDetailPage() {
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
        message.error(e instanceof ApiError ? e.message : '加载失败');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) {
    return <Spin style={{ display: 'block', margin: '80px auto' }} />;
  }
  if (!row) {
    return <Card>监控不存在</Card>;
  }

  return (
    <Card
      title={row.title || '监控详情'}
      extra={
        <Space>
          <Link to={`/jobs?monitorId=${row.id}`}>相关任务</Link>
          <Popconfirm
            title="确认删除该监控？"
            onConfirm={async () => {
              try {
                await deleteMonitor(row.id);
                message.success('已删除');
                navigate('/monitors', { replace: true });
              } catch (e) {
                message.error(e instanceof ApiError ? e.message : '删除失败');
              }
            }}
          >
            <Button danger>删除</Button>
          </Popconfirm>
        </Space>
      }
    >
      <Descriptions column={1} bordered size="small">
        <Descriptions.Item label="ID">{row.id}</Descriptions.Item>
        <Descriptions.Item label="所属用户">
          {row.owner.email} ({row.owner.username})
        </Descriptions.Item>
        <Descriptions.Item label="话题">{row.topicPrompt || '—'}</Descriptions.Item>
        <Descriptions.Item label="描述">{row.description || '—'}</Descriptions.Item>
        <Descriptions.Item label="快照状态">
          <Tag>{row.snapshotStatus}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="快照计算时间">{formatDateTime(row.snapshotComputedAt)}</Descriptions.Item>
        <Descriptions.Item label="最低余弦">{row.minCosine}</Descriptions.Item>
        <Descriptions.Item label="信源数">{row.sourceCount}</Descriptions.Item>
        <Descriptions.Item label="关键词">{row.keywords.join('、') || '—'}</Descriptions.Item>
        <Descriptions.Item label="实体">{row.entities.join('、') || '—'}</Descriptions.Item>
        <Descriptions.Item label="创建时间">{formatDateTime(row.createdAt)}</Descriptions.Item>
        <Descriptions.Item label="更新时间">{formatDateTime(row.updatedAt)}</Descriptions.Item>
      </Descriptions>
    </Card>
  );
}
