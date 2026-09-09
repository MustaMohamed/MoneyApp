import {
  INITIAL_DATA_ENTRY,
  useTxDetailStore,
} from '@/modules/transactions/screens/transactions/detail/detail.store';
import { makeTestBudget, makeTestTransaction } from '@/test_helpers/transaction';

const entryOf = (owner: string) => useTxDetailStore.getState().entries[owner];

beforeEach(() => {
  useTxDetailStore.getState().reset();
});

describe('useTxDetailStore', () => {
  it('initialises without transaction ownership', () => {
    expect(useTxDetailStore.getState().entries).toEqual({});
    expect(INITIAL_DATA_ENTRY).toEqual({
      tx: null,
      txId: undefined,
      budget: undefined,
      loadedAtVersion: undefined,
    });
  });

  it('stores resolved ownership data with the transaction snapshot', () => {
    const tx = makeTestTransaction({ id: 't1' });
    const budget = makeTestBudget({ id: 'budget-1', name: 'Travel meals' });

    useTxDetailStore.getState().setTx('owner-a', 't1', tx, 4, budget);

    expect(entryOf('owner-a')).toEqual({ tx, budget, txId: 't1', loadedAtVersion: 4 });
  });

  it('setTx stamps the mutation version the snapshot was read at', () => {
    const tx = makeTestTransaction({ id: 't1' });
    useTxDetailStore.getState().setTx('owner-a', 't1', tx, 7);
    expect(entryOf('owner-a').tx).toBe(tx);
    expect(entryOf('owner-a').txId).toBe('t1');
    expect(entryOf('owner-a').loadedAtVersion).toBe(7);
  });

  it('carries a hydrated budget across a reload of the same transaction', () => {
    const tx = makeTestTransaction({ id: 't1', budget_id: 'budget-1' });
    const budget = makeTestBudget({ id: 'budget-1', name: 'Travel meals' });
    useTxDetailStore.getState().setTx('owner-a', 't1', tx, 0);
    useTxDetailStore.getState().setBudget('owner-a', 't1', 'budget-1', budget);

    useTxDetailStore.getState().setTx('owner-a', 't1', { ...tx, note: 'edited' }, 1);

    expect(entryOf('owner-a').budget).toBe(budget);
    expect(entryOf('owner-a').loadedAtVersion).toBe(1);
  });

  it('drops a hydrated budget when the reloaded transaction changed budget', () => {
    const tx = makeTestTransaction({ id: 't1', budget_id: 'budget-1' });
    const budget = makeTestBudget({ id: 'budget-1', name: 'Travel meals' });
    useTxDetailStore.getState().setTx('owner-a', 't1', tx, 0);
    useTxDetailStore.getState().setBudget('owner-a', 't1', 'budget-1', budget);

    useTxDetailStore.getState().setTx('owner-a', 't1', { ...tx, budget_id: 'budget-2' }, 1);

    expect(entryOf('owner-a').budget).toBeUndefined();
  });

  it('hydrates budget metadata only for the transaction that still owns the route', () => {
    const first = makeTestTransaction({ id: 't1', budget_id: 'budget-1' });
    const second = makeTestTransaction({ id: 't2', budget_id: null });
    const budget = makeTestBudget({ id: 'budget-1', name: 'Travel meals' });
    useTxDetailStore.getState().setTx('owner-a', 't1', first, 0);
    useTxDetailStore.getState().setTx('owner-a', 't2', second, 0);

    useTxDetailStore.getState().setBudget('owner-a', 't1', 'budget-1', budget);

    expect(entryOf('owner-a')).toMatchObject({ tx: second, txId: 't2' });
    expect(entryOf('owner-a').budget).toBeUndefined();
  });

  it('clearForId removes stale data and assigns the new route', () => {
    useTxDetailStore.getState().setTx('owner-a', 't1', makeTestTransaction({ id: 't1' }), 3);

    useTxDetailStore.getState().clearForId('owner-a', 't2');

    expect(entryOf('owner-a')).toEqual({
      tx: null,
      txId: 't2',
      budget: undefined,
      loadedAtVersion: undefined,
    });
  });

  it('reset() removes transaction ownership', () => {
    useTxDetailStore.getState().setTx('owner-a', 't1', makeTestTransaction({ id: 't1' }), 0);
    useTxDetailStore.getState().reset();
    expect(useTxDetailStore.getState().entries).toEqual({});
  });
});

describe('useTxDetailStore owner isolation', () => {
  it('a second copy loading leaves the first copy transaction, budget and stamp intact', () => {
    const first = makeTestTransaction({ id: 't1', budget_id: 'budget-1' });
    const budget = makeTestBudget({ id: 'budget-1', name: 'Travel meals' });
    useTxDetailStore.getState().setTx('owner-a', 't1', first, 2, budget);
    const before = entryOf('owner-a');

    useTxDetailStore.getState().setTx('owner-b', 't2', makeTestTransaction({ id: 't2' }), 5);

    expect(entryOf('owner-a')).toBe(before);
    expect(entryOf('owner-b')).toMatchObject({ txId: 't2', loadedAtVersion: 5 });
  });

  it('a second copy clearing its route leaves the first copy loaded', () => {
    const first = makeTestTransaction({ id: 't1' });
    useTxDetailStore.getState().setTx('owner-a', 't1', first, 0);
    useTxDetailStore.getState().setTx('owner-b', 't1', first, 0);

    useTxDetailStore.getState().clearForId('owner-b', 't1');

    expect(entryOf('owner-a').tx).toBe(first);
    expect(entryOf('owner-b').tx).toBeNull();
  });

  it('a second copy hydrating a budget does not write the first copy', () => {
    const tx = makeTestTransaction({ id: 't1', budget_id: 'budget-1' });
    const budget = makeTestBudget({ id: 'budget-1', name: 'Travel meals' });
    useTxDetailStore.getState().setTx('owner-a', 't1', tx, 0);
    useTxDetailStore.getState().setTx('owner-b', 't1', tx, 0);

    useTxDetailStore.getState().setBudget('owner-b', 't1', 'budget-1', budget);

    expect(entryOf('owner-a').budget).toBeUndefined();
    expect(entryOf('owner-b').budget).toBe(budget);
  });

  it('setBudget for a transaction the owner has moved off is dropped', () => {
    const tx = makeTestTransaction({ id: 't1', budget_id: 'budget-1' });
    const budget = makeTestBudget({ id: 'budget-1', name: 'Travel meals' });
    useTxDetailStore.getState().setTx('owner-a', 't1', tx, 0);
    useTxDetailStore.getState().clearForId('owner-a', 't2');
    const before = entryOf('owner-a');

    useTxDetailStore.getState().setBudget('owner-a', 't1', 'budget-1', budget);

    expect(entryOf('owner-a')).toBe(before);
  });
});

describe('useTxDetailStore release', () => {
  it('removes only the released copy', () => {
    const first = makeTestTransaction({ id: 't1' });
    useTxDetailStore.getState().setTx('owner-a', 't1', first, 0);
    useTxDetailStore.getState().setTx('owner-b', 't1', first, 0);
    const before = entryOf('owner-a');

    useTxDetailStore.getState().release('owner-b');

    expect(entryOf('owner-a')).toBe(before);
    expect(Object.keys(useTxDetailStore.getState().entries)).toEqual(['owner-a']);
  });

  it('releasing a copy that never loaded leaves the store identical', () => {
    useTxDetailStore.getState().setTx('owner-a', 't1', makeTestTransaction({ id: 't1' }), 0);
    const before = useTxDetailStore.getState().entries;

    useTxDetailStore.getState().release('owner-b');

    expect(useTxDetailStore.getState().entries).toBe(before);
  });
});
