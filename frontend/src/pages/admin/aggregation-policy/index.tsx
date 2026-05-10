import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { getAggregationPolicy, patchAggregationPolicy } from '@/api/admin/aggregation-policy';
import { Button } from '@/components/ui';
import { useDemoViewer } from '@/hooks/useDemoViewer';
import type { AggregationPolicyDto } from './types';

function FormField({
  title,
  description,
  range,
  children,
}: {
  title: string;
  description: string;
  /** 数值类字段的合法区间；开关类可省略 */
  range?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div>
        <div className="text-sm font-semibold text-ark-text">{title}</div>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{description}</p>
        {range ? <p className="mt-1 font-mono text-[11px] text-slate-600">允许范围：{range}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function AdminAggregationPolicyPage() {
  const isDemoViewer = useDemoViewer();
  const [form, setForm] = useState<AggregationPolicyDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAggregationPolicy();
      setForm(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
      setForm(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form || isDemoViewer) return;
    setSaving(true);
    setError(null);
    setHint(null);
    try {
      const { persisted: _p, ...body } = form;
      const res = await patchAggregationPolicy(body);
      setForm(res);
      setHint('已保存，聚类任务将按新策略生效。');
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !form) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white">聚合策略</h2>
        <p className="text-sm text-slate-500">{loading ? '加载中…' : error ?? '无数据'}</p>
        {error ? (
          <Button type="button" variant="accent" size="md" onClick={() => void load()}>
            重试
          </Button>
        ) : null}
      </div>
    );
  }

  const fieldCls =
    'w-full max-w-md rounded-lg border border-ark-border bg-ark-bg px-3 py-2 text-sm text-ark-text outline-none focus:border-ark-accent/30';

  return (
    <div className="mx-auto max-w-7xl ">
      <form
        onSubmit={onSave}
        className="space-y-8 rounded-2xl border border-ark-border bg-ark-surface/40 p-5 sm:p-6"
      >
        {isDemoViewer ? (
          <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            演示账号仅可查看当前策略；保存修改需管理员登录。
          </p>
        ) : null}
        <div className="grid gap-8 md:grid-cols-2 md:gap-x-10 md:gap-y-8">
          <FormField
            title="回溯天数"
            description="只把「入库时间」落在最近 N 天内的动态纳入本轮相似聚类。窗口越大，单次任务扫描的数据越多，耗时与负载越高。"
            range="整数 1～30（天）"
          >
            <input
              type="number"
              min={1}
              max={30}
              disabled={isDemoViewer}
              className={fieldCls}
              value={form.lookbackDays}
              onChange={(e) => setForm((f) => (f ? { ...f, lookbackDays: Number(e.target.value) } : f))}
            />
          </FormField>

          <FormField
            title="配对最大时间间隔"
            description="按时间排序后，仅比较发布时间（无则用入库时间）相差不超过该间隔的条目对。超过此间隔不再尝试合并，避免把相隔很久的报道硬并成同一簇。"
            range="整数 1～168（小时）"
          >
            <input
              type="number"
              min={1}
              max={168}
              disabled={isDemoViewer}
              className={fieldCls}
              value={form.maxPairHours}
              onChange={(e) => setForm((f) => (f ? { ...f, maxPairHours: Number(e.target.value) } : f))}
            />
          </FormField>

          <FormField
            title="标题相关度"
            description="标题相似度须达到该值才可能合并。1 表示完全相同，数值越高越严格、合并越少；过低容易误把不同事件并在一起。需与「全文阈值」同时满足。"
            range="0.5～0.999"
          >
            <input
              type="number"
              step="0.01"
              min={0.5}
              max={0.999}
              disabled={isDemoViewer}
              className={fieldCls}
              value={form.simTitle}
              onChange={(e) => setForm((f) => (f ? { ...f, simTitle: Number(e.target.value) } : f))}
            />
          </FormField>

          <FormField
            title="全文相关度"
            description="由标题与摘要拼接成全文后计算向量，相似度须达到该值才可能合并。通常略低于或与标题阈值接近，用于减少「标题像但正文无关」的误并。"
            range="0.5～0.999"
          >
            <input
              type="number"
              step="0.01"
              min={0.5}
              max={0.999}
              disabled={isDemoViewer}
              className={fieldCls}
              value={form.simFull}
              onChange={(e) => setForm((f) => (f ? { ...f, simFull: Number(e.target.value) } : f))}
            />
          </FormField>

          <FormField
            title="单次参与聚类最大条数"
            description="在回溯窗口内按入库时间从新到旧最多取多少条进入本轮算法。条目很多时只处理最新的若干条，用于控制单次任务耗时与内存。"
            range="整数 100～5000"
          >
            <input
              type="number"
              min={100}
              max={5000}
              disabled={isDemoViewer}
              className={fieldCls}
              value={form.maxItems}
              onChange={(e) => setForm((f) => (f ? { ...f, maxItems: Number(e.target.value) } : f))}
            />
          </FormField>

          <FormField
            title="Embedding 批量大小"
            description="为缺少向量的条目请求嵌入接口时，每批提交的条数。过大易触发限流或超时；部分云厂商接口要求较小批量（例如不超过 10）。"
            range="整数 1～2048"
          >
            <input
              type="number"
              min={1}
              max={2048}
              disabled={isDemoViewer}
              className={fieldCls}
              value={form.embeddingBatchSize}
              onChange={(e) => setForm((f) => (f ? { ...f, embeddingBatchSize: Number(e.target.value) } : f))}
            />
          </FormField>
        </div>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {hint ? <p className="text-sm text-ark-accent">{hint}</p> : null}

        <div className="flex flex-wrap gap-2 border-t border-ark-border/50 pt-4">
          <Button type="submit" variant="accent" size="md" disabled={saving || isDemoViewer}>
            {saving ? '保存中…' : '保存到数据库'}
          </Button>
          <Button type="button" variant="outline" size="md" onClick={() => void load()} disabled={saving}>
            重新加载
          </Button>
        </div>
      </form>
    </div>
  );
}
