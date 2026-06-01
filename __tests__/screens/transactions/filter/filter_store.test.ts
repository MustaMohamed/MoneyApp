import { Currency } from '@/constants/enums';
import {
  EMPTY_FILTERS_V2,
  useFilterStore,
  type AdvancedFilters,
} from '@/modules/transactions/screens/transactions/filter/filter.store';

beforeEach(() => {
  useFilterStore().resetDraft();
});

describe('useFilterStore initial state', () => {
  it('starts with the empty-filters draft', () => {
    expect(useFilterStore().state.draft.value).toEqual(EMPTY_FILTERS_V2);
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
    useFilterStore().setDraft(next);
    expect(useFilterStore().state.draft.value).toEqual(next);
  });

  it('resetDraft restores the empty-filters draft', () => {
    useFilterStore().setDraft({ ...EMPTY_FILTERS_V2, accountIds: ['a1'] });
    useFilterStore().resetDraft();
    expect(useFilterStore().state.draft.value).toEqual(EMPTY_FILTERS_V2);
  });
});

describe('useFilterStore toggleAccountId', () => {
  it('adds an id that is not yet selected', () => {
    useFilterStore().toggleAccountId('a1');
    expect(useFilterStore().state.draft.value.accountIds).toEqual(['a1']);
  });

  it('removes an id that is already selected', () => {
    useFilterStore().toggleAccountId('a1');
    useFilterStore().toggleAccountId('a1');
    expect(useFilterStore().state.draft.value.accountIds).toEqual([]);
  });
});

describe('useFilterStore toggleCategoryId', () => {
  it('adds an id that is not yet selected', () => {
    useFilterStore().toggleCategoryId('c1');
    expect(useFilterStore().state.draft.value.categoryIds).toEqual(['c1']);
  });

  it('removes an id that is already selected', () => {
    useFilterStore().toggleCategoryId('c1');
    useFilterStore().toggleCategoryId('c1');
    expect(useFilterStore().state.draft.value.categoryIds).toEqual([]);
  });
});

describe('useFilterStore amount setters', () => {
  it('setAmountMin sets and clears the minimum', () => {
    useFilterStore().setAmountMin(25);
    expect(useFilterStore().state.draft.value.amountMin).toBe(25);
    useFilterStore().setAmountMin(undefined);
    expect(useFilterStore().state.draft.value.amountMin).toBeUndefined();
  });

  it('setAmountMax sets and clears the maximum', () => {
    useFilterStore().setAmountMax(100);
    expect(useFilterStore().state.draft.value.amountMax).toBe(100);
    useFilterStore().setAmountMax(undefined);
    expect(useFilterStore().state.draft.value.amountMax).toBeUndefined();
  });

  it('setAmountCurrency switches the currency', () => {
    useFilterStore().setAmountCurrency(Currency.USD);
    expect(useFilterStore().state.draft.value.amountCurrency).toBe(Currency.USD);
  });
});
