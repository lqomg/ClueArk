import type { FormEvent, Ref } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';

export type MonitorTopicCreateBarProps = {
  topicDraft: string;
  setTopicDraft: (v: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  creating: boolean;
  inputRef?: Ref<HTMLInputElement>;
  inputId?: string;
  outerClassName?: string;
};

export function MonitorTopicCreateBar({
  topicDraft,
  setTopicDraft,
  onSubmit,
  creating,
  inputRef,
  inputId,
  outerClassName,
}: MonitorTopicCreateBarProps) {
  return (
    <div
      className={cn(
        'shrink-0 border-t border-ark-border bg-ark-bg px-3 pb-4 pt-3 md:px-5 md:pb-5 md:pt-4',
        outerClassName,
      )}
    >
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
