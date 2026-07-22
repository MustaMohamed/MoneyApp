import { act, renderHook } from '@testing-library/react-native';

import { Currency } from '@/constants/enums';
import { useFilterSheet } from '@/modules/transactions/screens/transactions/filter/filter.hook';
import {
  EMPTY_FILTERS,
  useFilterStore,
} from '@/modules/transactions/screens/transactions/filter/filter.store';
import { useTransactionsScreenStore } from '@/modules/transactions/screens/transactions/transactions.store';

beforeEach(() => {
  useFilterStore.getState().resetDraft();
  useTransactionsScreenStore.getState().reset();
});

describe('useFilterSheet apply/reset behavior', () => {
  it('disables Apply when draft and applied filters match', () => {
    const { result } = renderHook(() => useFilterSheet());

    expect(result.current.state.canApply).toBe(false);
  });

  it('enables Apply when the draft has new filters', () => {
    const { result } = renderHook(() => useFilterSheet());

    act(() => result.current.toggleAccountId('a1'));

    expect(result.current.state.draftCount).toBe(1);
    expect(result.current.state.canApply).toBe(true);
  });

  it('allows Reset then Apply to clear already-applied filters', () => {
    useTransactionsScreenStore
      .getState()
      .setAppliedFilters({ ...EMPTY_FILTERS, accountIds: ['a1'] });
    useFilterStore.getState().setDraft({ ...EMPTY_FILTERS, accountIds: ['a1'] });

    const { result } = renderHook(() => useFilterSheet());
    expect(result.current.state.canApply).toBe(false);

    act(() => result.current.resetDraft());
    expect(result.current.state.draft).toEqual(EMPTY_FILTERS);
    expect(result.current.state.draftCount).toBe(0);
    expect(result.current.state.canApply).toBe(true);

    act(() => result.current.applyDraft());
    expect(useTransactionsScreenStore.getState().appliedFilters).toEqual(EMPTY_FILTERS);
  });

  it('tracks amount-currency changes only when an amount range is active', () => {
    const { result } = renderHook(() => useFilterSheet());

    act(() => result.current.setAmountCurrency(Currency.USD));
    expect(result.current.state.canApply).toBe(false);

    act(() => result.current.setAmountMin(100));
    expect(result.current.state.canApply).toBe(true);
  });

  it('preserves malformed amount text, shows an error, and blocks Apply', () => {
    const { result } = renderHook(() => useFilterSheet());

    act(() => result.current.setAmountMinText('50abc'));

    expect(result.current.state.amountMinText).toBe('50abc');
    expect(result.current.state.amountMinError).toBeTruthy();
    expect(result.current.state.canApply).toBe(false);
    expect(result.current.state.canReset).toBe(true);
  });

  it('blocks a reversed range until the bounds are ordered', () => {
    const { result } = renderHook(() => useFilterSheet());

    act(() => {
      result.current.setAmountMinText('500');
      result.current.setAmountMaxText('100');
    });

    expect(result.current.state.amountRangeError).toBeTruthy();
    expect(result.current.state.canApply).toBe(false);

    act(() => result.current.setAmountMaxText('600'));
    expect(result.current.state.amountRangeError).toBeUndefined();
    expect(result.current.state.canApply).toBe(true);
  });

  it('does not publish an invalid draft when apply is invoked defensively', () => {
    const { result } = renderHook(() => useFilterSheet());

    act(() => result.current.setAmountMaxText('-1'));
    act(() => result.current.applyDraft());

    expect(useTransactionsScreenStore.getState().appliedFilters).toEqual(EMPTY_FILTERS);
  });
});
