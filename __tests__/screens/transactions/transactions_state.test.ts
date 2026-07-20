import type { PeriodTotals } from '@/modules/transactions/database/transactions';
import { useTransactionsState } from '@/modules/transactions/screens/transactions/transactions.state';

beforeEach(() => {
  useTransactionsState.getState().reset();
});

describe('useTransactionsState', () => {
  it('initialises with totals idle and scroll at the top', () => {
    expect(useTransactionsState.getState().totals).toBeNull();
    expect(useTransactionsState.getState().totalsYearMonth).toBeNull();
    expect(useTransactionsState.getState().totalsStatus).toBe('idle');
    expect(useTransactionsState.getState().scrollOffset).toBe(0);
    expect(useTransactionsState.getState().scrollQueryKey).toBeNull();
  });

  it('begins a new month with an empty initial-loading snapshot', () => {
    useTransactionsState.getState().beginTotalsLoad('2026-07', false);

    expect(useTransactionsState.getState()).toMatchObject({
      totals: null,
      totalsYearMonth: '2026-07',
      totalsStatus: 'initialLoading',
    });
  });

  it('resolves current and previous totals for the active month', () => {
    const current: PeriodTotals = { incomeEgp: 100, expenseEgp: 40, netEgp: 60 };
    const previous: PeriodTotals = { incomeEgp: 80, expenseEgp: 30, netEgp: 50 };

    const requestId = useTransactionsState.getState().beginTotalsLoad('2026-07', false);
    useTransactionsState.getState().resolveTotals('2026-07', requestId, { current, previous });

    expect(useTransactionsState.getState().totals).toEqual({ current, previous });
    expect(useTransactionsState.getState().totalsYearMonth).toBe('2026-07');
    expect(useTransactionsState.getState().totalsStatus).toBe('ready');
  });

  it('keeps same-month totals visible while refreshing', () => {
    const totals = {
      current: { incomeEgp: 100, expenseEgp: 40, netEgp: 60 },
      previous: { incomeEgp: 80, expenseEgp: 30, netEgp: 50 },
    };
    const initialRequestId = useTransactionsState.getState().beginTotalsLoad('2026-07', false);
    useTransactionsState.getState().resolveTotals('2026-07', initialRequestId, totals);

    useTransactionsState.getState().beginTotalsLoad('2026-07', true);

    expect(useTransactionsState.getState()).toMatchObject({
      totals,
      totalsYearMonth: '2026-07',
      totalsStatus: 'refreshing',
    });
  });

  it('keeps same-month totals when a refresh fails', () => {
    const totals = {
      current: { incomeEgp: 100, expenseEgp: 40, netEgp: 60 },
      previous: null,
    };
    const initialRequestId = useTransactionsState.getState().beginTotalsLoad('2026-07', false);
    useTransactionsState.getState().resolveTotals('2026-07', initialRequestId, totals);
    const refreshRequestId = useTransactionsState.getState().beginTotalsLoad('2026-07', true);

    useTransactionsState.getState().failTotals('2026-07', refreshRequestId);

    expect(useTransactionsState.getState()).toMatchObject({
      totals,
      totalsStatus: 'refreshErrorWithData',
    });
  });

  it('represents a first-load failure without financial zeroes', () => {
    const requestId = useTransactionsState.getState().beginTotalsLoad('2026-07', false);

    useTransactionsState.getState().failTotals('2026-07', requestId);

    expect(useTransactionsState.getState()).toMatchObject({
      totals: null,
      totalsStatus: 'firstLoadError',
    });
  });

  it('ignores totals completion for an obsolete month', () => {
    const julyRequestId = useTransactionsState.getState().beginTotalsLoad('2026-07', false);
    useTransactionsState.getState().beginTotalsLoad('2026-08', false);

    useTransactionsState.getState().resolveTotals('2026-07', julyRequestId, {
      current: { incomeEgp: 100, expenseEgp: 40, netEgp: 60 },
      previous: null,
    });

    expect(useTransactionsState.getState()).toMatchObject({
      totals: null,
      totalsYearMonth: '2026-08',
      totalsStatus: 'initialLoading',
    });
  });

  it('ignores an older completion for the same month', () => {
    const firstRequestId = useTransactionsState.getState().beginTotalsLoad('2026-07', false);
    const secondRequestId = useTransactionsState.getState().beginTotalsLoad('2026-07', false);
    const latestTotals = {
      current: { incomeEgp: 300, expenseEgp: 100, netEgp: 200 },
      previous: null,
    };

    useTransactionsState.getState().resolveTotals('2026-07', secondRequestId, latestTotals);
    useTransactionsState.getState().resolveTotals('2026-07', firstRequestId, {
      current: { incomeEgp: 100, expenseEgp: 80, netEgp: 20 },
      previous: null,
    });

    expect(useTransactionsState.getState()).toMatchObject({
      totals: latestTotals,
      totalsYearMonth: '2026-07',
      totalsStatus: 'ready',
    });
  });

  it('persists scroll context only for its owning query', () => {
    useTransactionsState.getState().activateScrollQuery('july-query');
    useTransactionsState.getState().setScrollOffset('july-query', 328);

    expect(useTransactionsState.getState()).toMatchObject({
      scrollOffset: 328,
      scrollQueryKey: 'july-query',
    });

    useTransactionsState.getState().activateScrollQuery('june-query');

    expect(useTransactionsState.getState()).toMatchObject({
      scrollOffset: 0,
      scrollQueryKey: 'june-query',
    });

    useTransactionsState.getState().setScrollOffset('july-query', 512);

    expect(useTransactionsState.getState()).toMatchObject({
      scrollOffset: 0,
      scrollQueryKey: 'june-query',
    });
  });

  it('does not publish a new state snapshot for an unchanged scroll offset', () => {
    useTransactionsState.getState().activateScrollQuery('july-query');
    const listener = jest.fn();
    const unsubscribe = useTransactionsState.subscribe(listener);

    useTransactionsState.getState().setScrollOffset('july-query', 328);
    useTransactionsState.getState().setScrollOffset('july-query', 328);

    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('reset() clears totals', () => {
    const requestId = useTransactionsState.getState().beginTotalsLoad('2026-07', false);
    useTransactionsState.getState().resolveTotals('2026-07', requestId, {
      current: { incomeEgp: 100, expenseEgp: 40, netEgp: 60 },
      previous: null,
    });
    useTransactionsState.getState().activateScrollQuery('july-query');
    useTransactionsState.getState().setScrollOffset('july-query', 128);

    useTransactionsState.getState().reset();

    expect(useTransactionsState.getState().totals).toBeNull();
    expect(useTransactionsState.getState().totalsYearMonth).toBeNull();
    expect(useTransactionsState.getState().totalsStatus).toBe('idle');
    expect(useTransactionsState.getState().scrollOffset).toBe(0);
    expect(useTransactionsState.getState().scrollQueryKey).toBeNull();
  });
});
