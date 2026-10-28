import {
  buildAccountChips,
  countFunnelFilters,
  pruneAccountFilter,
  toggleAccountFilter,
} from '@/components/ui/account_chips.helpers';
import { AccountType, AmountType, Currency, RecurrencePreset } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import {
  EMPTY_COMMITMENT_FILTERS,
  type CommitmentAdvancedFilters,
} from '@/modules/commitments/screens/commitments/filter/filter.store';
import {
  EMPTY_FILTERS,
  type AdvancedFilters,
} from '@/modules/transactions/screens/transactions/filter/filter.store';
import { makeTestAccount } from '@/test_helpers/transaction';

describe('buildAccountChips', () => {
  const wallet = makeTestAccount({
    id: 'acc-1',
    name: 'Wallet',
    color: '#1E88E5',
    type: AccountType.Bank,
  });
  const cib = makeTestAccount({
    id: 'acc-2',
    name: 'CIB',
    color: '#43A047',
    type: AccountType.CreditCard,
  });
  const accounts = [wallet, cib];

  it('puts All accounts first and on with no account applied, with no tile', () => {
    const chips = buildAccountChips(accounts, []);

    expect(chips.map((chip) => chip.label)).toEqual([Strings.filterAllAccounts, 'Wallet', 'CIB']);
    expect(chips[0]).toStrictEqual({
      accountId: undefined,
      label: Strings.filterAllAccounts,
      accessibilityLabel: Strings.filterAllAccounts,
      tile: undefined,
      selected: true,
    });
    expect(chips.filter((chip) => chip.selected)).toHaveLength(1);
  });

  it('lists one chip per account in list order with its type tile on the account colour', () => {
    const chips = buildAccountChips(accounts, []);

    expect(chips.slice(1)).toStrictEqual([
      {
        accountId: 'acc-1',
        label: 'Wallet',
        accessibilityLabel: Strings.filterAccountAccessibility('Wallet'),
        tile: { color: '#1E88E5', type: AccountType.Bank },
        selected: false,
      },
      {
        accountId: 'acc-2',
        label: 'CIB',
        accessibilityLabel: Strings.filterAccountAccessibility('CIB'),
        tile: { color: '#43A047', type: AccountType.CreditCard },
        selected: false,
      },
    ]);
  });

  it('turns on the one applied account and turns All accounts off', () => {
    const chips = buildAccountChips(accounts, ['acc-2']);

    expect(chips.map((chip) => [chip.accountId, chip.selected])).toEqual([
      [undefined, false],
      ['acc-1', false],
      ['acc-2', true],
    ]);
  });

  it('turns no chip on with two accounts applied', () => {
    const chips = buildAccountChips(accounts, ['acc-1', 'acc-2']);

    expect(chips).toHaveLength(3);
    expect(chips.some((chip) => chip.selected)).toBe(false);
  });

  it('reads a blank-named account as Unnamed account', () => {
    const chips = buildAccountChips([makeTestAccount({ id: 'acc-9', name: '' })], []);

    expect(chips[1].label).toBe(Strings.unnamedAccount);
  });

  it('gives an account with no colour a tile with a null colour and its type', () => {
    const chips = buildAccountChips([makeTestAccount({ color: null })], []);

    expect(chips[1].tile).toEqual({ color: null, type: AccountType.PhysicalWallet });
  });

  it('gives no chip to an archived or a deleted account', () => {
    const archived = makeTestAccount({ id: 'acc-3', name: 'Old', is_archived: 1 });
    const deleted = makeTestAccount({ id: 'acc-4', name: 'Gone', is_deleted: 1 });

    const chips = buildAccountChips([archived, wallet, deleted], []);

    expect(chips.map((chip) => [chip.accountId, chip.label])).toEqual([
      [undefined, Strings.filterAllAccounts],
      ['acc-1', 'Wallet'],
    ]);
  });
});

describe('countFunnelFilters', () => {
  it('counts nothing with no filter applied', () => {
    expect(countFunnelFilters(0, [])).toBe(0);
  });

  it('does not count one account, which the chip already shows', () => {
    expect(countFunnelFilters(1, ['a1'])).toBe(0);
  });

  it('counts two or more accounts as one', () => {
    expect(countFunnelFilters(1, ['a1', 'a2'])).toBe(1);
    expect(countFunnelFilters(1, ['a1', 'a2', 'a3'])).toBe(1);
  });

  it('counts the category and amount filters beside one account', () => {
    expect(countFunnelFilters(3, ['a1'])).toBe(2);
  });

  it('counts two accounts plus a category as two', () => {
    expect(countFunnelFilters(2, ['a1', 'a2'])).toBe(2);
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

  it('keeps the amount types and recurrence presets of a commitments filter', () => {
    const applied: CommitmentAdvancedFilters = {
      ...EMPTY_COMMITMENT_FILTERS,
      amountTypes: [AmountType.Variable],
      recurrencePresets: [RecurrencePreset.Weekly, RecurrencePreset.Annually],
    };

    expect(toggleAccountFilter(applied, 'a1')).toStrictEqual({ ...applied, accountIds: ['a1'] });
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

  it('keeps the amount types and recurrence presets of a commitments filter', () => {
    const applied: CommitmentAdvancedFilters = {
      ...EMPTY_COMMITMENT_FILTERS,
      accountIds: ['a1', 'gone'],
      amountTypes: [AmountType.Fixed],
      recurrencePresets: [RecurrencePreset.Monthly],
    };

    expect(pruneAccountFilter(applied, [wallet, cib])).toStrictEqual({
      ...applied,
      accountIds: ['a1'],
    });
  });
});
