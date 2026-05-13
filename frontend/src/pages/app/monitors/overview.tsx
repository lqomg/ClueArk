import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  BarChart2,
  CalendarDays,
  Clock,
  Flame,
  Hash,
  LayoutDashboard,
  Layers,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { createMonitor, getMonitor, getMonitorIntelligence, listMonitorsOverview } from '@/api/monitors';
import type { Monitor, MonitorIntelligence, MonitorOverviewCard } from '@/types/models';
import { useAppTopBar } from '@/components/layout/AppTopBar';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatClueMetaTime, normalizeUserTimeZone, relTimeIso } from '@/lib/datetime';
import { useAuthStore } from '@/stores/authStore';

const overviewSubtitle =
  '全局话题更新摘要与趋势分析。由 AI 提取关键线索与脉络。';

/** 仅支持 `**加粗**`，其它内容原样输出，避免 HTML 注入 */
function renderBriefParagraph(text: string, key: number): ReactNode {
  const nodes: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      nodes.push(<span key={`t-${key}-${i++}`}>{text.slice(last, m.index)}</span>);
    }
    nodes.push(
      <strong key={`b-${key}-${i++}`} className="font-semibold text-slate-200">
        {m[1]}
      </strong>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    nodes.push(<span key={`t-${key}-${i++}`}>{text.slice(last)}</span>);
  }
  return (
    <p key={key} className="[overflow-wrap:anywhere]">
      {nodes.length > 0 ? nodes : text}
    </p>
  );
}

function formatTrendLabel(isoDate: string) {
  const p = isoDate.split('-');
  if (p.length !== 3) return isoDate;
  return `${Number(p[1])}/${Number(p[2])}`;
}

function MonitorTopicCreateBar({
  topicDraft,
  setTopicDraft,
  onSubmit,
  creating,
  inputRef,
  inputId,
  outerClassName,
}: {
  topicDraft: string;
  setTopicDraft: (v: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  creating: boolean;
  inputRef?: Ref<HTMLInputElement>;
  inputId?: string;
  outerClassName?: string;
}) {
  return (
    <div className={cn('shrink-0 border-t border-ark-border bg-ark-bg px-3 pb-4 pt-3 md:px-5 md:pb-5 md:pt-4', outerClassName)}>
      <form
        onSubmit={onSubmit}
        className="mx-auto flex max-w-3xl items-center gap-2 rounded-full border border-white/[0.08] bg-ark-surface/85 p-1.5 pl-2 shadow-lg shadow-black/30 ring-1 ring-white/[0.05] backdrop-blur-md sm:gap-3 sm:p-2 sm:pl-2.5"
      >
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-ark-accent ring-1 ring-white/[0.08] sm:size-10"
          aria-hidden
        >
          <Sparkles className="size-[1.05rem] sm:size-[1.15rem]" strokeWidth={2} />
        </div>
        <input
          ref={inputRef}
          id={inputId}
          value={topicDraft}
          onChange={(e) => setTopicDraft(e.target.value)}
          placeholder="输入你想持续监控的方向，例如：大模型在医疗影像辅助诊断中的落地与监管…"
          className="min-h-10 min-w-0 flex-1 border-0 bg-transparent px-1 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-0"
        />
        <Button
          type="submit"
          variant="primary"
          disabled={creating}
          className="min-h-9 shrink-0 rounded-full px-5 py-2 text-sm font-bold shadow-md shadow-ark-accent/25 sm:min-h-10 sm:px-6"
        >
          {creating ? '创建中…' : '创建监控'}
        </Button>
      </form>
    </div>
  );
}

function TrendSpark({ counts, className }: { counts: number[]; className?: string }) {
  const w = 76;
  const h = 22;
  const n = counts.length;
  if (n === 0) {
    return <span className={cn('inline-block shrink-0', className)} style={{ width: w, height: h }} aria-hidden />;
  }
  const max = Math.max(1, ...counts);
  const step = n <= 1 ? 0 : w / (n - 1);
  const pts = counts
    .map((c, i) => {
      const x = n <= 1 ? w / 2 : i * step;
      const y = h - 2 - (c / max) * (h - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg
      className={cn('shrink-0 text-ark-accent', className)}
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts}
        opacity={0.88}
      />
    </svg>
  );
}

export function MonitorOverviewPage() {
  const viewerTz = useAuthStore((s) => normalizeUserTimeZone(s.user?.timeZone));
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<Monitor[] | null>(null);
  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [intel, setIntel] = useState<MonitorIntelligence | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topicDraft, setTopicDraft] = useState('');
  const [creating, setCreating] = useState(false);
  const [cardById, setCardById] = useState<Record<string, MonitorOverviewCard>>({});
  const topicInputRef = useRef<HTMLInputElement | null>(null);

  const loadRows = useCallback(async () => {
    setLoadingList(true);
    setError(null);
    try {
      const { monitors, cards } = await listMonitorsOverview('?recentHours=720');
      setRows(monitors);
      setCardById(Object.fromEntries(cards.map((c) => [c.monitorId, c])));
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
      setRows(null);
      setCardById({});
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const sorted = useMemo(() => {
    if (!rows?.length) return [];
    return [...rows].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }, [rows]);

  const paramMonitor = searchParams.get('monitor');
  const currentId = useMemo(() => {
    if (!sorted.length) return null;
    if (paramMonitor && sorted.some((m) => m.id === paramMonitor)) return paramMonitor;
    return sorted[0].id;
  }, [sorted, paramMonitor]);

  useEffect(() => {
    if (!currentId || !sorted.length) return;
    if (paramMonitor !== currentId) {
      setSearchParams({ monitor: currentId }, { replace: true });
    }
  }, [currentId, paramMonitor, setSearchParams, sorted.length]);

  useEffect(() => {
    if (!currentId) {
      setMonitor(null);
      setIntel(null);
      return;
    }
    let cancelled = false;
    setLoadingDetail(true);
    void (async () => {
      try {
        const [m, i] = await Promise.all([
          getMonitor(currentId),
          getMonitorIntelligence(currentId, '?recentHours=720&briefProfile=weekly_rolling'),
        ]);
        if (!cancelled) {
          setMonitor(m);
          setIntel(i);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : '加载监控详情失败');
          setMonitor(null);
          setIntel(null);
        }
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentId]);

  function selectMonitor(id: string) {
    setSearchParams({ monitor: id }, { replace: true });
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const t = topicDraft.trim();
    if (!t) {
      setError('请填写监控方向');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const m = await createMonitor({ topic: t });
      setTopicDraft('');
      await loadRows();
      setSearchParams({ monitor: m.id }, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setCreating(false);
    }
  }

  useAppTopBar(
    () => (
      <div className="flex min-w-0 w-full items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1 md:flex-row md:items-center md:gap-4">
          <h1 className="flex shrink-0 items-center gap-2 text-lg font-semibold tracking-tight text-ark-text">
            <Sparkles className="size-5 shrink-0 text-ark-accent" strokeWidth={2} aria-hidden />
            监控总览
          </h1>
          <p className="min-w-0 text-xs leading-snug text-slate-500 md:max-w-2xl md:border-l md:border-ark-border md:pl-4 md:text-sm">
            {overviewSubtitle}
          </p>
        </div>
        <Link
          to="/app/monitors/manage"
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-ark-border bg-ark-surface px-3 py-1.5 text-xs font-medium text-ark-text shadow-sm transition-colors hover:bg-white/[0.04]"
        >
          <LayoutDashboard size={14} strokeWidth={2} />
          监控管理
        </Link>
      </div>
    ),
    [],
  );

  const chartData = useMemo(
    () => (intel?.trend ?? []).map((d) => ({ ...d, label: formatTrendLabel(d.date) })),
    [intel?.trend],
  );

  if (loadingList) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
        加载中…
      </div>
    );
  }

  if (!sorted.length) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {error ? <p className="shrink-0 text-sm text-red-400">{error}</p> : null}
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-y-auto overscroll-contain px-4 py-8 text-center">
          <p className="text-slate-400">暂无监控话题</p>
          <p className="max-w-md text-sm text-slate-500">
            在底部输入你想持续关注的方向，系统将自动生成监控。
          </p>
        </div>
        <MonitorTopicCreateBar
          topicDraft={topicDraft}
          setTopicDraft={setTopicDraft}
          onSubmit={(e) => void onCreate(e)}
          creating={creating}
          outerClassName="px-0"
        />
      </div>
    );
  }

  const topicList = (
    <aside className="flex min-h-0 w-full shrink-0 flex-col border-t border-ark-border pt-4 lg:min-h-0 lg:w-80 lg:max-h-full lg:shrink-0 lg:overflow-hidden lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0 xl:w-[22rem]">
      <div className="shrink-0">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">监控列表</h2>
        <p className="mt-0.5 text-[10px] text-slate-600">共 {sorted.length} 个</p>
      </div>
      <ul
        className="mt-3 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain lg:mt-4 lg:pr-1"
        aria-label="监控列表"
      >
        {sorted.map((m) => {
          const active = m.id === currentId;
          const card = cardById[m.id];
          const counts = (card?.trend ?? []).map((p) => p.count);
          const heat = card?.heatIndex;
          const n24 = card?.newLast24h ?? 0;
          const lastAt = card?.lastActivityAt ?? m.updatedAt;
          return (
            <li key={m.id}>
              <button
                type="button"
                aria-current={active ? 'true' : undefined}
                onClick={() => selectMonitor(m.id)}
                className={cn(
                  'relative flex w-full flex-col gap-2 rounded-xl border px-3 py-3 text-left transition',
                  active
                    ? 'border-ark-accent/45 bg-ark-accent/[0.09] shadow-sm shadow-ark-accent/10'
                    : 'border-ark-border bg-ark-surface/50 hover:border-ark-accent/25 hover:bg-ark-surface/80',
                )}
              >
                <div className="pointer-events-none absolute right-2.5 top-2.5 flex flex-col items-end gap-0.5">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Heat</span>
                  <span className="text-base font-bold tabular-nums leading-none text-ark-accent">
                    {heat != null ? heat.toFixed(1) : '—'}
                  </span>
                </div>
                <span
                  className={cn(
                    'line-clamp-2 pr-14 text-sm font-medium leading-snug',
                    active ? 'text-white' : 'text-slate-200',
                  )}
                >
                  {m.title}
                </span>
                <div className="flex items-center justify-between gap-2 border-t border-white/[0.06] pt-2">
                  <span className="min-w-0 truncate text-[10px] text-slate-500">{relTimeIso(lastAt)}更新</span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <TrendSpark counts={counts} />
                    <span className="whitespace-nowrap text-[10px] font-mono font-semibold tabular-nums text-ark-accent/90">
                      +{n24}
                      <span className="font-sans font-normal text-slate-600"> (24h)</span>
                    </span>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {error ? <p className="shrink-0 text-sm text-red-400">{error}</p> : null}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain lg:flex-row lg:items-stretch lg:gap-6 lg:overflow-hidden">
        <div className="flex min-h-0 min-w-0 shrink-0 flex-col gap-4 lg:flex-1 lg:shrink lg:overflow-y-auto">
          {loadingDetail || !monitor || !intel ? (
            <div className="flex flex-1 items-center justify-center rounded-xl mb-2 bg-ark-surface/30 py-24 text-sm text-slate-500">
              加载中…
            </div>
          ) : (
            <section className="overflow-y-auto  bg-ark-surface/40 rounded-xl flex-1 mb-2">
              <div className="border-b border-white/[0.06] bg-gradient-to-r from-ark-accent/10 to-transparent p-3 md:p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <span className="inline-flex items-center gap-1 rounded-md border border-ark-accent/35 bg-ark-accent/10 px-2 py-0.5 font-semibold uppercase tracking-wide text-ark-accent">
                        <Sparkles className="size-3 shrink-0" strokeWidth={2} aria-hidden />
                        AI 监控中
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3.5 shrink-0 text-slate-500" strokeWidth={2} aria-hidden />
                        最新更新于 {relTimeIso(intel.lastActivityAt)}
                      </span>
                    </div>
                    <h2 className="text-xl font-semibold tracking-tight text-white md:text-2xl">{monitor.title}</h2>
                    <p className="max-w-3xl min-h-[2.875rem] break-words text-sm leading-relaxed text-slate-400 line-clamp-2">
                      {monitor.description}
                    </p>
                    {(monitor.keywords?.length || monitor.entities?.length) ? (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {(monitor.entities ?? []).slice(0, 8).map((x) => (
                          <span key={`e-${x}`} className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] text-slate-400">
                            {x}
                          </span>
                        ))}
                        {(monitor.keywords ?? []).slice(0, 8).map((x) => (
                          <span key={`k-${x}`} className="rounded-md border border-ark-border px-2 py-0.5 text-[10px] text-slate-500">
                            {x}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Heat Index</span>
                    <div className="flex h-16 w-16 flex-col items-center justify-center rounded-xl border border-ark-border bg-ark-bg/80 shadow-inner">
                      <span className="text-2xl font-bold tabular-nums text-ark-accent">
                        {intel.heatIndex != null ? intel.heatIndex.toFixed(1) : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid min-h-0 divide-y divide-ark-border lg:grid-cols-3 lg:divide-x lg:divide-y-0 lg:items-stretch">
                <div className="flex min-h-0 flex-col p-3 md:p-4 lg:h-full lg:min-h-0">
                  <h3 className="mb-4 flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <span className="inline-flex items-center gap-2">
                      <Target className="size-4 shrink-0 text-ark-accent" strokeWidth={2} aria-hidden />
                      本周研判摘要
                    </span>
                    {intel.briefMeta?.windowLabel ? (
                      <span className="max-w-full font-normal normal-case tracking-normal text-[10px] text-slate-600">
                        {intel.briefMeta.windowLabel}
                      </span>
                    ) : null}
                  </h3>
                  <div className="min-h-0 space-y-3 text-xs leading-relaxed text-slate-400 [overflow-wrap:anywhere] lg:flex-1 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain [scrollbar-width:thin]">
                    {intel.weeklyBrief.map((p, i) => renderBriefParagraph(p, i))}
                  </div>
                  <div className="shrink-0  pt-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-lg border border-ark-border bg-ark-bg/50 p-2 text-center">
                        <div className="text-[10px] font-semibold uppercase text-slate-600">24H 新增</div>
                        <div className="text-lg font-mono font-semibold tabular-nums text-white">+{intel.metrics.newLast24h}</div>
                      </div>
                      <div className="rounded-lg border border-ark-border bg-ark-bg/50 p-2 text-center">
                        <div className="text-[10px] font-semibold uppercase text-slate-600">窗内累计</div>
                        <div className="text-lg font-mono font-semibold tabular-nums text-white">{intel.metrics.totalInWindow}</div>
                      </div>
                      <div className="rounded-lg border border-ark-border bg-ark-bg/50 p-2 text-center">
                        <div className="text-[10px] font-semibold uppercase text-slate-600">活跃信源</div>
                        <div className="text-lg font-mono font-semibold tabular-nums text-white">{intel.metrics.boundSourceCount}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex min-h-0 flex-col p-3 md:p-4 lg:h-full lg:min-h-0">
                  <div className="mb-4 flex shrink-0 items-center justify-between gap-2">
                    <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <TrendingUp className="size-4 shrink-0 text-ark-accent" strokeWidth={2} aria-hidden />
                      趋势与热度分析
                    </h3>
                    <span className="inline-flex items-center gap-1 rounded border border-ark-border bg-ark-bg/60 px-2 py-0.5 text-[10px] text-slate-500">
                      <CalendarDays className="size-3 shrink-0 text-slate-500" strokeWidth={2} aria-hidden />
                      近 7 日
                    </span>
                  </div>
                  <div className="h-44 w-full shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip
                          cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 8,
                            fontSize: 11,
                          }}
                          labelStyle={{ color: '#94a3b8' }}
                        />
                        <Bar dataKey="count" fill="rgb(0, 242, 255)" fillOpacity={0.75} radius={[4, 4, 0, 0]} maxBarSize={28} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2  pt-3">
                    <h4 className="flex shrink-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                      <Hash className="size-3 shrink-0 text-slate-500" strokeWidth={2} aria-hidden />
                      高频实体 / 关键词
                    </h4>
                    <div className="max-h-28 min-h-0 overflow-y-auto overscroll-contain [scrollbar-width:thin]">
                      <div className="flex flex-wrap gap-1.5">
                        {intel.chartKeywords.slice(0, 8).map((k, idx) => {
                          const showFlame = idx === 0 && k.count >= 2;
                          return (
                            <span
                              key={k.name}
                              className="inline-flex items-center gap-1 rounded-md border border-ark-border bg-ark-bg/50 px-2 py-0.5 text-[10px] text-slate-400"
                            >
                              {showFlame ? (
                                <Flame className="size-3 shrink-0 text-amber-400/90" strokeWidth={2} aria-hidden />
                              ) : null}
                              {k.name}
                              <span className="tabular-nums text-slate-600">{k.count}</span>
                            </span>
                          );
                        })}
                        {intel.chartKeywords.length === 0 ? <span className="text-[10px] text-slate-600">暂无标签数据</span> : null}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex min-h-0 flex-col bg-ark-bg/30 p-3 md:p-4 lg:h-full lg:min-h-0">
                  <div className="mb-3 flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <Activity className="size-4 shrink-0 text-ark-accent" strokeWidth={2} aria-hidden />
                      最新关键线索
                    </h3>
                    <Link
                      to={`/app/monitors/${monitor.id}/timeline`}
                      className="flex shrink-0 items-center gap-0.5 self-start text-[11px] text-slate-500 transition hover:text-ark-accent sm:self-auto"
                    >
                      查看时间线
                      <ArrowRight className="size-3" aria-hidden />
                    </Link>
                  </div>
                  {intel.latestItems.length === 0 ? (
                    <p className="text-xs text-slate-600">暂无匹配条目，请稍候采集或调整信源与相似度阈值。</p>
                  ) : (
                    <ul
                      className="m-0 flex min-h-0 list-none flex-col p-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain [scrollbar-width:thin]"
                      role="list"
                    >
                      {intel.latestItems.slice(0, 3).map((item, index, arr) => {
                        const timePart =
                          item.publishedAt != null && item.publishedAt !== ''
                            ? formatClueMetaTime(item.publishedAt, viewerTz)
                            : null;
                        const metaLead =  item.sourceDisplayName;
                        const metaLine = timePart ? `${metaLead} · ${timePart}` : metaLead;
                        const showStem = index < arr.length - 1;
                        return (
                          <li key={item.id} className="flex min-w-0 gap-3">
                            <div className="flex w-3 shrink-0 flex-col items-center pt-1.5" aria-hidden>
                              <span className="size-[] shrink-0 rounded-full bg-ark-accent shadow-[0_0_0_2px_rgba(15,23,42,0.9)] ring-1 ring-ark-accent/35" />
                              {showStem ? (
                                <span className="mt-2 w-px flex-1 min-h-[2.75rem] bg-gradient-to-b from-ark-accent/10 to-ark-accent/[0.08]" />
                              ) : null}
                            </div>
                            <div className={cn('min-w-0 flex-1', showStem ? 'pb-5' : 'pb-0')}>
                              <a
                                href={item.link}
                                target="_blank"
                                rel="noreferrer"
                                className="group block min-w-0 rounded-lg py-0.5 transition [overflow-wrap:anywhere]"
                              >
                                <span className="line-clamp-3 text-[13px] font-semibold leading-snug text-white group-hover:text-ark-accent">
                                  {item.title}
                                </span>
                                <span className="mt-1.5 block text-[11px] leading-relaxed text-slate-500">{metaLine}</span>
                              </a>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>

        {topicList}
      </div>

      <MonitorTopicCreateBar
        topicDraft={topicDraft}
        setTopicDraft={setTopicDraft}
        onSubmit={(e) => void onCreate(e)}
        creating={creating}
        inputRef={topicInputRef}
        inputId="monitor-overview-topic"
        outerClassName="px-0 pb-2 pt-2 md:pt-3 md:pb-4"
      />
    </div>
  );
}
