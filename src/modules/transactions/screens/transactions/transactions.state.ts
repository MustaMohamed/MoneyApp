import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

export type TransactionTotalsStatus =
  | 'idle'
  | 'initialLoading'
  | 'ready'
  | 'refreshing'
  | 'firstLoadError'
  | 'refreshErrorWithData';

interface TransactionsStateShape {
  totalsStatus: TransactionTotalsStatus;
  scrollOffset: number;
  scrollQueryKey: string | null;
}

type TransactionsState = TransactionsStateShape & {
  beginTotalsLoad: (hasData: boolean) => void;
  resolveTotalsLoad: () => void;
  failTotalsLoad: (hasData: boolean) => void;
  activateScrollQuery: (queryKey: string) => void;
  setScrollOffset: (queryKey: string, offset: number) => void;
  reset: () => void;
};

const INITIAL_STATE: TransactionsStateShape = {
  totalsStatus: 'idle',
  scrollOffset: 0,
  scrollQueryKey: null,
};

export const useTransactionsState = createMoneyAppSelectors(
  create<TransactionsState>((set) => ({
    ...INITIAL_STATE,
    beginTotalsLoad: (hasData) => set({ totalsStatus: hasData ? 'refreshing' : 'initialLoading' }),
    resolveTotalsLoad: () => set({ totalsStatus: 'ready' }),
    failTotalsLoad: (hasData) =>
      set({ totalsStatus: hasData ? 'refreshErrorWithData' : 'firstLoadError' }),
    activateScrollQuery: (scrollQueryKey) =>
      set((state) =>
        state.scrollQueryKey === scrollQueryKey ? state : { scrollQueryKey, scrollOffset: 0 },
      ),
    setScrollOffset: (scrollQueryKey, scrollOffset) =>
      set((state) => {
        const normalizedOffset = Math.max(0, scrollOffset);
        return state.scrollQueryKey === scrollQueryKey && state.scrollOffset !== normalizedOffset
          ? { scrollOffset: normalizedOffset }
          : state;
      }),
    reset: () => set(INITIAL_STATE),
  })),
);
