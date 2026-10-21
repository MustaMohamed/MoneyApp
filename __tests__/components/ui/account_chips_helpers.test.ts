import { buildAccountChips } from '@/components/ui/account_chips.helpers';
import { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
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
