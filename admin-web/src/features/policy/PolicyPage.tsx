import { useEffect, useState } from 'react';
import { ProForm, ProFormDigit } from '@ant-design/pro-components';
import { Card, Modal, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { getPolicy, updatePolicy } from '@/features/policy/api';
import type { AggregationPolicy } from '@/shared/types';
import { ApiError } from '@/shared/api/http';

export function PolicyPage() {
  const { t } = useTranslation();
  const [initial, setInitial] = useState<AggregationPolicy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPolicy()
      .then(setInitial)
      .catch((e) => message.error(e instanceof ApiError ? e.message : t('common.loadFailed')))
      .finally(() => setLoading(false));
  }, [t]);

  return (
    <Card title={t('policy.title')} loading={loading}>
      {initial ? (
        <ProForm<AggregationPolicy>
          initialValues={initial}
          submitter={{
            searchConfig: { submitText: t('common.save') },
            resetButtonProps: { style: { display: 'none' } },
          }}
          onFinish={async (values) => {
            return new Promise((resolve, reject) => {
              Modal.confirm({
                title: t('policy.confirmSave'),
                onOk: async () => {
                  try {
                    const next = await updatePolicy(values);
                    setInitial(next);
                    message.success(t('common.saved'));
                    resolve(true);
                  } catch (e) {
                    message.error(e instanceof ApiError ? e.message : t('common.saveFailed'));
                    reject(e);
                  }
                },
                onCancel: () => resolve(false),
              });
            });
          }}
        >
          <ProFormDigit
            name="lookbackDays"
            label={t('policy.lookbackDays')}
            min={1}
            max={30}
            fieldProps={{ precision: 0 }}
            rules={[{ required: true }]}
          />
          <ProFormDigit
            name="maxPairHours"
            label={t('policy.maxPairHours')}
            min={1}
            max={168}
            fieldProps={{ precision: 0 }}
            rules={[{ required: true }]}
          />
          <ProFormDigit
            name="simTitle"
            label={t('policy.simTitle')}
            min={0.5}
            max={0.999}
            fieldProps={{ step: 0.01 }}
            rules={[{ required: true }]}
          />
        </ProForm>
      ) : null}
    </Card>
  );
}
