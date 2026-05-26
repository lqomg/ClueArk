import { useEffect, useState } from 'react';
import { ProForm, ProFormDigit } from '@ant-design/pro-components';
import { Card, Modal, message } from 'antd';
import { getPolicy, updatePolicy } from '@/features/policy/api';
import type { AggregationPolicy } from '@/shared/types';
import { ApiError } from '@/shared/api/http';

export function PolicyPage() {
  const [initial, setInitial] = useState<AggregationPolicy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPolicy()
      .then(setInitial)
      .catch((e) => message.error(e instanceof ApiError ? e.message : '加载失败'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card title="聚合策略" loading={loading}>
      {initial ? (
        <ProForm<AggregationPolicy>
          initialValues={initial}
          submitter={{
            searchConfig: { submitText: '保存' },
            resetButtonProps: { style: { display: 'none' } },
          }}
          onFinish={async (values) => {
            return new Promise((resolve, reject) => {
              Modal.confirm({
                title: '确认保存聚合策略？',
                onOk: async () => {
                  try {
                    const next = await updatePolicy(values);
                    setInitial(next);
                    message.success('已保存');
                    resolve(true);
                  } catch (e) {
                    message.error(e instanceof ApiError ? e.message : '保存失败');
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
            label="回看天数"
            min={1}
            max={30}
            fieldProps={{ precision: 0 }}
            rules={[{ required: true }]}
          />
          <ProFormDigit
            name="maxPairHours"
            label="最大配对间隔（小时）"
            min={1}
            max={168}
            fieldProps={{ precision: 0 }}
            rules={[{ required: true }]}
          />
          <ProFormDigit
            name="simTitle"
            label="标题相似度阈值"
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
