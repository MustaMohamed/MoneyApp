import { create } from 'zustand';

const INITIAL_STATE = { count: 0 };

interface SheetVisibilityStore {
  state: { count: number };
  increment: () => void;
  decrement: () => void;
}

export const useSheetVisibilityStore = create<SheetVisibilityStore>((set) => ({
  state: INITIAL_STATE,
  increment: () => set((s) => ({ state: { ...s.state, count: s.state.count + 1 } })),
  decrement: () => set((s) => ({ state: { ...s.state, count: Math.max(0, s.state.count - 1) } })),
}));

/** Returns true when at least one Sheet is currently open. */
export function useAnySheetOpen(): boolean {
  return useSheetVisibilityStore((s) => s.state.count > 0);
}
