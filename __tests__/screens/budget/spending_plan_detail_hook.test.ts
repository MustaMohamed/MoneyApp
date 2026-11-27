import { act, renderHook, waitFor } from '@testing-library/react-native';

import { CategoryType } from '@/constants/enums';
import type { Account } from '@/modules/accounts/entities/account.entity';
import type { SpendingPlanWithCategories } from '@/modules/budget/entities/budget.entity';
import { useSpendingPlanDetail } from '@/modules/budget/screens/budget/spending_plan_detail/spending_plan_detail.hook';
import { useSpendingPlanDetailState } from '@/modules/budget/screens/budget/spending_plan_detail/spending_plan_detail.state';
import { useSpendingPlanDetailStore } from '@/modules/budget/screens/budget/spending_plan_detail/spending_plan_detail.store';
import { deferred } from '@/test_helpers/deferred';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';
import { makeTestTransaction } from '@/test_helpers/transaction';

const mockRouterBack = jest.fn();
const mockRouterPush = jest.fn();
const mockLoadAccountLookup = jest.fn<Promise<void>, [string[]]>();
const mockAccountsRead: { accountsById: ReadonlyMap<string, Account>; lookupFailed: boolean } = {
  accountsById: new Map(),
  lookupFailed: false,
};
const mockOpenEditPlan = jest.fn();
const mockGetDetails = jest.fn();
const mockFocusEffect = jest.fn();
let mockRouteParams = { id: 'plan_trip', month: '2026-07' };
let mockOnDayChange: (() => void) | undefined;

jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void | (() => void)) => mockFocusEffect(effect),
  useLocalSearchParams: () => mockRouteParams,
  useRouter: () => ({ back: mockRouterBack, push: mockRouterPush }),
}));
jest.mock('@/utils/run_after_interactions', () => ({
  runAfterInteractions: (task: () => void) => {
    task();
    return { cancel: jest.fn() };
  },
}));
jest.mock('@/modules/categories/store/category.store', () => ({ useCategoryStore: jest.fn() }));
jest.mock('@/modules/accounts/store/account.store', () => ({ useAccountStore: jest.fn() }));
jest.mock('@/modules/accounts/store/use_accounts_by_id.hook', () => ({
  useAccountsById: () => mockAccountsRead,
}));
jest.mock('@/modules/budget/repositories/budget.repository', () => ({
  budgetRepository: { getSpendingPlanDetails: (...args: unknown[]) => mockGetDetails(...args) },
}));
jest.mock('@/modules/budget/screens/budget/budget.state', () => ({ useBudgetState: jest.fn() }));
jest.mock('@/utils/use_local_day_change.hook', () => ({
  useLocalDayChange: (onDayChange: () => void) => {
    mockOnDayChange = onDayChange;
  },
}));

const { useCategoryStore } = jest.requireMock('@/modules/categories/store/category.store') as {
  useCategoryStore: jest.Mock;
};
const { useBudgetState } = jest.requireMock('@/modules/budget/screens/budget/budget.state') as {
  useBudgetState: jest.Mock;
};
const { useAccountStore } = jest.requireMock('@/modules/accounts/store/account.store') as {
  useAccountStore: jest.Mock;
};

const giftShop = makeTestTransaction({
  id: 'tx_2',
  account_id: 'acc_card',
  category_id: 'cat_food',
  amount: 1500,
  egp_amount: 1500,
  transaction_date: '2026-08-03',
});
const fishMarket = makeTestTransaction({
  id: 'tx_1',
  account_id: 'acc_cash',
  category_id: 'cat_food',
  amount: 1100,
  egp_amount: 1100,
  transaction_date: '2026-08-02',
});

const plan: SpendingPlanWithCategories = {
  id: 'plan_trip',
  name: 'Alex weekend',
  start_date: '2026-08-01',
  end_date: '2026-08-04',
  total_amount: 8000,
  created_at: '',
  updated_at: '',
  categories: [{ plan_id: 'plan_trip', category_id: 'cat_food', allocated_amount: 3000 }],
};

beforeEach(() => {
  mockRouteParams = { id: 'plan_trip', month: '2026-07' };
  jest.useFakeTimers().setSystemTime(new Date(2026, 6, 19, 12));
  attachMockSelectorStore(useCategoryStore, () => ({
    categories: [
      {
        id: 'cat_food',
        name: 'Food',
        type: CategoryType.Expense,
        icon: 'food',
        color: '#D4A44C',
        is_default: 0,
        sort_order: 0,
        budget_group: null,
        created_at: '',
        updated_at: '',
      },
    ],
    loadCategories: jest.fn().mockResolvedValue(undefined),
  }));
  attachMockSelectorStore(useBudgetState, () => ({ openEditPlan: mockOpenEditPlan }));
  mockLoadAccountLookup.mockReset().mockResolvedValue(undefined);
  attachMockSelectorStore(useAccountStore, () => ({ loadAccountLookup: mockLoadAccountLookup }));
  mockGetDetails.mockReset().mockResolvedValue({ plan, spend: { cat_food: 1200 } });
});

afterEach(() => {
  mockOnDayChange = undefined;
  jest.useRealTimers();
  jest.clearAllMocks();
  useSpendingPlanDetailState.getState().reset();
  useSpendingPlanDetailStore.getState().reset();
});

describe('useSpendingPlanDetail', () => {
  it('loads by id even when an edit moved the plan outside the route month', async () => {
    const { result } = await renderHook(() => useSpendingPlanDetail());
    await act(async () => {
      mockFocusEffect.mock.calls[0][0]();
    });

    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    expect(mockGetDetails).toHaveBeenCalledWith('plan_trip');
    expect(result.current.state.plan?.name).toBe('Alex weekend');
  });

  it('opens edit on the plan detail owner with the loaded plan id', async () => {
    const { result } = await renderHook(() => useSpendingPlanDetail());
    await act(async () => {
      mockFocusEffect.mock.calls[0][0]();
    });
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));

    await act(async () => result.current.editPlan());

    expect(mockOpenEditPlan).toHaveBeenCalledTimes(1);
    expect(mockOpenEditPlan).toHaveBeenCalledWith('planDetail', 'plan_trip');
  });

  it('exposes an error state and retries a failed load', async () => {
    mockGetDetails
      .mockRejectedValueOnce(new Error('database unavailable'))
      .mockResolvedValueOnce({ plan, spend: { cat_food: 1200 } });
    const { result } = await renderHook(() => useSpendingPlanDetail());
    await act(async () => {
      mockFocusEffect.mock.calls[0][0]();
    });

    await waitFor(() => expect(result.current.state.viewState).toBe('firstLoadError'));
    await act(async () => result.current.retry());
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    expect(mockGetDetails).toHaveBeenCalledTimes(2);
  });

  it('ignores an older response after the route changes to another plan', async () => {
    const first = deferred<{ plan: SpendingPlanWithCategories; spend: {} }>();
    const firstPlan = { ...plan, id: 'plan_trip', name: 'Old plan' };
    const secondPlan = { ...plan, id: 'plan_second', name: 'Current plan' };
    mockGetDetails
      .mockImplementationOnce(() => first.promise)
      .mockResolvedValueOnce({ plan: secondPlan, spend: {} });

    const { result, rerender } = await renderHook(() => useSpendingPlanDetail());
    await act(() => {
      mockFocusEffect.mock.calls[0][0]();
    });

    mockRouteParams = { id: 'plan_second', month: '2026-07' };
    await rerender({});
    await act(async () => {
      mockFocusEffect.mock.calls.at(-1)?.[0]();
    });
    await waitFor(() => expect(result.current.state.plan?.name).toBe('Current plan'));

    await act(async () => {
      first.resolve({ plan: firstPlan, spend: {} });
    });

    expect(result.current.state.plan?.name).toBe('Current plan');
  });

  it('shows notFound with no body when the plan no longer exists', async () => {
    mockGetDetails.mockResolvedValue(undefined);
    const { result } = await renderHook(() => useSpendingPlanDetail());
    await act(async () => {
      mockFocusEffect.mock.calls[0][0]();
    });

    await waitFor(() => expect(result.current.state.viewState).toBe('notFound'));
    expect(result.current.state.showsBody).toBe(false);
    expect(result.current.state.plan).toBeUndefined();
  });

  it('stays firstLoadError when a retry fails again', async () => {
    mockGetDetails.mockRejectedValue(new Error('database unavailable'));
    const { result } = await renderHook(() => useSpendingPlanDetail());
    await act(async () => {
      mockFocusEffect.mock.calls[0][0]();
    });
    await waitFor(() => expect(result.current.state.viewState).toBe('firstLoadError'));

    await act(async () => result.current.retry());

    expect(mockGetDetails).toHaveBeenCalledTimes(2);
    expect(result.current.state.viewState).toBe('firstLoadError');
    expect(result.current.state.showsBody).toBe(false);
  });

  it('keeps the loaded plan under a refresh error when a later read fails', async () => {
    mockGetDetails
      .mockResolvedValueOnce({ plan, spend: { cat_food: 1200 } })
      .mockRejectedValueOnce(new Error('database unavailable'));
    const { result } = await renderHook(() => useSpendingPlanDetail());
    await act(async () => {
      mockFocusEffect.mock.calls[0][0]();
    });
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));

    await act(async () => {
      mockFocusEffect.mock.calls.at(-1)?.[0]();
    });

    await waitFor(() => expect(result.current.state.viewState).toBe('refreshErrorWithData'));
    expect(mockGetDetails).toHaveBeenCalledTimes(2);
    expect(result.current.state.showsBody).toBe(true);
    expect(result.current.state.plan).toBeDefined();
    expect(result.current.state.plan?.name).toBe('Alex weekend');
  });

  it('shows a renamed plan after a retry without passing through loading', async () => {
    const second = deferred<{ plan: SpendingPlanWithCategories; spend: {} }>();
    mockGetDetails
      .mockResolvedValueOnce({ plan, spend: { cat_food: 1200 } })
      .mockImplementationOnce(() => second.promise);
    const seen: string[] = [];
    const { result } = await renderHook(() => {
      const hook = useSpendingPlanDetail();
      seen.push(hook.state.viewState);
      return hook;
    });
    await act(async () => {
      mockFocusEffect.mock.calls[0][0]();
    });
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    seen.length = 0;

    await act(async () => {
      void result.current.retry();
    });
    await act(async () => {
      second.resolve({ plan: { ...plan, name: 'Alex long weekend' }, spend: {} });
    });

    await waitFor(() => expect(result.current.state.plan?.name).toBe('Alex long weekend'));
    expect(seen).not.toContain('loading');
  });

  it('recomputes the days left when the local day changes with the screen open', async () => {
    const shortPlan = { ...plan, start_date: '2026-07-18', end_date: '2026-07-20' };
    mockGetDetails.mockResolvedValue({ plan: shortPlan, spend: { cat_food: 0 } });
    const { result } = await renderHook(() => useSpendingPlanDetail());
    await act(async () => {
      mockFocusEffect.mock.calls[0][0]();
    });
    await waitFor(() => expect(result.current.state.plan?.timing.daysValue).toBe(1));

    jest.setSystemTime(new Date(2026, 6, 20, 0, 5));
    await act(async () => {
      mockOnDayChange?.();
    });

    await waitFor(() => expect(result.current.state.plan?.timing.daysValue).toBe(0));
    expect(mockOnDayChange).toBeDefined();
  });
  it("MA-305: carries the read's transactions onto the Spending card with the plan, in the read's order", async () => {
    mockGetDetails.mockResolvedValue({
      plan,
      spend: { cat_food: 2600 },
      transactions: [giftShop, fishMarket],
    });
    const { result } = await renderHook(() => useSpendingPlanDetail());
    await act(async () => {
      mockFocusEffect.mock.calls[0][0]();
    });

    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    expect(result.current.state.plan?.name).toBe('Alex weekend');
    expect(result.current.state.spendingCard?.rows.map((row) => row.id)).toEqual(['tx_2', 'tx_1']);
    expect(result.current.state.spendingCard?.count).toBe(2);
  });

  it('MA-305: a focus reload whose read drops a row shows the card without it', async () => {
    mockGetDetails
      .mockResolvedValueOnce({
        plan,
        spend: { cat_food: 2600 },
        transactions: [giftShop, fishMarket],
      })
      .mockResolvedValueOnce({ plan, spend: { cat_food: 1100 }, transactions: [fishMarket] });
    const { result } = await renderHook(() => useSpendingPlanDetail());
    await act(async () => {
      mockFocusEffect.mock.calls[0][0]();
    });
    await waitFor(() => expect(result.current.state.spendingCard?.rows).toHaveLength(2));

    await act(async () => {
      mockFocusEffect.mock.calls.at(-1)?.[0]();
    });

    await waitFor(() =>
      expect(result.current.state.spendingCard?.rows.map((row) => row.id)).toEqual(['tx_1']),
    );
    expect(mockGetDetails).toHaveBeenCalledTimes(2);
    expect(result.current.state.viewState).toBe('ready');
  });

  it("MA-305: opening a spending row pushes that transaction's stacked detail", async () => {
    mockGetDetails.mockResolvedValue({
      plan,
      spend: { cat_food: 1100 },
      transactions: [fishMarket],
    });
    const { result } = await renderHook(() => useSpendingPlanDetail());
    await act(async () => {
      mockFocusEffect.mock.calls[0][0]();
    });
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));

    await act(async () => result.current.openTransaction('tx_1'));

    expect(mockRouterPush).toHaveBeenCalledTimes(1);
    expect(mockRouterPush).toHaveBeenCalledWith('/stacked/transactions/detail/tx_1');
  });

  it("MA-305: asks the account lookup for the held rows' account ids", async () => {
    mockGetDetails.mockResolvedValue({
      plan,
      spend: { cat_food: 2600 },
      transactions: [giftShop, fishMarket],
    });
    const { result } = await renderHook(() => useSpendingPlanDetail());
    await act(async () => {
      mockFocusEffect.mock.calls[0][0]();
    });
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));

    await waitFor(() => {
      const asked = new Set(mockLoadAccountLookup.mock.calls.flatMap(([ids]) => ids));
      expect(asked).toEqual(new Set(['acc_card', 'acc_cash']));
    });
  });
});
