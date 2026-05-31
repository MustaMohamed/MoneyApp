import { create } from 'zustand';

const INITIAL_STATE = { count: 0 };

type SheetVisibilityStore = { count: number } & {
  increment: () => void;
  decrement: () => void;
  reset: () => void;
};

export const useSheetVisibilityStore = create<SheetVisibilityStore>((set) => ({
  ...INITIAL_STATE,
  increment: () => set((s) => ({ ...s, count: s.count + 1 })),
  decrement: () =>
    set((s) => {
      // Floor at 0 so a leaked decrement (Sheet unmounted-twice, double-cleanup,
      // etc.) doesn't pin the counter at a negative value and break un-hiding
      // the FAB forever. Warn in dev so the underlying leak is at least visible
      // — silent floor would let the bug hide indefinitely.
      if (__DEV__ && s.count === 0) {
        console.warn(
          '[sheet_visibility] decrement called while count is already 0 — ' +
            'a Sheet likely fired its cleanup decrement twice. ' +
            'Investigate the Sheet whose visible just flipped.',
        );
      }
      return { ...s, count: Math.max(0, s.count - 1) };
    }),
  reset: () => set(INITIAL_STATE),
}));

/** Returns true when at least one Sheet is currently open. */
export function useAnySheetOpen(): boolean {
  return useSheetVisibilityStore((s) => s.count > 0);
}
