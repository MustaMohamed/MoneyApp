import { Strings } from '@/constants/strings';
import { resolveAccountGlyphColor } from '@/modules/accounts/constants/account_glyph_color';
import { buildAccountChips } from '@/modules/transactions/screens/transactions/components/account_chips.helpers';
import { makeTestAccount } from '@/test_helpers/transaction';

describe('buildAccountChips', () => {
  const wallet = makeTestAccount({ id: 'acc-1', name: 'Wallet', color: '#1E88E5' });
  const cib = makeTestAccount({ id: 'acc-2', name: 'CIB', color: '#43A047' });
  const accounts = [wallet, cib];

  it('puts All accounts first and on with no account applied', () => {
    const chips = buildAccountChips(accounts, []);

    expect(chips.map((chip) => chip.label)).toEqual([Strings.filterAllAccounts, 'Wallet', 'CIB']);
    expect(chips[0]).toEqual({
      accountId: undefined,
      label: Strings.filterAllAccounts,
      accessibilityLabel: Strings.filterAllAccounts,
      dotColor: undefined,
      selected: true,
    });
    expect(chips.filter((chip) => chip.selected)).toHaveLength(1);
  });

  it('lists one chip per account in list order with its id and dot colour', () => {
    const chips = buildAccountChips(accounts, []);

    expect(chips.slice(1)).toEqual([
      {
        accountId: 'acc-1',
        label: 'Wallet',
        accessibilityLabel: Strings.filterAccountAccessibility('Wallet'),
        dotColor: resolveAccountGlyphColor('#1E88E5'),
        selected: false,
      },
      {
        accountId: 'acc-2',
        label: 'CIB',
        accessibilityLabel: Strings.filterAccountAccessibility('CIB'),
        dotColor: resolveAccountGlyphColor('#43A047'),
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

  it('gives an account with no colour a dot colour', () => {
    const chips = buildAccountChips([makeTestAccount({ id: 'acc-9', color: null })], []);

    expect(chips[1].dotColor).toBe(resolveAccountGlyphColor(null));
    expect(typeof chips[1].dotColor).toBe('string');
  });
});
