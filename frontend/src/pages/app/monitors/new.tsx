import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createMonitor } from '@/api/monitors';
import { Button } from '@/components/ui';

export function MonitorNewPage() {
  const navigate = useNavigate();
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const d = description.trim();
    if (!d) {
      setError('请填写话题描述');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const m = await createMonitor({ description: d });
      navigate(`/app/monitors/${m.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">新建监控</h1>
        <p className="mt-2 text-xs text-slate-500">
          仅需描述你关心的方向；标题与信源由模型推荐。需服务端已配置向量与 LLM，否则无法创建。
        </p>
      </div>

      <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
        <div>
          <label htmlFor="monitor-desc" className="mb-1.5 block text-xs font-medium text-slate-400">
            话题描述
          </label>
          <textarea
            id="monitor-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={8}
            placeholder="例如：大模型在医疗影像辅助诊断中的落地与监管动态…"
            className="w-full resize-y rounded-lg border border-ark-border bg-ark-surface/80 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-ark-accent/50 focus:outline-none focus:ring-1 focus:ring-ark-accent/30"
          />
        </div>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? '创建中…' : '创建并进入时间线'}
          </Button>
          <Button type="button" variant="outline" disabled={loading} onClick={() => navigate(-1)}>
            返回
          </Button>
        </div>
      </form>
    </div>
  );
}
