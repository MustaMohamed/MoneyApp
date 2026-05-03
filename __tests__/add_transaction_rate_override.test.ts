import { act, renderHook } from '@testing-library/react-native';

import { AccountType, Currency } from '@/constants/enums';
import { useAddTransaction } from '@/app/(app)/(tabs)/transactions/_transaction_form/add_transaction.hook';
import { useAddTransactionStore } from '@/app/(app)/(tabs)/transactions/_transaction_form/add_transaction.store';
import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';
import { useCurrencyStore } from '@/store/currency.store';
import type { Account } from '@/database/entities/account.entity';

// ─── Constants ────────────────────────────────────────────────────────────────

const GLOBAL_RATE = 55;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeUSDAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 'acc-usd',
    name: 'USD Bank',
    type: AccountType.Bank,
    currency: Currency.USD,
    opening_balance: 1000,
    current_balance: 1000,
    color: '#C9973A',
    credit_limit: null,
    revolving_balance: null,
    minimum_payment: null,
    statement_due_day: null,
    interest_tracking: 0,
    apr: null,
    is_archived: 0,
    sort_order: 0,
    created_at: '2026-05-01T00:00:00.000Z',
    updated_at: '2026-05-01T00:00:00.000Z',
    ...overrides,
  };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  // Seed singleton stores with controlled test values.
  useCurrencyStore.setState({ rate: GLOBAL_RATE });
  useAccountStore.setState({ accounts: [] });
  useCategoryStore.setState({ categories: [] });

  // Open the sheet so the hook's close-effect doesn't fire on mount.
  useAddTransactionStore.getState().reset();
  useAddTransactionStore.getState().open();
});

afterEach(() => {
  useAddTransactionStore.getState().close();
});

// ─── Initial state ────────────────────────────────────────────────────────────

describe('useAddTransaction rateOverride — initial state', () => {
  it('starts as false', () => {
    const { result } = renderHook(() => useAddTransaction(() => {}));
    expect(result.current.rateOverride).toBe(false);
  });

  it('initialises exchangeRate from the global rate', () => {
    const { result } = renderHook(() => useAddTransaction(() => {}));
    expect(result.current.exchangeRate).toBe(String(GLOBAL_RATE));
  });
});

// ─── toggleRateOverride ───────────────────────────────────────────────────────

describe('useAddTransaction toggleRateOverride', () => {
  it('toggles from false to true on first call', () => {
    const { result } = renderHook(() => useAddTransaction(() => {}));

    act(() => {
      result.current.toggleRateOverride();
    });

    expect(result.current.rateOverride).toBe(true);
  });

  it('does not change exchangeRate when toggling ON', () => {
    const { result } = renderHook(() => useAddTransaction(() => {}));
    const before = result.current.exchangeRate;

    act(() => {
      result.current.toggleRateOverride();
    });

    expect(result.current.exchangeRate).toBe(before);
  });

  it('toggles back to false on second call', () => {
    const { result } = renderHook(() => useAddTransaction(() => {}));

    act(() => {
      result.current.toggleRateOverride();
    });
    act(() => {
      result.current.toggleRateOverride();
    });

    expect(result.current.rateOverride).toBe(false);
  });

  it('resets exchangeRate to the global rate when toggling OFF', () => {
    const { result } = renderHook(() => useAddTransaction(() => {}));

    // Enable override and type a custom rate.
    act(() => {
      result.current.toggleRateOverride();
      result.current.setExchangeRate('99.5');
    });
    expect(result.current.exchangeRate).toBe('99.5');

    // Toggle OFF → rate must revert to global.
    act(() => {
      result.current.toggleRateOverride();
    });

    expect(result.current.rateOverride).toBe(false);
    expect(result.current.exchangeRate).toBe(String(GLOBAL_RATE));
  });

  it('keeps exchangeRate at global rate when toggling ON after a previous reset', () => {
    const { result } = renderHook(() => useAddTransaction(() => {}));

    act(() => {
      result.current.toggleRateOverride(); // false → true
      result.current.setExchangeRate('75');
    });
    act(() => {
      result.current.toggleRateOverride(); // true → false (rate reset to GLOBAL_RATE)
    });
    act(() => {
      result.current.toggleRateOverride(); // false → true (rate stays at GLOBAL_RATE)
    });

    expect(result.current.rateOverride).toBe(true);
    expect(result.current.exchangeRate).toBe(String(GLOBAL_RATE));
  });
});

// ─── selectAccount ────────────────────────────────────────────────────────────

describe('useAddTransaction selectAccount', () => {
  it('resets rateOverride to false when a USD account is selected', () => {
    const { result } = renderHook(() => useAddTransaction(() => {}));

    act(() => {
      result.current.toggleRateOverride(); // → true
    });
    expect(result.current.rateOverride).toBe(true);

    act(() => {
      result.current.selectAccount(makeUSDAccount());
    });

    expect(result.current.rateOverride).toBe(false);
  });

  it('resets exchangeRate to global rate when a USD account is selected', () => {
    const { result } = renderHook(() => useAddTransaction(() => {}));

    act(() => {
      result.current.toggleRateOverride();
      result.current.setExchangeRate('88');
    });

    act(() => {
      result.current.selectAccount(makeUSDAccount());
    });

    expect(result.current.exchangeRate).toBe(String(GLOBAL_RATE));
  });
});

// ─── Sheet close ─────────────────────────────────────────────────────────────

describe('useAddTransaction sheet close', () => {
  it('resets rateOverride to false when the sheet closes', () => {
    const { result } = renderHook(() => useAddTransaction(() => {}));

    act(() => {
      result.current.toggleRateOverride(); // → true
    });
    expect(result.current.rateOverride).toBe(true);

    act(() => {
      useAddTransactionStore.getState().close();
    });

    expect(result.current.rateOverride).toBe(false);
  });

  it('resets exchangeRate to global rate when the sheet closes', () => {
    const { result } = renderHook(() => useAddTransaction(() => {}));

    act(() => {
      result.current.toggleRateOverride();
      result.current.setExchangeRate('120');
    });

    act(() => {
      useAddTransactionStore.getState().close();
    });

    expect(result.current.exchangeRate).toBe(String(GLOBAL_RATE));
  });
});
