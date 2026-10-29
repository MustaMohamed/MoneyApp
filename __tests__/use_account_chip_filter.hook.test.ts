import { act, renderHook } from '@testing-library/react-native';
import { create } from 'zustand';

import type { AccountChipModel } from '@/components/ui/account_chips.helpers';
import type { Account } from '@/modules/accounts/entities/account.entity';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useAccountChipFilter } from '@/modules/accounts/store/use_account_chip_filter.hook';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';
import { makeTestAccount } from '@/test_helpers/transaction';

jest.mock('@/modules/accounts/store/account.store', () => ({ useAccountStore: jest.fn() }));

interface TestFilters {
  accountIds: string[];
  categoryIds: string[];
}

interface TestFilterState {
  appliedFilters: TestFilters;
  setAppliedFilters: (filters: TestFilters) => void;
}

interface MockAccountState {
  accounts: Account[];
  hasLoaded: boolean;
}

const cash = makeTestAccount({ id: 'acc-cash', name: 'Cash' });
const bank = makeTestAccount({ id: 'acc-bank', name: 'Bank' });
const wallet = makeTestAccount({ id: 'acc-wallet', name: 'Wallet' });
const ARCHIVED_ID = 'acc-archived';
const CATEGORY_IDS = ['cat-food'];

let mockAccounts: MockAccountState;

function makeFilterStore(accountIds: string[]) {
  return create<TestFilterState>()((set) => ({
    appliedFilters: { accountIds, categoryIds: CATEGORY_IDS },
    setAppliedFilters: (appliedFilters) => set({ appliedFilters }),
  }));
}

type FilterStore = ReturnType<typeof makeFilterStore>;

function renderLive(store: FilterStore) {
  return renderHook(() =>
    useAccountChipFilter(
      store((s) => s.appliedFilters),
      store,
    ),
  );
}

beforeEach(() => {
  mockAccounts = { accounts: [cash, bank, wallet], hasLoaded: true };
  attachMockSelectorStore(useAccountStore as unknown as jest.Mock, () => mockAccounts);
});

describe('useAccountChipFilter, pruning', () => {
  it('keeps an archived id in the effective filter and in the store before the first account load', async () => {
    mockAccounts = { accounts: [], hasLoaded: false };
    const store = makeFilterStore([ARCHIVED_ID]);
    const applied = store.getState().appliedFilters;

    const { result } = await renderLive(store);

    expect(result.current.effectiveFilters).toBe(applied);
    expect(store.getState().appliedFilters).toBe(applied);
    expect(store.getState().appliedFilters.accountIds).toEqual([ARCHIVED_ID]);
  });

  it('drops an archived id from the effective filter and from the store once loaded, and keeps the categories', async () => {
    const store = makeFilterStore([ARCHIVED_ID, cash.id]);

    const { result } = await renderLive(store);

    expect(result.current.effectiveFilters).toEqual({
      accountIds: [cash.id],
      categoryIds: CATEGORY_IDS,
    });
    expect(store.getState().appliedFilters).toEqual({
      accountIds: [cash.id],
      categoryIds: CATEGORY_IDS,
    });
  });

  it('prunes the store and not the render argument, so a chip press that lands before the load stays applied', async () => {
    mockAccounts = { accounts: [], hasLoaded: false };
    const store = makeFilterStore([ARCHIVED_ID]);
    const stale = store.getState().appliedFilters;
    const hook = await renderHook(
      ({ applied }: { applied: TestFilters }) => useAccountChipFilter(applied, store),
      { initialProps: { applied: stale } },
    );

    await act(async () => {
      hook.result.current.toggleAccountChip(cash.id);
    });
    mockAccounts = { accounts: [cash, bank, wallet], hasLoaded: true };
    await hook.rerender({ applied: stale });

    expect(store.getState().appliedFilters).toEqual({
      accountIds: [cash.id],
      categoryIds: CATEGORY_IDS,
    });
  });

  it('prunes again when an archived id is applied after the load while the accounts stay the same', async () => {
    const store = makeFilterStore([cash.id]);
    const { result } = await renderLive(store);

    await act(async () => {
      store.getState().setAppliedFilters({ accountIds: [ARCHIVED_ID], categoryIds: CATEGORY_IDS });
    });

    expect(store.getState().appliedFilters).toEqual({ accountIds: [], categoryIds: CATEGORY_IDS });
    expect(result.current.effectiveFilters).toEqual({ accountIds: [], categoryIds: CATEGORY_IDS });
  });
});

describe('useAccountChipFilter, toggling', () => {
  it.each([
    ['All accounts clears the one applied account', [cash.id], undefined, []],
    ['All accounts clears two applied accounts', [cash.id, bank.id], undefined, []],
    ['the lit chip clears its account', [cash.id], cash.id, []],
    ['another chip applies its account alone', [cash.id], bank.id, [bank.id]],
    [
      'a chip applies its account alone over two applied',
      [cash.id, bank.id],
      wallet.id,
      [wallet.id],
    ],
    ['a chip of one of two applied applies it alone', [cash.id, bank.id], cash.id, [cash.id]],
  ])('%s and keeps the categories', async (_name, applied, pressed, expected) => {
    const store = makeFilterStore(applied);
    const { result } = await renderLive(store);

    await act(async () => {
      result.current.toggleAccountChip(pressed);
    });

    expect(store.getState().appliedFilters).toEqual({
      accountIds: expected,
      categoryIds: CATEGORY_IDS,
    });
  });

  it('keeps the identity of toggleAccountChip across a rerender', async () => {
    const store = makeFilterStore([]);
    const hook = await renderLive(store);
    const before = hook.result.current.toggleAccountChip;

    await act(async () => {
      store.getState().setAppliedFilters({ accountIds: [cash.id], categoryIds: CATEGORY_IDS });
    });
    await hook.rerender({});

    expect(hook.result.current.toggleAccountChip).toBe(before);
  });
});

describe('useAccountChipFilter, chips', () => {
  function litIds(chips: readonly AccountChipModel[]): Array<string | undefined> {
    return chips.filter((chip) => chip.selected).map((chip) => chip.accountId);
  }

  it('lights All accounts only with no account applied', async () => {
    const { result } = await renderLive(makeFilterStore([]));

    expect(litIds(result.current.accountChips)).toEqual([undefined]);
  });

  it("lights an account's chip only with that one account applied", async () => {
    const { result } = await renderLive(makeFilterStore([bank.id]));

    expect(litIds(result.current.accountChips)).toEqual([bank.id]);
  });

  it('lights no chip with two accounts applied', async () => {
    const { result } = await renderLive(makeFilterStore([cash.id, bank.id]));

    expect(litIds(result.current.accountChips)).toEqual([]);
  });

  it('draws All accounts, then one chip per loaded account', async () => {
    const { result } = await renderLive(makeFilterStore([]));

    expect(result.current.accountChips.map((chip: AccountChipModel) => chip.accountId)).toEqual([
      undefined,
      cash.id,
      bank.id,
      wallet.id,
    ]);
  });
});
