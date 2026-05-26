import { useRef, useState } from 'react';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { Button, Drawer, Form, Modal, Tag, message } from 'antd';
import {
  createSource,
  deleteSource,
  exportSourcesJson,
  getSource,
  importSourcesJson,
  listSources,
  updateSource,
} from '@/features/sources/api';
import { buildSourcePayload, defaultCreateFormValues, sourceToFormValues, SourceFormFields } from '@/features/sources/SourceFormFields';
import { formatDateTime } from '@/shared/utils';
import type { AdminSource } from '@/shared/types';
import { ApiError } from '@/shared/api/http';

export function SourcesPage() {
  const actionRef = useRef<ActionType>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');

  async function openCreate() {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue(defaultCreateFormValues());
    setDrawerOpen(true);
  }

  async function openEdit(id: string) {
    try {
      const source = await getSource(id);
      setEditingId(id);
      form.setFieldsValue(sourceToFormValues(source));
      setDrawerOpen(true);
    } catch (e) {
      message.error(e instanceof ApiError ? e.message : '加载失败');
    }
  }

  const columns: ProColumns<AdminSource>[] = [
    { title: '名称', dataIndex: 'displayName', ellipsis: true },
    { title: '类型', dataIndex: 'kind', width: 100 },
    {
      title: '官方',
      dataIndex: 'isOfficial',
      width: 80,
      render: (_, row) => (row.isOfficial ? <Tag color="blue">是</Tag> : <Tag>否</Tag>),
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 80,
      render: (_, row) => (row.enabled ? <Tag color="success">启用</Tag> : <Tag>禁用</Tag>),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      width: 180,
      search: false,
      render: (_, row) => formatDateTime(row.updatedAt),
    },
    {
      title: '操作',
      valueType: 'option',
      width: 200,
      render: (_, row) => [
        <Button key="edit" type="link" size="small" onClick={() => openEdit(row.id)}>
          编辑
        </Button>,
        <Button
          key="toggle"
          type="link"
          size="small"
          onClick={async () => {
            try {
              await updateSource(row.id, { enabled: !row.enabled });
              message.success('已更新');
              actionRef.current?.reload();
            } catch (e) {
              message.error(e instanceof ApiError ? e.message : '更新失败');
            }
          }}
        >
          {row.enabled ? '禁用' : '启用'}
        </Button>,
        <Button
          key="delete"
          type="link"
          danger
          size="small"
          onClick={() => {
            Modal.confirm({
              title: '确认删除该信源？',
              onOk: async () => {
                await deleteSource(row.id);
                message.success('已删除');
                actionRef.current?.reload();
              },
            });
          }}
        >
          删除
        </Button>,
      ],
    },
  ];

  return (
    <>
      <ProTable<AdminSource>
        headerTitle="信源管理"
        actionRef={actionRef}
        rowKey="id"
        search={false}
        columns={columns}
        toolBarRender={() => [
          <Button key="export" onClick={async () => {
            try {
              const data = await exportSourcesJson();
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'sources-export.json';
              a.click();
              URL.revokeObjectURL(url);
            } catch (e) {
              message.error(e instanceof ApiError ? e.message : '导出失败');
            }
          }}>
            导出 JSON
          </Button>,
          <Button key="import" onClick={() => setImportOpen(true)}>
            导入 JSON
          </Button>,
          <Button key="create" type="primary" onClick={openCreate}>
            新建信源
          </Button>,
        ]}
        request={async () => {
          const items = await listSources(true);
          return { data: items, total: items.length, success: true };
        }}
        pagination={{ pageSize: 20 }}
      />

      <Drawer
        title={editingId ? '编辑信源' : '新建信源'}
        width={640}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose
        extra={
          <Button type="primary" loading={saving} onClick={() => form.submit()}>
            保存
          </Button>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={async (values) => {
            setSaving(true);
            try {
              const payload = buildSourcePayload(values, !editingId);
              if (editingId) {
                await updateSource(editingId, payload);
              } else {
                await createSource(payload);
              }
              message.success('已保存');
              setDrawerOpen(false);
              actionRef.current?.reload();
            } catch (e) {
              message.error(e instanceof ApiError ? e.message : '保存失败');
            } finally {
              setSaving(false);
            }
          }}
        >
          <SourceFormFields />
        </Form>
      </Drawer>

      <Modal
        title="导入信源 JSON"
        open={importOpen}
        onCancel={() => setImportOpen(false)}
        onOk={async () => {
          try {
            const body = JSON.parse(importText);
            await importSourcesJson(body);
            message.success('导入完成');
            setImportOpen(false);
            setImportText('');
            actionRef.current?.reload();
          } catch (e) {
            message.error(e instanceof ApiError ? e.message : '导入失败');
          }
        }}
      >
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          rows={12}
          style={{ width: '100%', fontFamily: 'monospace' }}
          placeholder='粘贴 sources-export.json 内容'
        />
      </Modal>
    </>
  );
}
