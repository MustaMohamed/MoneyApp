import { useTxDetailStore } from '@/modules/transactions/screens/transactions/detail/detail.store';
import { makeTestBudget, makeTestTransaction } from '@/test_helpers/transaction';

beforeEach(() => {
  useTxDetailStore.getState().reset();
});

describe('useTxDetailStore', () => {
  it('initialises without transaction ownership', () => {
    expect(useTxDetailStore.getState()).toMatchObject({
      tx: null,
      txId: undefined,
      budget: undefined,
    });
  });

  it('stores resolved ownership data with the transaction snapshot', () => {
    const tx = makeTestTransaction({ id: 't1' });
    const budget = makeTestBudget({ id: 'budget-1', name: 'Travel meals' });

    useTxDetailStore.getState().setTx('t1', tx, budget);

    expect(useTxDetailStore.getState()).toMatchObject({ tx, budget, txId: 't1' });
  });

  it('setTx stores a transaction with its route ownership', () => {
    const tx = makeTestTransaction({ id: 't1' });
    useTxDetailStore.getState().setTx('t1', tx);
    expect(useTxDetailStore.getState().tx).toBe(tx);
    expect(useTxDetailStore.getState().txId).toBe('t1');
  });

  it('hydrates budget metadata only for the transaction that still owns the route', () => {
    const first = makeTestTransaction({ id: 't1', budget_id: 'budget-1' });
    const second = makeTestTransaction({ id: 't2', budget_id: null });
    const budget = makeTestBudget({ id: 'budget-1', name: 'Travel meals' });
    useTxDetailStore.getState().setTx('t1', first);
    useTxDetailStore.getState().setTx('t2', second);

    useTxDetailStore.getState().setBudget('t1', 'budget-1', budget);

    expect(useTxDetailStore.getState()).toMatchObject({ tx: second, txId: 't2' });
    expect(useTxDetailStore.getState().budget).toBeUndefined();
  });

  it('clearForId removes stale data and assigns the new route', () => {
    useTxDetailStore.getState().setTx('t1', makeTestTransaction({ id: 't1' }));

    useTxDetailStore.getState().clearForId('t2');

    expect(useTxDetailStore.getState().tx).toBeNull();
    expect(useTxDetailStore.getState().txId).toBe('t2');
  });

  it('reset() removes transaction ownership', () => {
    useTxDetailStore.getState().setTx('t1', makeTestTransaction({ id: 't1' }));
    useTxDetailStore.getState().reset();
    expect(useTxDetailStore.getState()).toMatchObject({ tx: null, txId: undefined });
  });
});
