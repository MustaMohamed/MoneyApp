import { Currency } from '@/constants/enums';
import {
  advancedFiltersEqual,
  formatAppliedFilterSummary,
  countActiveFilters,
} from '@/modules/transactions/screens/transactions/filter/filter.helpers';
import {
  EMPTY_FILTERS_V2,
  type AdvancedFilters,
} from '@/modules/transactions/screens/transactions/filter/filter.store';

describe('advancedFiltersEqual', () => {
  it('treats empty filters as equal', () => {
    expect(advancedFiltersEqual(EMPTY_FILTERS_V2, { ...EMPTY_FILTERS_V2 })).toBe(true);
  });

  it('ignores id order for account and category selections', () => {
    const a: AdvancedFilters = {
      ...EMPTY_FILTERS_V2,
      accountIds: ['a2', 'a1'],
      categoryIds: ['c2', 'c1'],
    };
    const b: AdvancedFilters = {
      ...EMPTY_FILTERS_V2,
      accountIds: ['a1', 'a2'],
      categoryIds: ['c1', 'c2'],
    };
    expect(advancedFiltersEqual(a, b)).toBe(true);
  });

  it('detects amount range differences', () => {
    expect(
      advancedFiltersEqual(
        { ...EMPTY_FILTERS_V2, amountMin: 100 },
        { ...EMPTY_FILTERS_V2, amountMin: 101 },
      ),
    ).toBe(false);
  });

  it('ignores amount currency when neither side has an amount range', () => {
    expect(
      advancedFiltersEqual(
        { ...EMPTY_FILTERS_V2, amountCurrency: Currency.EGP },
        { ...EMPTY_FILTERS_V2, amountCurrency: Currency.USD },
      ),
    ).toBe(true);
  });

  it('compares amount currency when an amount range is active', () => {
    expect(
      advancedFiltersEqual(
        { ...EMPTY_FILTERS_V2, amountCurrency: Currency.EGP, amountMin: 100 },
        { ...EMPTY_FILTERS_V2, amountCurrency: Currency.USD, amountMin: 100 },
      ),
    ).toBe(false);
  });
});

describe('formatAppliedFilterSummary', () => {
  const accounts = new Map([
    ['a1', { name: 'CIB' }],
    ['a2', { name: 'Wallet' }],
  ]);
  const categories = new Map([
    ['c1', { name: 'Food' }],
    ['c2', { name: 'Groceries' }],
  ]);

  it('returns null when there are no applied filters', () => {
    expect(formatAppliedFilterSummary(EMPTY_FILTERS_V2, accounts, categories)).toBeNull();
  });

  it('combines account and category names for concise list-header context', () => {
    expect(
      formatAppliedFilterSummary(
        { ...EMPTY_FILTERS_V2, accountIds: ['a1'], categoryIds: ['c1'] },
        accounts,
        categories,
      ),
    ).toBe('CIB + Food');
  });

  it('uses existing selection summary formatting for multiple selected names', () => {
    expect(
      formatAppliedFilterSummary(
        { ...EMPTY_FILTERS_V2, accountIds: ['a1', 'a2'], categoryIds: ['c1', 'c2'] },
        accounts,
        categories,
      ),
    ).toBe('CIB, Wallet + Food, Groceries');
  });

  it('includes amount summary when amount filters are active', () => {
    expect(
      formatAppliedFilterSummary(
        { ...EMPTY_FILTERS_V2, amountCurrency: Currency.EGP, amountMin: 500 },
        accounts,
        categories,
      ),
    ).toBe('From 500 EGP');
  });
});

describe('countActiveFilters', () => {
  it('keeps existing active-filter counting behavior', () => {
    expect(
      countActiveFilters({
        ...EMPTY_FILTERS_V2,
        accountIds: ['a1'],
        categoryIds: ['c1'],
        amountMin: 100,
      }),
    ).toBe(3);
  });
});
