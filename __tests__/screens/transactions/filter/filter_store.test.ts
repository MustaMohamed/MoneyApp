import { Currency } from '@/constants/enums';
import {
  EMPTY_FILTERS_V2,
  useFilterStore,
  type AdvancedFilters,
} from '@/screens/transactions/filter/filter.store';

beforeEach(() => {
  useFilterStore.getState().resetDraft();
});

describe('useFilterStore initial state', () => {
  it('starts with the empty-filters draft', () => {
    expect(useFilterStore.getState().state.draft).toEqual(EMPTY_FILTERS_V2);
  });
});

describe('useFilterStore setDraft / resetDraft', () => {
  it('setDraft replaces the entire draft', () => {
    const next: AdvancedFilters = {
      accountIds: ['a1'],
      categoryIds: ['c1'],
      amountCurrency: Currency.USD,
      amountMin: 10,
      amountMax: 50,
    };
    useFilterStore.getState().setDraft(next);
    expect(useFilterStore.getState().state.draft).toEqual(next);
  });

  it('resetDraft restores the empty-filters draft', () => {
    useFilterStore.getState().setDraft({ ...EMPTY_FILTERS_V2, accountIds: ['a1'] });
    useFilterStore.getState().resetDraft();
    expect(useFilterStore.getState().state.draft).toEqual(EMPTY_FILTERS_V2);
  });
});

describe('useFilterStore toggleAccountId', () => {
  it('adds an id that is not yet selected', () => {
    useFilterStore.getState().toggleAccountId('a1');
    expect(useFilterStore.getState().state.draft.accountIds).toEqual(['a1']);
  });

  it('removes an id that is already selected', () => {
    useFilterStore.getState().toggleAccountId('a1');
    useFilterStore.getState().toggleAccountId('a1');
    expect(useFilterStore.getState().state.draft.accountIds).toEqual([]);
  });
});

describe('useFilterStore toggleCategoryId', () => {
  it('adds an id that is not yet selected', () => {
    useFilterStore.getState().toggleCategoryId('c1');
    expect(useFilterStore.getState().state.draft.categoryIds).toEqual(['c1']);
  });

  it('removes an id that is already selected', () => {
    useFilterStore.getState().toggleCategoryId('c1');
    useFilterStore.getState().toggleCategoryId('c1');
    expect(useFilterStore.getState().state.draft.categoryIds).toEqual([]);
  });
});

describe('useFilterStore amount setters', () => {
  it('setAmountMin sets and clears the minimum', () => {
    useFilterStore.getState().setAmountMin(25);
    expect(useFilterStore.getState().state.draft.amountMin).toBe(25);
    useFilterStore.getState().setAmountMin(undefined);
    expect(useFilterStore.getState().state.draft.amountMin).toBeUndefined();
  });

  it('setAmountMax sets and clears the maximum', () => {
    useFilterStore.getState().setAmountMax(100);
    expect(useFilterStore.getState().state.draft.amountMax).toBe(100);
    useFilterStore.getState().setAmountMax(undefined);
    expect(useFilterStore.getState().state.draft.amountMax).toBeUndefined();
  });

  it('setAmountCurrency switches the currency', () => {
    useFilterStore.getState().setAmountCurrency(Currency.USD);
    expect(useFilterStore.getState().state.draft.amountCurrency).toBe(Currency.USD);
  });
});
