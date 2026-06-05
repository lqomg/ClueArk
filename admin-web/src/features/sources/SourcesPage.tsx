import { useRef, useState } from 'react';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { Button, Drawer, Form, Modal, Tag, message } from 'antd';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      message.error(e instanceof ApiError ? e.message : t('common.loadFailed'));
    }
  }

  const columns: ProColumns<AdminSource>[] = [
    { title: t('sources.name'), dataIndex: 'displayName', ellipsis: true },
    { title: t('sources.kind'), dataIndex: 'kind', width: 100 },
    {
      title: t('sources.official'),
      dataIndex: 'isOfficial',
      width: 80,
      render: (_, row) =>
        row.isOfficial ? <Tag color="blue">{t('common.yes')}</Tag> : <Tag>{t('common.no')}</Tag>,
    },
    {
      title: t('sources.status'),
      dataIndex: 'enabled',
      width: 80,
      render: (_, row) =>
        row.enabled ? <Tag color="success">{t('common.enabled')}</Tag> : <Tag>{t('common.disabled')}</Tag>,
    },
    {
      title: t('sources.updatedAt'),
      dataIndex: 'updatedAt',
      width: 180,
      search: false,
      render: (_, row) => formatDateTime(row.updatedAt),
    },
    {
      title: t('common.actions'),
      valueType: 'option',
      width: 200,
      render: (_, row) => [
        <Button key="edit" type="link" size="small" onClick={() => openEdit(row.id)}>
          {t('common.edit')}
        </Button>,
        <Button
          key="toggle"
          type="link"
          size="small"
          onClick={async () => {
            try {
              await updateSource(row.id, { enabled: !row.enabled });
              message.success(t('common.updated'));
              actionRef.current?.reload();
            } catch (e) {
              message.error(e instanceof ApiError ? e.message : t('common.updateFailed'));
            }
          }}
        >
          {row.enabled ? t('sources.disable') : t('sources.enable')}
        </Button>,
        <Button
          key="delete"
          type="link"
          danger
          size="small"
          onClick={() => {
            Modal.confirm({
              title: t('sources.confirmDelete'),
              onOk: async () => {
                await deleteSource(row.id);
                message.success(t('common.deleted'));
                actionRef.current?.reload();
              },
            });
          }}
        >
          {t('common.delete')}
        </Button>,
      ],
    },
  ];

  return (
    <>
      <ProTable<AdminSource>
        headerTitle={t('sources.title')}
        actionRef={actionRef}
        rowKey="id"
        search={false}
        columns={columns}
        toolBarRender={() => [
          <Button
            key="export"
            onClick={async () => {
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
                message.error(e instanceof ApiError ? e.message : t('common.exportFailed'));
              }
            }}
          >
            {t('sources.exportJson')}
          </Button>,
          <Button key="import" onClick={() => setImportOpen(true)}>
            {t('sources.importJson')}
          </Button>,
          <Button key="create" type="primary" onClick={openCreate}>
            {t('sources.create')}
          </Button>,
        ]}
        request={async () => {
          const items = await listSources(true);
          return { data: items, total: items.length, success: true };
        }}
        pagination={{ pageSize: 20 }}
      />

      <Drawer
        title={editingId ? t('sources.editTitle') : t('sources.createTitle')}
        width={640}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose
        extra={
          <Button type="primary" loading={saving} onClick={() => form.submit()}>
            {t('common.save')}
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
              message.success(t('common.saved'));
              setDrawerOpen(false);
              actionRef.current?.reload();
            } catch (e) {
              message.error(e instanceof ApiError ? e.message : t('common.saveFailed'));
            } finally {
              setSaving(false);
            }
          }}
        >
          <SourceFormFields />
        </Form>
      </Drawer>

      <Modal
        title={t('sources.importTitle')}
        open={importOpen}
        onCancel={() => setImportOpen(false)}
        onOk={async () => {
          try {
            const body = JSON.parse(importText);
            await importSourcesJson(body);
            message.success(t('common.imported'));
            setImportOpen(false);
            setImportText('');
            actionRef.current?.reload();
          } catch (e) {
            message.error(e instanceof ApiError ? e.message : t('common.importFailed'));
          }
        }}
      >
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          rows={12}
          style={{ width: '100%', fontFamily: 'monospace' }}
          placeholder={t('sources.importPlaceholder')}
        />
      </Modal>
    </>
  );
}
