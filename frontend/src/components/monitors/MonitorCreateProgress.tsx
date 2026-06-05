import { Check, Loader2, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import {
  MONITOR_CREATE_STEPS,
  monitorCreateStepIndex,
  type MonitorCreateStepId,
} from '@/lib/monitorCreateFlow';
import type { MonitorCreateFlowState } from '@/hooks/useMonitorCreateFlow';

const STEP_I18N: Record<(typeof MONITOR_CREATE_STEPS)[number], string> = {
  understand: 'monitors.createProgress.stepUnderstand',
  describe: 'monitors.createProgress.stepDescribe',
  sources: 'monitors.createProgress.stepSources',
  embedding: 'monitors.createProgress.stepIndex',
  saving: 'monitors.createProgress.stepSave',
  snapshot: 'monitors.createProgress.stepSnapshot',
};

const RING_R = 34;
const ARC_R = 26;
const RING_C = 2 * Math.PI * RING_R;
const ARC_C = 2 * Math.PI * ARC_R;

function currentStepLabel(step: MonitorCreateStepId, t: (key: string) => string): string {
  if (step === 'done') return t('monitors.createProgress.done');
  if (step in STEP_I18N) return t(STEP_I18N[step as keyof typeof STEP_I18N]);
  return t('monitors.createProgress.title');
}

function CreateProgressOrb({ done, progress }: { done: boolean; progress: number }) {
  const arcLen = ARC_C * Math.min(1, Math.max(0, progress));

  return (
    <div className="relative size-[5.5rem]" aria-hidden>
      <div
        className={cn(
          'pointer-events-none absolute left-1/2 top-1/2 size-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ark-accent/25 blur-3xl',
          !done && 'monitor-create-glow',
        )}
      />

      {done ? (
        <span className="pointer-events-none absolute inset-2 animate-ping rounded-full border border-ark-accent/35 opacity-60" />
      ) : null}

      <svg
        className="absolute inset-0 size-full monitor-create-ring-spin"
        viewBox="0 0 80 80"
        fill="none"
      >
        <circle
          cx="40"
          cy="40"
          r={RING_R}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="1.5"
        />
        <circle
          cx="40"
          cy="40"
          r={RING_R}
          stroke="rgb(var(--ark-accent))"
          strokeWidth="1"
          strokeOpacity="0.2"
          strokeDasharray={`${RING_C * 0.12} ${RING_C * 0.08}`}
          strokeLinecap="round"
        />
      </svg>

      <svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 80 80" fill="none">
        <circle
          cx="40"
          cy="40"
          r={ARC_R}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="2.5"
        />
        <circle
          cx="40"
          cy="40"
          r={ARC_R}
          stroke="rgb(var(--ark-accent))"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={`${arcLen} ${ARC_C}`}
          className="transition-[stroke-dasharray] duration-700 ease-out"
          style={{
            filter: 'drop-shadow(0 0 6px rgba(0, 242, 255, 0.45))',
          }}
        />
      </svg>

      <div className="absolute inset-0 flex items-center justify-center">
        {done ? (
          <Check
            className="monitor-create-success-pop size-9 text-ark-accent"
            strokeWidth={2.25}
          />
        ) : (
          <Sparkles className="size-6 animate-pulse text-ark-accent/90" strokeWidth={2} />
        )}
      </div>
    </div>
  );
}

function StepDots({ currentStep, done }: { currentStep: MonitorCreateStepId; done: boolean }) {
  const activeIdx = done ? MONITOR_CREATE_STEPS.length : monitorCreateStepIndex(currentStep);

  return (
    <div className="flex items-center justify-center gap-1.5" aria-hidden>
      {MONITOR_CREATE_STEPS.map((id, i) => {
        const completed = done || i < activeIdx;
        const active = !done && i === activeIdx;
        return (
          <span
            key={id}
            className={cn(
              'rounded-full transition-all duration-500 ease-out',
              active
                ? 'h-1.5 w-5 bg-ark-accent shadow-[0_0_10px_rgba(0,242,255,0.55)]'
                : completed
                  ? 'size-1.5 bg-ark-accent/75'
                  : 'size-1.5 bg-white/15',
            )}
          />
        );
      })}
    </div>
  );
}

export function MonitorCreateProgress({
  state,
  onDismiss,
}: {
  state: MonitorCreateFlowState;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  if (!state.open) return null;

  const failed = state.createStatus === 'failed';
  const done = state.currentStep === 'done';
  const stepLabel = currentStepLabel(state.currentStep, t);
  const stepIdx = monitorCreateStepIndex(state.currentStep);
  const progress = done
    ? 1
    : (stepIdx + 0.45) / MONITOR_CREATE_STEPS.length;
  const errorText =
    failed && state.error
      ? state.error.startsWith('monitor_')
        ? t('monitors.createFailed')
        : state.error
      : null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-[2px]"
      role="dialog"
      aria-modal
      aria-live="polite"
      aria-busy={state.running}
      aria-label={t('monitors.createProgress.title')}
    >
      <div className="flex max-w-sm flex-col items-center gap-5 px-8 py-2 text-center">
        {failed ? (
          <>
            <p className="text-sm text-red-300">{errorText}</p>
            <button
              type="button"
              className="text-sm text-white/50 underline-offset-2 hover:text-white/70 hover:underline"
              onClick={onDismiss}
            >
              {t('common.cancel')}
            </button>
          </>
        ) : (
          <>
            <CreateProgressOrb done={done} progress={progress} />
            <div className="flex min-h-[2.75rem] flex-col items-center gap-2">
              <p
                key={state.currentStep}
                className="monitor-create-step-enter max-w-xs text-sm font-medium leading-snug text-white/95"
              >
                {stepLabel}
              </p>
              <StepDots currentStep={state.currentStep} done={done} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** 详情页快照未就绪时的内联进度条 */
export function MonitorSnapshotLoadingBanner({
  snapshotStatus,
  createStep,
}: {
  snapshotStatus?: string | null;
  createStep?: MonitorCreateStepId | null;
}) {
  const { t } = useTranslation();

  let hint = t('monitors.computing');
  if (snapshotStatus === 'computing') {
    hint = t('monitors.createProgress.snapshotComputing');
  } else if (snapshotStatus === 'pending') {
    hint = t('monitors.createProgress.snapshotPending');
  } else if (createStep && createStep !== 'done' && createStep in STEP_I18N) {
    hint = t(STEP_I18N[createStep as keyof typeof STEP_I18N]);
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-ark-accent/20 bg-ark-accent/[0.06] px-4 py-3">
      <Loader2 className="size-4 shrink-0 animate-spin text-ark-accent" />
      <p className="text-sm text-slate-300">{hint}</p>
    </div>
  );
}
