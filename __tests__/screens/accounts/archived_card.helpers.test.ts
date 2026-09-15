import { AccountType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import {
  resolveArchivedCardRows,
  resolveArchivedRowCaption,
  resolveArchivedSummary,
} from '@/modules/accounts/screens/accounts/list/components/archived_card.helpers';
import { makeTestAccount } from '@/test_helpers/transaction';
import { formatCurrencyAmount } from '@/utils/format_amount';

describe('resolveArchivedRowCaption', () => {
  it('prints a Bank at 0 EGP with no decimals', () => {
    expect(
      resolveArchivedRowCaption({
        type: AccountType.Bank,
        current_balance: 0,
        currency: Currency.EGP,
      }),
    ).toBe('Bank · 0 EGP');
  });

  it('prints a USD balance at the currency decimals', () => {
    expect(
      resolveArchivedRowCaption({
        type: AccountType.SmartWallet,
        current_balance: 1350,
        currency: Currency.USD,
      }),
    ).toBe('Smart Wallet · 1,350.00 USD');
  });

  it("keeps the formatter's sign on a negative credit card balance", () => {
    const caption = resolveArchivedRowCaption({
      type: AccountType.CreditCard,
      current_balance: -2500,
      currency: Currency.EGP,
    });
    expect(caption).toBe(`Credit Card · ${formatCurrencyAmount(-2500, Currency.EGP)}`);
    expect(caption).toContain('2,500');
  });
});

describe('resolveArchivedCardRows', () => {
  // Two non-adjacent Banks: a narrow written as a regroup or a re-sort fails this.
  const archived = [
    makeTestAccount({ id: 'arch-1', name: 'Old HSBC', type: AccountType.Bank, sort_order: 0 }),
    makeTestAccount({
      id: 'arch-2',
      name: 'Vodafone Cash',
      type: AccountType.SmartWallet,
      sort_order: 1,
    }),
    makeTestAccount({ id: 'arch-3', name: 'QNB Old', type: AccountType.Bank, sort_order: 2 }),
  ];

  it('keeps every row in store order on All, holding the account by reference', () => {
    const rows = resolveArchivedCardRows(archived, 'all');
    expect(rows.map((row) => row.account.id)).toEqual(['arch-1', 'arch-2', 'arch-3']);
    rows.forEach((row, index) => expect(row.account).toBe(archived[index]));
    expect(rows[0].caption).toBe(resolveArchivedRowCaption(archived[0]));
  });

  it('keeps only the filtered type, in store order', () => {
    const rows = resolveArchivedCardRows(archived, AccountType.Bank);
    expect(rows.map((row) => row.account.id)).toEqual(['arch-1', 'arch-3']);
  });

  it('gives no rows when no archived account matches the filter', () => {
    expect(resolveArchivedCardRows(archived, AccountType.CreditCard)).toEqual([]);
  });
});

describe('resolveArchivedSummary', () => {
  it("joins the rows' names with a comma and one space", () => {
    const rows = resolveArchivedCardRows(
      [
        makeTestAccount({ id: 'arch-1', name: 'Old HSBC', type: AccountType.Bank }),
        makeTestAccount({ id: 'arch-2', name: 'Vodafone Cash', type: AccountType.SmartWallet }),
      ],
      'all',
    );
    expect(resolveArchivedSummary(rows)).toBe('Old HSBC, Vodafone Cash');
  });

  it('reads a blank name as the unnamed label', () => {
    const rows = resolveArchivedCardRows(
      [
        makeTestAccount({ id: 'arch-1', name: '   ', is_archived: 1 }),
        makeTestAccount({ id: 'arch-2', name: 'Vodafone Cash' }),
      ],
      'all',
    );
    expect(resolveArchivedSummary(rows)).toBe(`${Strings.unnamedAccount}, Vodafone Cash`);
  });

  it('is empty for no rows', () => {
    expect(resolveArchivedSummary([])).toBe('');
  });
});
