import { act, renderHook } from '@testing-library/react-native';

import { Currency, TransactionType } from '@/constants/enums';
import { useEditTransaction } from '@/app/(app)/(tabs)/transactions/transaction_form/edit_transaction.hook';
import { useEditTransactionStore } from '@/app/(app)/(tabs)/transactions/transaction_form/edit_transaction.store';
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
    account_id: 'acc-egp',
    to_account_id: null,
    category_id: 'cat-food',
    note: null,
    transaction_date: '2026-05-01',
    transaction_time: '10:00:00',
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
  useCurrencyStore.setState({ rate: GLOBAL_RATE });
  useAccountStore.setState({ accounts: [] });
  useCategoryStore.setState({ categories: [] });
  useEditTransactionStore.getState().reset();
});

afterEach(() => {
  useEditTransactionStore.getState().close();
});

// ─── Initial state ────────────────────────────────────────────────────────────

describe('useEditTransaction rateOverride — initial state', () => {
  it('starts as true for a USD transaction (exchange_rate is set)', () => {
    const tx = makeUSDTx();
    useEditTransactionStore.getState().open(tx);
    const { result } = renderHook(() => useEditTransaction(tx, () => {}));
    expect(result.current.rateOverride).toBe(true);
  });

  it('starts as false for an EGP transaction (exchange_rate is null)', () => {
    const tx = makeEGPTx();
    useEditTransactionStore.getState().open(tx);
    const { result } = renderHook(() => useEditTransaction(tx, () => {}));
    expect(result.current.rateOverride).toBe(false);
  });

  it('initialises exchangeRate from the transaction stored rate for USD', () => {
    const tx = makeUSDTx();
    useEditTransactionStore.getState().open(tx);
    const { result } = renderHook(() => useEditTransaction(tx, () => {}));
    expect(result.current.exchangeRate).toBe(String(STORED_RATE));
  });
});

// ─── toggleRateOverride ───────────────────────────────────────────────────────

describe('useEditTransaction toggleRateOverride', () => {
  it('toggles from true to false for a USD transaction', () => {
    const tx = makeUSDTx();
    useEditTransactionStore.getState().open(tx);
    const { result } = renderHook(() => useEditTransaction(tx, () => {}));

    act(() => {
      result.current.toggleRateOverride();
    });

    expect(result.current.rateOverride).toBe(false);
  });

  it('resets exchangeRate to global rate when toggling OFF for a USD transaction', () => {
    const tx = makeUSDTx();
    useEditTransactionStore.getState().open(tx);
    const { result } = renderHook(() => useEditTransaction(tx, () => {}));
    expect(result.current.exchangeRate).toBe(String(STORED_RATE));

    act(() => {
      result.current.toggleRateOverride(); // true → false
    });

    expect(result.current.rateOverride).toBe(false);
    expect(result.current.exchangeRate).toBe(String(GLOBAL_RATE));
  });

  it('does not change exchangeRate when toggling ON for an EGP transaction', () => {
    const tx = makeEGPTx();
    useEditTransactionStore.getState().open(tx);
    const { result } = renderHook(() => useEditTransaction(tx, () => {}));
    const before = result.current.exchangeRate;

    act(() => {
      result.current.toggleRateOverride(); // false → true
    });

    expect(result.current.rateOverride).toBe(true);
    expect(result.current.exchangeRate).toBe(before);
  });

  it('resets exchangeRate to global rate when toggling OFF after a custom edit', () => {
    const tx = makeUSDTx();
    useEditTransactionStore.getState().open(tx);
    const { result } = renderHook(() => useEditTransaction(tx, () => {}));

    // Change the rate while override is ON.
    act(() => {
      result.current.setExchangeRate('72');
    });
    expect(result.current.exchangeRate).toBe('72');

    // Toggle OFF → must revert to global.
    act(() => {
      result.current.toggleRateOverride();
    });

    expect(result.current.exchangeRate).toBe(String(GLOBAL_RATE));
  });
});

// ─── Sheet close ─────────────────────────────────────────────────────────────

describe('useEditTransaction sheet close', () => {
  it('resets rateOverride to true (original) when the sheet closes for a USD transaction', () => {
    const tx = makeUSDTx();
    useEditTransactionStore.getState().open(tx);
    const { result } = renderHook(() => useEditTransaction(tx, () => {}));

    act(() => {
      result.current.toggleRateOverride(); // true → false
    });
    expect(result.current.rateOverride).toBe(false);

    act(() => {
      useEditTransactionStore.getState().close();
    });

    expect(result.current.rateOverride).toBe(true);
  });

  it('resets rateOverride to false (original) when the sheet closes for an EGP transaction', () => {
    const tx = makeEGPTx();
    useEditTransactionStore.getState().open(tx);
    const { result } = renderHook(() => useEditTransaction(tx, () => {}));

    act(() => {
      result.current.toggleRateOverride(); // false → true
    });
    expect(result.current.rateOverride).toBe(true);

    act(() => {
      useEditTransactionStore.getState().close();
    });

    expect(result.current.rateOverride).toBe(false);
  });

  it('resets exchangeRate to the stored transaction rate when the sheet closes for a USD transaction', () => {
    const tx = makeUSDTx();
    useEditTransactionStore.getState().open(tx);
    const { result } = renderHook(() => useEditTransaction(tx, () => {}));

    act(() => {
      result.current.toggleRateOverride(); // ON → OFF (rate becomes GLOBAL_RATE)
    });
    expect(result.current.exchangeRate).toBe(String(GLOBAL_RATE));

    act(() => {
      useEditTransactionStore.getState().close();
    });

    // buildDefaults uses tx.exchange_rate when available.
    expect(result.current.exchangeRate).toBe(String(STORED_RATE));
  });
});
