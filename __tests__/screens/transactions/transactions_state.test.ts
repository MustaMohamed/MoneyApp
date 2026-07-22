import { useTransactionsState } from '@/modules/transactions/screens/transactions/transactions.state';

beforeEach(() => {
  useTransactionsState.getState().reset();
});

describe('useTransactionsState totals presentation', () => {
  it('owns status without owning financial payloads', () => {
    const state = useTransactionsState.getState();

    expect(state.totalsStatus).toBe('idle');
    expect(state).not.toHaveProperty('totals');
    expect(state).not.toHaveProperty('totalsYearMonth');
    expect(state).not.toHaveProperty('totalsRequestId');
  });

  it('distinguishes initial loading from refresh with data', () => {
    useTransactionsState.getState().beginTotalsLoad(false);
    expect(useTransactionsState.getState().totalsStatus).toBe('initialLoading');

    useTransactionsState.getState().beginTotalsLoad(true);
    expect(useTransactionsState.getState().totalsStatus).toBe('refreshing');
  });

  it('resolves the active load to ready', () => {
    useTransactionsState.getState().beginTotalsLoad(false);
    useTransactionsState.getState().resolveTotalsLoad();

    expect(useTransactionsState.getState().totalsStatus).toBe('ready');
  });

  it('distinguishes first-load and refresh failures', () => {
    useTransactionsState.getState().failTotalsLoad(false);
    expect(useTransactionsState.getState().totalsStatus).toBe('firstLoadError');

    useTransactionsState.getState().failTotalsLoad(true);
    expect(useTransactionsState.getState().totalsStatus).toBe('refreshErrorWithData');
  });
});

describe('useTransactionsState scroll ownership', () => {
  it('persists scroll context only for its owning query', () => {
    useTransactionsState.getState().activateScrollQuery('july-query');
    useTransactionsState.getState().setScrollOffset('july-query', 328);

    expect(useTransactionsState.getState()).toMatchObject({
      scrollOffset: 328,
      scrollQueryKey: 'july-query',
    });

    useTransactionsState.getState().activateScrollQuery('june-query');
    useTransactionsState.getState().setScrollOffset('july-query', 512);

    expect(useTransactionsState.getState()).toMatchObject({
      scrollOffset: 0,
      scrollQueryKey: 'june-query',
    });
  });

  it('does not publish a new snapshot for an unchanged scroll offset', () => {
    useTransactionsState.getState().activateScrollQuery('july-query');
    const listener = jest.fn();
    const unsubscribe = useTransactionsState.subscribe(listener);

    useTransactionsState.getState().setScrollOffset('july-query', 328);
    useTransactionsState.getState().setScrollOffset('july-query', 328);

    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('reset clears transient UI state', () => {
    useTransactionsState.getState().beginTotalsLoad(true);
    useTransactionsState.getState().activateScrollQuery('july-query');
    useTransactionsState.getState().setScrollOffset('july-query', 128);

    useTransactionsState.getState().reset();

    expect(useTransactionsState.getState()).toMatchObject({
      totalsStatus: 'idle',
      scrollOffset: 0,
      scrollQueryKey: null,
    });
  });
});
