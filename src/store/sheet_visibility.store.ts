import { create } from 'zustand';

const INITIAL_STATE = { count: 0 };

type SheetVisibilityStore = { count: number } & {
  increment: () => void;
  decrement: () => void;
  reset: () => void;
};

export const useSheetVisibilityStore = create<SheetVisibilityStore>((set) => ({
  ...INITIAL_STATE,
  increment: () => set((s) => ({ count: s.count + 1 })),
  decrement: () =>
    set((s) => {
      // Floor at 0: a leaked decrement would pin the count negative and never un-hide the FAB.
      if (__DEV__ && s.count === 0) {
        console.warn(
          '[sheet_visibility] decrement called while count is already 0 — ' +
            'a Sheet likely fired its cleanup decrement twice. ' +
            'Investigate the Sheet whose visible just flipped.',
        );
      }
      return { count: Math.max(0, s.count - 1) };
    }),
  reset: () => set(INITIAL_STATE),
}));

export function useAnySheetOpen(): boolean {
  return useSheetVisibilityStore((s) => s.count > 0);
}
