import { Currency } from '@/constants/enums';
import {
  advancedFiltersEqual,
  countActiveFilters,
  formatAppliedFilterSummary,
  parseAmountInput,
  validateAmountRange,
} from '@/modules/transactions/screens/transactions/filter/filter.helpers';
import {
  EMPTY_FILTERS,
  type AdvancedFilters,
} from '@/modules/transactions/screens/transactions/filter/filter.store';

describe('advancedFiltersEqual', () => {
  it('treats empty filters as equal', () => {
    expect(advancedFiltersEqual(EMPTY_FILTERS, { ...EMPTY_FILTERS })).toBe(true);
  });

  it('ignores id order for account and category selections', () => {
    const a: AdvancedFilters = {
      ...EMPTY_FILTERS,
      accountIds: ['a2', 'a1'],
      categoryIds: ['c2', 'c1'],
    };
    const b: AdvancedFilters = {
      ...EMPTY_FILTERS,
      accountIds: ['a1', 'a2'],
      categoryIds: ['c1', 'c2'],
    };
    expect(advancedFiltersEqual(a, b)).toBe(true);
  });

  it('detects amount range differences', () => {
    expect(
      advancedFiltersEqual(
        { ...EMPTY_FILTERS, amountMin: 100 },
        { ...EMPTY_FILTERS, amountMin: 101 },
      ),
    ).toBe(false);
  });

  it('ignores amount currency when neither side has an amount range', () => {
    expect(
      advancedFiltersEqual(
        { ...EMPTY_FILTERS, amountCurrency: Currency.EGP },
        { ...EMPTY_FILTERS, amountCurrency: Currency.USD },
      ),
    ).toBe(true);
  });

  it('compares amount currency when an amount range is active', () => {
    expect(
      advancedFiltersEqual(
        { ...EMPTY_FILTERS, amountCurrency: Currency.EGP, amountMin: 100 },
        { ...EMPTY_FILTERS, amountCurrency: Currency.USD, amountMin: 100 },
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
    expect(formatAppliedFilterSummary(EMPTY_FILTERS, accounts, categories)).toBeNull();
  });

  it('combines account and category names for concise list-header context', () => {
    expect(
      formatAppliedFilterSummary(
        { ...EMPTY_FILTERS, accountIds: ['a1'], categoryIds: ['c1'] },
        accounts,
        categories,
      ),
    ).toBe('CIB + Food');
  });

  it('uses existing selection summary formatting for multiple selected names', () => {
    expect(
      formatAppliedFilterSummary(
        { ...EMPTY_FILTERS, accountIds: ['a1', 'a2'], categoryIds: ['c1', 'c2'] },
        accounts,
        categories,
      ),
    ).toBe('CIB, Wallet + Food, Groceries');
  });

  it('includes amount summary when amount filters are active', () => {
    expect(
      formatAppliedFilterSummary(
        { ...EMPTY_FILTERS, amountCurrency: Currency.EGP, amountMin: 500 },
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
        ...EMPTY_FILTERS,
        accountIds: ['a1'],
        categoryIds: ['c1'],
        amountMin: 100,
      }),
    ).toBe(3);
  });
});

describe('amount range validation', () => {
  it.each([
    ['5,000.25', 5000.25],
    ['0', 0],
    ['50abc', undefined],
    ['12,34', undefined],
    ['-1', undefined],
    // W2E §3.2 row 5 / §8.4: unfloored now — below MIN_MONEY_AMOUNT still
    // parses and reaches the SELECT bind, closing the #302 residual.
    ['0.005', 0.005],
  ])('strictly parses %s', (input, expected) => {
    expect(parseAmountInput(input)).toBe(expected);
  });

  it('accepts blank bounds and a valid ordered range', () => {
    expect(validateAmountRange('', '')).toMatchObject({ isValid: true });
    expect(validateAmountRange('1,000', '2,500')).toEqual({
      isValid: true,
      min: 1000,
      max: 2500,
      minError: undefined,
      maxError: undefined,
      rangeError: undefined,
    });
  });

  it('returns field errors without discarding malformed input', () => {
    const validation = validateAmountRange('50abc', '-2');
    expect(validation).toMatchObject({
      isValid: false,
      min: undefined,
      max: undefined,
    });
    expect(typeof validation.minError).toBe('string');
    expect(typeof validation.maxError).toBe('string');
  });

  it('rejects a minimum above the maximum', () => {
    const validation = validateAmountRange('500', '100');
    expect(validation).toMatchObject({
      isValid: false,
      min: 500,
      max: 100,
    });
    expect(typeof validation.rangeError).toBe('string');
  });
});
