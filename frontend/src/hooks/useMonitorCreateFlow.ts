import { useCallback, useEffect, useRef, useState } from 'react';
import { createMonitor, getMonitorCreateStatus } from '@/api/monitors';
import type { MonitorCreateStatus } from '@/types/models';
import type { MonitorCreateStepId, MonitorCreateStatusValue } from '@/lib/monitorCreateFlow';
import { sleep } from '@/lib/monitorCreateFlow';

export type MonitorCreateFlowState = {
  open: boolean;
  topic: string;
  monitorId: string | null;
  currentStep: MonitorCreateStepId;
  createStatus: MonitorCreateStatusValue | 'idle';
  snapshotStatus: string | null;
  error: string | null;
  running: boolean;
};

export function useMonitorCreateFlow(onReady: (monitorId: string) => void) {
  const aliveRef = useRef(true);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const [state, setState] = useState<MonitorCreateFlowState>({
    open: false,
    topic: '',
    monitorId: null,
    currentStep: 'understand',
    createStatus: 'idle',
    snapshotStatus: null,
    error: null,
    running: false,
  });

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const dismiss = useCallback(() => {
    if (state.running) return;
    setState((s) => ({ ...s, open: false, error: null, createStatus: 'idle' }));
  }, [state.running]);

  const start = useCallback(async (topic: string) => {
    const trimmed = topic.trim();
    if (!trimmed) return;

    setState({
      open: true,
      topic: trimmed,
      monitorId: null,
      currentStep: 'understand',
      createStatus: 'processing',
      snapshotStatus: 'pending',
      error: null,
      running: true,
    });

    try {
      const created = await createMonitor({ topic: trimmed });
      if (!aliveRef.current) return;

      setState((s) => ({
        ...s,
        monitorId: created.id,
        currentStep: created.createStep ?? 'understand',
        snapshotStatus: created.snapshotStatus ?? 'pending',
      }));

      const pollIntervalMs = 500;
      const deadline = Date.now() + 120_000;
      let final: MonitorCreateStatus | null = null;

      while (aliveRef.current && Date.now() < deadline) {
        const st = await getMonitorCreateStatus(created.id);
        if (!aliveRef.current) return;

        setState((s) => ({
          ...s,
          currentStep: st.createStep,
          createStatus: st.createStatus,
          snapshotStatus: st.snapshotStatus,
        }));

        if (st.createStatus === 'ready' || st.createStatus === 'failed') {
          final = st;
          break;
        }
        await sleep(pollIntervalMs);
      }

      if (!aliveRef.current) return;

      if (!final) {
        setState((s) => ({
          ...s,
          running: false,
          error: 'monitors.createFailed',
          createStatus: 'failed',
        }));
        return;
      }

      setState((s) => ({
        ...s,
        currentStep: final.createStep,
        createStatus: final.createStatus,
        snapshotStatus: final.snapshotStatus,
        running: false,
      }));

      if (final.createStatus === 'failed') {
        setState((s) => ({
          ...s,
          error: final.createError ?? 'monitors.createFailed',
        }));
        return;
      }

      setState((s) => ({
        ...s,
        currentStep: 'done',
        createStatus: 'ready',
        running: false,
      }));
      await sleep(450);
      if (!aliveRef.current) return;

      setState((s) => ({ ...s, open: false }));
      onReadyRef.current(created.id);
    } catch (e) {
      if (!aliveRef.current) return;
      setState((s) => ({
        ...s,
        running: false,
        createStatus: 'failed',
        error: e instanceof Error ? e.message : 'monitors.createFailed',
      }));
    }
  }, []);

  return { state, start, dismiss };
}
