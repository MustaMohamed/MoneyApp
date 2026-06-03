import { act, renderHook } from '@testing-library/react-native';

import { Currency } from '@/constants/enums';
import {
  EMPTY_FILTERS_V2,
  useFilterStore,
  type AdvancedFilters,
} from '@/modules/transactions/screens/transactions/filter/filter.store';

function setup() {
  const hook = renderHook(() => useFilterStore());
  act(() => hook.result.current.resetDraft());
  return hook;
}

describe('useFilterStore initial state', () => {
  it('starts with the empty-filters draft', () => {
    const { result } = setup();

    expect(result.current.state.draft.value).toEqual(EMPTY_FILTERS_V2);
  });
});

describe('useFilterStore setDraft / resetDraft', () => {
  it('setDraft replaces the entire draft', () => {
    const { result } = setup();
    const next: AdvancedFilters = {
      accountIds: ['a1'],
      categoryIds: ['c1'],
      amountCurrency: Currency.USD,
      amountMin: 10,
      amountMax: 50,
    };

    act(() => result.current.setDraft(next));

    expect(result.current.state.draft.value).toEqual(next);
  });

  it('resetDraft restores the empty-filters draft', () => {
    const { result } = setup();

    act(() => result.current.setDraft({ ...EMPTY_FILTERS_V2, accountIds: ['a1'] }));
    act(() => result.current.resetDraft());

    expect(result.current.state.draft.value).toEqual(EMPTY_FILTERS_V2);
  });
});

describe('useFilterStore toggleAccountId', () => {
  it('adds an id that is not yet selected', () => {
    const { result } = setup();

    act(() => result.current.toggleAccountId('a1'));

    expect(result.current.state.draft.value.accountIds).toEqual(['a1']);
  });

  it('removes an id that is already selected', () => {
    const { result } = setup();

    act(() => result.current.toggleAccountId('a1'));
    act(() => result.current.toggleAccountId('a1'));

    expect(result.current.state.draft.value.accountIds).toEqual([]);
  });
});

describe('useFilterStore toggleCategoryId', () => {
  it('adds an id that is not yet selected', () => {
    const { result } = setup();

    act(() => result.current.toggleCategoryId('c1'));

    expect(result.current.state.draft.value.categoryIds).toEqual(['c1']);
  });

  it('removes an id that is already selected', () => {
    const { result } = setup();

    act(() => result.current.toggleCategoryId('c1'));
    act(() => result.current.toggleCategoryId('c1'));

    expect(result.current.state.draft.value.categoryIds).toEqual([]);
  });
});

describe('useFilterStore amount setters', () => {
  it('setAmountMin sets and clears the minimum', () => {
    const { result } = setup();

    act(() => result.current.setAmountMin(25));
    expect(result.current.state.draft.value.amountMin).toBe(25);
    act(() => result.current.setAmountMin(undefined));
    expect(result.current.state.draft.value.amountMin).toBeUndefined();
  });

  it('setAmountMax sets and clears the maximum', () => {
    const { result } = setup();

    act(() => result.current.setAmountMax(100));
    expect(result.current.state.draft.value.amountMax).toBe(100);
    act(() => result.current.setAmountMax(undefined));
    expect(result.current.state.draft.value.amountMax).toBeUndefined();
  });

  it('setAmountCurrency switches the currency', () => {
    const { result } = setup();

    act(() => result.current.setAmountCurrency(Currency.USD));

    expect(result.current.state.draft.value.amountCurrency).toBe(Currency.USD);
  });
});
