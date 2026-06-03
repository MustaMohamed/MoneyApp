import { act, renderHook } from '@testing-library/react-native';

import type { Transaction } from '@/database/entities/transaction.entity';
import { useTxDetailStore } from '@/modules/transactions/screens/transactions/detail/detail.store';

function setup() {
  const hook = renderHook(() => useTxDetailStore());
  act(() => hook.result.current.reset());
  return hook;
}

describe('useTxDetailStore', () => {
  it('initialises with tx = undefined', () => {
    const { result } = setup();

    expect(result.current.state.tx.value).toBeUndefined();
  });

  it('setTx stores a transaction', () => {
    const { result } = setup();
    const tx = { id: 't1' } as Transaction;

    act(() => result.current.setTx(tx));

    expect(result.current.state.tx.value).toBe(tx);
  });

  it('setTx(null) records a not-found result', () => {
    const { result } = setup();

    act(() => result.current.setTx(null));

    expect(result.current.state.tx.value).toBeNull();
  });

  it('reset() returns tx to undefined', () => {
    const { result } = setup();

    act(() => result.current.setTx({ id: 't1' } as Transaction));
    act(() => result.current.reset());

    expect(result.current.state.tx.value).toBeUndefined();
  });
});
