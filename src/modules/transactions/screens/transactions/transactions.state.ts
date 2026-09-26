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
  /** The month and account scope whose first totals load failed, until a load resolves. */
  failedTotalsScope: string | undefined;
  scrollOffset: number;
  scrollQueryKey: string | null;
  userRefreshing: boolean;
}

type TransactionsState = TransactionsStateShape & {
  beginTotalsLoad: (hasData: boolean) => void;
  resolveTotalsLoad: () => void;
  failTotalsLoad: (hasData: boolean, scope: string) => void;
  activateScrollQuery: (queryKey: string) => void;
  setScrollOffset: (queryKey: string, offset: number) => void;
  setUserRefreshing: (value: boolean) => void;
  reset: () => void;
};

const INITIAL_STATE: TransactionsStateShape = {
  totalsStatus: 'idle',
  failedTotalsScope: undefined,
  scrollOffset: 0,
  scrollQueryKey: null,
  userRefreshing: false,
};

export const useTransactionsState = createMoneyAppSelectors(
  create<TransactionsState>((set) => ({
    ...INITIAL_STATE,
    beginTotalsLoad: (hasData) => set({ totalsStatus: hasData ? 'refreshing' : 'initialLoading' }),
    resolveTotalsLoad: () => set({ totalsStatus: 'ready', failedTotalsScope: undefined }),
    failTotalsLoad: (hasData, scope) =>
      set(
        hasData
          ? { totalsStatus: 'refreshErrorWithData' }
          : { totalsStatus: 'firstLoadError', failedTotalsScope: scope },
      ),
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
    setUserRefreshing: (userRefreshing) => set({ userRefreshing }),
    reset: () => set(INITIAL_STATE),
  })),
);
