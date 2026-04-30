import { create } from 'zustand';

export type PoolViewMode = 'list' | 'card';

interface SourceUiState {
  poolView: PoolViewMode;
  setPoolView: (mode: PoolViewMode) => void;
}

export const useSourceUiStore = create<SourceUiState>((set) => ({
  poolView: 'card',
  setPoolView: (poolView) => set({ poolView }),
}));
