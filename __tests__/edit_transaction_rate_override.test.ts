import { act, renderHook } from '@testing-library/react-native';

import { Currency, TransactionType } from '@/constants/enums';
import { useEditTransaction } from '@/screens/transactions/transaction_form/edit_transaction.hook';
import { useEditTransactionState } from '@/screens/transactions/transaction_form/edit_transaction.state';
import { useEditTransactionStore } from '@/screens/transactions/transaction_form/edit_transaction.store';
import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';
import { useCurrencyStore } from '@/store/currency.store';
import type { Transaction } from '@/database/entities/transaction.entity';

// ─── Constants ────────────────────────────────────────────────────────────────

const GLOBAL_RATE = 55;
const STORED_RATE = 58.5;
const NOW = '2026-05-01T12:00:00.000Z';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeEGPTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-egp',
    type: TransactionType.Expense,
    amount: 150,
    currency: Currency.EGP,
    egp_amount: 150,
    exchange_rate: null,
    to_amount: null,
    minimum_payment_snapshot: null,
    account_id: 'acc-egp',
    to_account_id: null,
    category_id: 'cat-food',
    note: null,
    transaction_date: '2026-05-01',
    transaction_time: '10:00:00',
    commitment_payment_id: null,
    installment_id: null,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function makeUSDTx(overrides: Partial<Transaction> = {}): Transaction {
  return makeEGPTx({
    id: 'tx-usd',
    currency: Currency.USD,
    egp_amount: 150 * STORED_RATE,
    exchange_rate: STORED_RATE,
    account_id: 'acc-usd',
    ...overrides,
  });
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  useCurrencyStore.setState((s) => ({ state: { ...s.state, rate: GLOBAL_RATE } }));
  useAccountStore.setState({ state: { accounts: [] } });
  useCategoryStore.setState({ state: { categories: [] } });
  useEditTransactionStore.getState().reset();
  useEditTransactionState.getState().reset();
});

afterEach(() => {
  useEditTransactionStore.getState().reset();
  useEditTransactionState.getState().close();
});

// ─── Initial state ────────────────────────────────────────────────────────────

describe('useEditTransaction rateOverride — initial state', () => {
  it('starts as true for a USD transaction (exchange_rate is set)', () => {
    const tx = makeUSDTx();
    useEditTransactionStore.getState().loadFromTx(tx);
    useEditTransactionState.getState().open(tx);
    const { result } = renderHook(() => useEditTransaction(tx, () => {}));
    expect(result.current.state.rateOverride).toBe(true);
  });

  it('starts as false for an EGP transaction (exchange_rate is null)', () => {
    const tx = makeEGPTx();
    useEditTransactionStore.getState().loadFromTx(tx);
    useEditTransactionState.getState().open(tx);
    const { result } = renderHook(() => useEditTransaction(tx, () => {}));
    expect(result.current.state.rateOverride).toBe(false);
  });

  it('initialises exchangeRate from the transaction stored rate for USD', () => {
    const tx = makeUSDTx();
    useEditTransactionStore.getState().loadFromTx(tx);
    useEditTransactionState.getState().open(tx);
    const { result } = renderHook(() => useEditTransaction(tx, () => {}));
    expect(result.current.state.exchangeRate).toBe(String(STORED_RATE));
  });
});

// ─── toggleRateOverride ───────────────────────────────────────────────────────

describe('useEditTransaction toggleRateOverride', () => {
  it('toggles from true to false for a USD transaction', () => {
    const tx = makeUSDTx();
    useEditTransactionStore.getState().loadFromTx(tx);
    useEditTransactionState.getState().open(tx);
    const { result } = renderHook(() => useEditTransaction(tx, () => {}));

    act(() => {
      result.current.toggleRateOverride();
    });

    expect(result.current.state.rateOverride).toBe(false);
  });

  it('resets exchangeRate to global rate when toggling OFF for a USD transaction', () => {
    const tx = makeUSDTx();
    useEditTransactionStore.getState().loadFromTx(tx);
    useEditTransactionState.getState().open(tx);
    const { result } = renderHook(() => useEditTransaction(tx, () => {}));
    expect(result.current.state.exchangeRate).toBe(String(STORED_RATE));

    act(() => {
      result.current.toggleRateOverride(); // true → false
    });

    expect(result.current.state.rateOverride).toBe(false);
    expect(result.current.state.exchangeRate).toBe(String(GLOBAL_RATE));
  });

  it('does not change exchangeRate when toggling ON for an EGP transaction', () => {
    const tx = makeEGPTx();
    useEditTransactionStore.getState().loadFromTx(tx);
    useEditTransactionState.getState().open(tx);
    const { result } = renderHook(() => useEditTransaction(tx, () => {}));
    const before = result.current.state.exchangeRate;

    act(() => {
      result.current.toggleRateOverride(); // false → true
    });

    expect(result.current.state.rateOverride).toBe(true);
    expect(result.current.state.exchangeRate).toBe(before);
  });

  it('resets exchangeRate to global rate when toggling OFF after a custom edit', () => {
    const tx = makeUSDTx();
    useEditTransactionStore.getState().loadFromTx(tx);
    useEditTransactionState.getState().open(tx);
    const { result } = renderHook(() => useEditTransaction(tx, () => {}));

    // Change the rate while override is ON.
    act(() => {
      result.current.setExchangeRate('72');
    });
    expect(result.current.state.exchangeRate).toBe('72');

    // Toggle OFF → must revert to global.
    act(() => {
      result.current.toggleRateOverride();
    });

    expect(result.current.state.exchangeRate).toBe(String(GLOBAL_RATE));
  });
});

// ─── Sheet close ─────────────────────────────────────────────────────────────

describe('useEditTransaction sheet close', () => {
  it('resets rateOverride to true (original) when the sheet closes for a USD transaction', () => {
    const tx = makeUSDTx();
    useEditTransactionStore.getState().loadFromTx(tx);
    useEditTransactionState.getState().open(tx);
    const { result } = renderHook(() => useEditTransaction(tx, () => {}));

    act(() => {
      result.current.toggleRateOverride(); // true → false
    });
    expect(result.current.state.rateOverride).toBe(false);

    act(() => {
      useEditTransactionStore.getState().reset();
      useEditTransactionState.getState().close();
    });

    expect(result.current.state.rateOverride).toBe(true);
  });

  it('resets rateOverride to false (original) when the sheet closes for an EGP transaction', () => {
    const tx = makeEGPTx();
    useEditTransactionStore.getState().loadFromTx(tx);
    useEditTransactionState.getState().open(tx);
    const { result } = renderHook(() => useEditTransaction(tx, () => {}));

    act(() => {
      result.current.toggleRateOverride(); // false → true
    });
    expect(result.current.state.rateOverride).toBe(true);

    act(() => {
      useEditTransactionStore.getState().reset();
      useEditTransactionState.getState().close();
    });

    expect(result.current.state.rateOverride).toBe(false);
  });

  it('resets exchangeRate to the stored transaction rate when the sheet closes for a USD transaction', () => {
    const tx = makeUSDTx();
    useEditTransactionStore.getState().loadFromTx(tx);
    useEditTransactionState.getState().open(tx);
    const { result } = renderHook(() => useEditTransaction(tx, () => {}));

    act(() => {
      result.current.toggleRateOverride(); // ON → OFF (rate becomes GLOBAL_RATE)
    });
    expect(result.current.state.exchangeRate).toBe(String(GLOBAL_RATE));

    act(() => {
      useEditTransactionStore.getState().reset();
      useEditTransactionState.getState().close();
    });

    // buildDefaults uses tx.exchange_rate when available.
    expect(result.current.state.exchangeRate).toBe(String(STORED_RATE));
  });
});
