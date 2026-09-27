import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import {
  advancedFiltersEqual,
  countActiveFilters,
  countFunnelFilters,
  formatAppliedFilterSummary,
  labelAccountsById,
  parseAmountInput,
  pruneAccountFilter,
  toggleAccountFilter,
  validateAmountRange,
} from '@/modules/transactions/screens/transactions/filter/filter.helpers';
import {
  EMPTY_FILTERS,
  type AdvancedFilters,
} from '@/modules/transactions/screens/transactions/filter/filter.store';
import { makeTestAccount } from '@/test_helpers/transaction';

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

  it('reads a blank-named account as "Unnamed account" through the label map (MA-062)', () => {
    const labels = labelAccountsById(
      new Map([
        ['a1', makeTestAccount({ id: 'a1', name: '' })],
        ['a2', makeTestAccount({ id: 'a2', name: 'Wallet' })],
      ]),
    );

    expect(
      formatAppliedFilterSummary(
        { ...EMPTY_FILTERS, accountIds: ['a1', 'a2'] },
        labels,
        categories,
      ),
    ).toBe(`${Strings.unnamedAccount}, Wallet`);
  });

  it('reads a deleted account as "Deleted Account" through the label map', () => {
    const labels = labelAccountsById(
      new Map([['a1', makeTestAccount({ id: 'a1', name: '', is_archived: 1, is_deleted: 1 })]]),
    );

    expect(
      formatAppliedFilterSummary({ ...EMPTY_FILTERS, accountIds: ['a1'] }, labels, categories),
    ).toBe(Strings.deletedAccount);
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

describe('countFunnelFilters', () => {
  it('counts nothing with no filter applied', () => {
    expect(countFunnelFilters(EMPTY_FILTERS)).toBe(0);
  });

  it('does not count one account, which the chip already shows', () => {
    expect(countFunnelFilters({ ...EMPTY_FILTERS, accountIds: ['a1'] })).toBe(0);
  });

  it('counts two or more accounts as one', () => {
    expect(countFunnelFilters({ ...EMPTY_FILTERS, accountIds: ['a1', 'a2'] })).toBe(1);
    expect(countFunnelFilters({ ...EMPTY_FILTERS, accountIds: ['a1', 'a2', 'a3'] })).toBe(1);
  });

  it('counts the category and amount filters beside one account', () => {
    expect(
      countFunnelFilters({
        ...EMPTY_FILTERS,
        accountIds: ['a1'],
        categoryIds: ['c1'],
        amountMin: 100,
      }),
    ).toBe(2);
  });

  it('counts two accounts plus a category as two', () => {
    expect(
      countFunnelFilters({ ...EMPTY_FILTERS, accountIds: ['a1', 'a2'], categoryIds: ['c1'] }),
    ).toBe(2);
  });
});

describe('toggleAccountFilter', () => {
  const others: Pick<
    AdvancedFilters,
    'categoryIds' | 'amountMin' | 'amountMax' | 'amountCurrency'
  > = {
    categoryIds: ['c1'],
    amountMin: 100,
    amountMax: 500,
    amountCurrency: Currency.USD,
  };

  it('turns an account on from no account applied', () => {
    expect(toggleAccountFilter({ ...EMPTY_FILTERS, ...others, accountIds: [] }, 'a1')).toEqual({
      ...others,
      accountIds: ['a1'],
    });
  });

  it('clears the account when the on chip is tapped again', () => {
    expect(toggleAccountFilter({ ...EMPTY_FILTERS, ...others, accountIds: ['a1'] }, 'a1')).toEqual({
      ...others,
      accountIds: [],
    });
  });

  it('switches to another account with one applied', () => {
    expect(toggleAccountFilter({ ...EMPTY_FILTERS, ...others, accountIds: ['a1'] }, 'a2')).toEqual({
      ...others,
      accountIds: ['a2'],
    });
  });

  it('narrows two applied accounts to the tapped one', () => {
    expect(
      toggleAccountFilter({ ...EMPTY_FILTERS, ...others, accountIds: ['a1', 'a2'] }, 'a2'),
    ).toEqual({ ...others, accountIds: ['a2'] });
  });

  it('clears two applied accounts when All accounts is tapped', () => {
    expect(
      toggleAccountFilter({ ...EMPTY_FILTERS, ...others, accountIds: ['a1', 'a2'] }, undefined),
    ).toEqual({ ...others, accountIds: [] });
  });

  it('keeps no account applied when All accounts is tapped with none applied', () => {
    expect(toggleAccountFilter({ ...EMPTY_FILTERS, ...others, accountIds: [] }, undefined)).toEqual(
      { ...others, accountIds: [] },
    );
  });
});

describe('pruneAccountFilter', () => {
  const wallet = makeTestAccount({ id: 'a1', name: 'Wallet' });
  const cib = makeTestAccount({ id: 'a2', name: 'CIB' });

  it('drops the only applied account once it is no longer active (archived)', () => {
    const applied: AdvancedFilters = { ...EMPTY_FILTERS, accountIds: ['a3'], categoryIds: ['c1'] };
    expect(pruneAccountFilter(applied, [wallet, cib])).toEqual({
      ...applied,
      accountIds: [],
    });
  });

  it('keeps the other account when one of two applied is archived', () => {
    const applied: AdvancedFilters = { ...EMPTY_FILTERS, accountIds: ['a1', 'a3'] };
    expect(pruneAccountFilter(applied, [wallet, cib])).toEqual({
      ...applied,
      accountIds: ['a1'],
    });
  });

  it('drops a deleted account id absent from the active list', () => {
    const applied: AdvancedFilters = { ...EMPTY_FILTERS, accountIds: ['gone'], amountMin: 100 };
    expect(pruneAccountFilter(applied, [])).toEqual({ ...applied, accountIds: [] });
  });

  it('returns the same filters object when nothing is dropped', () => {
    const applied: AdvancedFilters = { ...EMPTY_FILTERS, accountIds: ['a1', 'a2'] };
    expect(pruneAccountFilter(applied, [wallet, cib])).toBe(applied);
    expect(pruneAccountFilter(EMPTY_FILTERS, [])).toBe(EMPTY_FILTERS);
  });
});

describe('amount range validation', () => {
  it.each([
    ['5,000.25', 5000.25],
    ['0', 0],
    ['50abc', undefined],
    ['12,34', undefined],
    ['-1', undefined],
    // Amounts below `MIN_MONEY_AMOUNT` still parse; the parser does not floor.
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
