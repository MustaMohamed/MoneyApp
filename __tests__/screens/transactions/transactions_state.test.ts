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

    useTransactionsState.getState().beginTotalsLoad('2026-07', false);
    useTransactionsState.getState().resolveTotals('2026-07', { current, previous });

    expect(useTransactionsState.getState().totals).toEqual({ current, previous });
    expect(useTransactionsState.getState().totalsYearMonth).toBe('2026-07');
    expect(useTransactionsState.getState().totalsStatus).toBe('ready');
  });

  it('keeps same-month totals visible while refreshing', () => {
    const totals = {
      current: { incomeEgp: 100, expenseEgp: 40, netEgp: 60 },
      previous: { incomeEgp: 80, expenseEgp: 30, netEgp: 50 },
    };
    useTransactionsState.getState().beginTotalsLoad('2026-07', false);
    useTransactionsState.getState().resolveTotals('2026-07', totals);

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
    useTransactionsState.getState().beginTotalsLoad('2026-07', false);
    useTransactionsState.getState().resolveTotals('2026-07', totals);
    useTransactionsState.getState().beginTotalsLoad('2026-07', true);

    useTransactionsState.getState().failTotals('2026-07');

    expect(useTransactionsState.getState()).toMatchObject({
      totals,
      totalsStatus: 'refreshErrorWithData',
    });
  });

  it('represents a first-load failure without financial zeroes', () => {
    useTransactionsState.getState().beginTotalsLoad('2026-07', false);

    useTransactionsState.getState().failTotals('2026-07');

    expect(useTransactionsState.getState()).toMatchObject({
      totals: null,
      totalsStatus: 'firstLoadError',
    });
  });

  it('ignores totals completion for an obsolete month', () => {
    useTransactionsState.getState().beginTotalsLoad('2026-07', false);
    useTransactionsState.getState().beginTotalsLoad('2026-08', false);

    useTransactionsState.getState().resolveTotals('2026-07', {
      current: { incomeEgp: 100, expenseEgp: 40, netEgp: 60 },
      previous: null,
    });

    expect(useTransactionsState.getState()).toMatchObject({
      totals: null,
      totalsYearMonth: '2026-08',
      totalsStatus: 'initialLoading',
    });
  });

  it('persists the current list scroll offset', () => {
    useTransactionsState.getState().setScrollOffset(328);

    expect(useTransactionsState.getState().scrollOffset).toBe(328);
  });

  it('reset() clears totals', () => {
    useTransactionsState.getState().beginTotalsLoad('2026-07', false);
    useTransactionsState.getState().resolveTotals('2026-07', {
      current: { incomeEgp: 100, expenseEgp: 40, netEgp: 60 },
      previous: null,
    });
    useTransactionsState.getState().setScrollOffset(128);

    useTransactionsState.getState().reset();

    expect(useTransactionsState.getState().totals).toBeNull();
    expect(useTransactionsState.getState().totalsYearMonth).toBeNull();
    expect(useTransactionsState.getState().totalsStatus).toBe('idle');
    expect(useTransactionsState.getState().scrollOffset).toBe(0);
  });
});
