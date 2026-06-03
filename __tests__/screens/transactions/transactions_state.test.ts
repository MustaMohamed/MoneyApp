import { act, renderHook } from '@testing-library/react-native';

import { useTransactionsState } from '@/modules/transactions/screens/transactions/transactions.state';

function setup() {
  const hook = renderHook(() => useTransactionsState());
  act(() => hook.result.current.reset());
  return hook;
}

describe('useTransactionsState', () => {
  it('initialises with refreshing = false', () => {
    const { result } = setup();

    expect(result.current.state.refreshing.value).toBe(false);
  });

  it('setRefreshing(true) flips refreshing on', () => {
    const { result } = setup();

    act(() => result.current.setRefreshing(true));

    expect(result.current.state.refreshing.value).toBe(true);
  });

  it('setRefreshing(false) flips refreshing off', () => {
    const { result } = setup();

    act(() => result.current.setRefreshing(true));
    act(() => result.current.setRefreshing(false));

    expect(result.current.state.refreshing.value).toBe(false);
  });

  it('reset() returns refreshing to false', () => {
    const { result } = setup();

    act(() => result.current.setRefreshing(true));
    act(() => result.current.reset());

    expect(result.current.state.refreshing.value).toBe(false);
  });
});
