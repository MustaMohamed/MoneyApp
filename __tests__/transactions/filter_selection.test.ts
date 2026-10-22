import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import {
  type NamedEntity,
  formatSelectionSummary,
  hasAmountFilter,
  sameStringSet,
  selectedNames,
} from '@/modules/transactions/utils/filter_selection';

describe('formatSelectionSummary', () => {
  const ALL = Strings.filterSummaryAccountsEmpty;

  it('reads no names as the all label', () => {
    expect(formatSelectionSummary([], ALL)).toBe('All accounts');
  });

  it('reads one name as that name', () => {
    expect(formatSelectionSummary(['Cash'], ALL)).toBe('Cash');
  });

  it('joins two names with a comma', () => {
    expect(formatSelectionSummary(['Cash', 'CIB'], ALL)).toBe('Cash, CIB');
  });

  it('shows the first two of three names and counts the third', () => {
    expect(formatSelectionSummary(['Cash', 'CIB', 'NBE'], ALL)).toBe('Cash, CIB +1');
  });

  it('counts every name past the second', () => {
    expect(formatSelectionSummary(['Cash', 'CIB', 'NBE', 'QNB'], ALL)).toBe('Cash, CIB +2');
  });
});

describe('sameStringSet', () => {
  it('ignores order', () => {
    expect(sameStringSet(['a', 'b', 'c'], ['c', 'a', 'b'])).toBe(true);
  });

  it('reads a length mismatch as different', () => {
    expect(sameStringSet(['a'], ['a', 'b'])).toBe(false);
  });

  it('reads a repeated id against two distinct ids as different', () => {
    expect(sameStringSet(['a', 'a'], ['a', 'b'])).toBe(false);
  });
});

describe('hasAmountFilter', () => {
  it('is false with neither bound set', () => {
    expect(hasAmountFilter({ amountCurrency: Currency.EGP })).toBe(false);
  });

  it('is true with only a minimum', () => {
    expect(hasAmountFilter({ amountCurrency: Currency.EGP, amountMin: 100 })).toBe(true);
  });

  it('is true with only a maximum', () => {
    expect(hasAmountFilter({ amountCurrency: Currency.USD, amountMax: 500 })).toBe(true);
  });

  it('counts a minimum of 0 as set', () => {
    expect(hasAmountFilter({ amountCurrency: Currency.EGP, amountMin: 0 })).toBe(true);
  });
});

describe('selectedNames', () => {
  const source: ReadonlyMap<string, NamedEntity> = new Map([
    ['a', { name: 'Alpha' }],
    ['b', { name: 'Beta' }],
  ]);

  it('keeps the order of the ids, not of the map', () => {
    expect(selectedNames(['b', 'a'], source)).toEqual(['Beta', 'Alpha']);
  });

  it('drops an id the map does not hold', () => {
    expect(selectedNames(['a', 'missing', 'b'], source)).toEqual(['Alpha', 'Beta']);
  });
});
