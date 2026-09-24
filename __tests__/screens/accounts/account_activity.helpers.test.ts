import { AccountType, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { AcctTokens } from '@/constants/theme_tokens';
import type { AccountActivityStatus } from '@/modules/accounts/screens/accounts/detail/account_activity.store';
import {
  type ActivityCardBody,
  buildActivityRowPresentation,
  formatActivityDayLabel,
  resolveActivityCardView,
} from '@/modules/accounts/screens/accounts/detail/components/account_activity.helpers';
import { buildTransactionRowPresentation } from '@/modules/transactions/screens/transactions/components/transaction_row.helpers';
import { makeTestAccount, makeTestCategory, makeTestTransaction } from '@/test_helpers/transaction';

// Local noon, so the label never crosses a day boundary through a UTC offset.
const localDate = (year: number, month: number, day: number): Date =>
  new Date(year, month - 1, day, 12, 0, 0);

describe('formatActivityDayLabel', () => {
  it("spells today's row with the clock time", () => {
    expect(formatActivityDayLabel('2026-09-08', '14:30:00', localDate(2026, 9, 8))).toBe(
      'Today, 2:30 PM',
    );
  });

  it('spells midnight today as 12 AM', () => {
    expect(formatActivityDayLabel('2026-09-08', '00:05:00', localDate(2026, 9, 8))).toBe(
      'Today, 12:05 AM',
    );
  });

  it('reads yesterday across a month end', () => {
    expect(formatActivityDayLabel('2026-08-31', '09:00:00', localDate(2026, 9, 1))).toBe(
      'Yesterday',
    );
  });

  it('reads yesterday across a year end', () => {
    expect(formatActivityDayLabel('2026-12-31', '23:59:00', localDate(2027, 1, 1))).toBe(
      'Yesterday',
    );
  });

  it('reads yesterday across a leap day', () => {
    expect(formatActivityDayLabel('2028-02-29', '09:00:00', localDate(2028, 3, 1))).toBe(
      'Yesterday',
    );
  });

  it('dates a leap day further back without a leading zero', () => {
    expect(formatActivityDayLabel('2028-02-29', '09:00:00', localDate(2028, 3, 15))).toBe('29 Feb');
  });

  it('dates two days ago', () => {
    expect(formatActivityDayLabel('2026-09-06', '09:00:00', localDate(2026, 9, 8))).toBe('6 Sep');
  });

  it('dates a row in a later month than now', () => {
    expect(formatActivityDayLabel('2026-12-25', '09:00:00', localDate(2026, 9, 8))).toBe('25 Dec');
  });
});

describe('buildActivityRowPresentation', () => {
  const now = localDate(2026, 9, 20);
  const cib = makeTestAccount({
    id: 'cib',
    name: 'CIB Current',
    type: AccountType.Bank,
    color: AcctTokens.lapis.rich,
  });
  const payoneer = makeTestAccount({
    id: 'payoneer',
    name: 'Payoneer',
    type: AccountType.SmartWallet,
    color: AcctTokens.nile.rich,
  });
  const visa = makeTestAccount({
    id: 'visa',
    name: 'Visa',
    type: AccountType.CreditCard,
    color: AcctTokens.plum.rich,
  });
  const category = makeTestCategory({ id: 'category-1', name: 'Groceries' });
  const cibTile = { color: AcctTokens.lapis.rich, type: AccountType.Bank, hollow: false };
  const payoneerTile = {
    color: AcctTokens.nile.rich,
    type: AccountType.SmartWallet,
    hollow: false,
  };
  const visaTile = { color: AcctTokens.plum.rich, type: AccountType.CreditCard, hollow: false };

  const expense = makeTestTransaction({
    account_id: cib.id,
    category_id: category.id,
    note: 'Carrefour',
    transaction_date: '2026-09-20',
    transaction_time: '18:40:00',
  });
  const transfer = makeTestTransaction({
    type: TransactionType.Transfer,
    account_id: cib.id,
    to_account_id: payoneer.id,
    category_id: null,
    transaction_date: '2026-09-19',
  });
  const cardPayment = makeTestTransaction({
    type: TransactionType.CCPayment,
    account_id: cib.id,
    to_account_id: visa.id,
    category_id: null,
    transaction_date: '2026-09-18',
  });

  it('reads note · Today on a categorised expense, with no tile', () => {
    const activity = buildActivityRowPresentation(
      { tx: expense, account: cib, category },
      now,
      cib.id,
    );

    expect(activity.caption).toBe(`Carrefour · ${Strings.accountActivityToday('6:40 PM')}`);
    expect(activity.tiles).toEqual([]);
  });

  it('reads the day label alone when the row has no note', () => {
    const activity = buildActivityRowPresentation(
      { tx: { ...expense, note: null, transaction_date: '2026-09-19' }, account: cib, category },
      now,
      cib.id,
    );

    expect(activity.caption).toBe(Strings.accountActivityYesterday);
    expect(activity.tiles).toEqual([]);
  });

  it('keeps the card credit title with the day label and no tile', () => {
    const activity = buildActivityRowPresentation(
      {
        tx: {
          ...expense,
          type: TransactionType.Income,
          account_id: visa.id,
          note: null,
          transaction_date: '2026-09-18',
        },
        account: visa,
        category,
      },
      now,
      visa.id,
    );

    expect(activity.title).toBe(Strings.cardCreditTitle);
    expect(activity.caption).toBe('18 Sep');
    expect(activity.tiles).toEqual([]);
  });

  it("shows a transfer from the open account with the destination's tile only", () => {
    const activity = buildActivityRowPresentation(
      { tx: transfer, account: cib, toAccount: payoneer },
      now,
      cib.id,
    );

    expect(activity.caption).toBe('CIB Current → Payoneer · Yesterday');
    expect(activity.tiles).toEqual([payoneerTile]);
  });

  it("shows a transfer into the open account with the source's tile only", () => {
    const activity = buildActivityRowPresentation(
      { tx: transfer, account: cib, toAccount: payoneer },
      now,
      payoneer.id,
    );

    expect(activity.caption).toBe('CIB Current → Payoneer · Yesterday');
    expect(activity.tiles).toEqual([cibTile]);
  });

  it("shows a card payment on the paying account with the card's tile", () => {
    const activity = buildActivityRowPresentation(
      { tx: cardPayment, account: cib, toAccount: visa },
      now,
      cib.id,
    );

    expect(activity.caption).toBe('CIB Current → Visa · 18 Sep');
    expect(activity.tiles).toEqual([visaTile]);
  });

  it("reads From <payer> on the card it paid, with the payer's tile", () => {
    const activity = buildActivityRowPresentation(
      { tx: cardPayment, account: cib, toAccount: visa },
      now,
      visa.id,
    );

    expect(activity.caption).toBe('From CIB Current · 18 Sep');
    expect(activity.tiles).toEqual([cibTile]);
  });

  it('names a deleted payer "Deleted Account" on the card it paid, its tile hollow graphite (MA-020)', () => {
    const deleted = makeTestAccount({
      id: 'cib',
      name: '',
      type: AccountType.Bank,
      color: AcctTokens.lapis.rich,
      is_archived: 1,
      is_deleted: 1,
    });
    const activity = buildActivityRowPresentation(
      { tx: cardPayment, account: deleted, toAccount: visa },
      now,
      visa.id,
    );

    expect(activity.caption).toBe(`From ${Strings.deletedAccount} · 18 Sep`);
    expect(activity.tiles).toEqual([
      { color: AcctTokens.graphite.rich, type: AccountType.Bank, hollow: true },
    ]);
  });

  it('names a blank-named payer "Unnamed account" on the card it paid (MA-059)', () => {
    const blank = makeTestAccount({ id: 'cib', name: '' });
    const activity = buildActivityRowPresentation(
      { tx: cardPayment, account: blank, toAccount: visa },
      now,
      visa.id,
    );

    expect(activity.caption).toBe(`From ${Strings.unnamedAccount} · 18 Sep`);
  });

  it.each([
    ['a categorised expense', { tx: expense, account: cib, category }, cib.id],
    [
      'a card payment on the paid card',
      { tx: cardPayment, account: cib, toAccount: visa },
      visa.id,
    ],
  ])('changes the caption and the tiles of %s, and nothing else', (_, input, openAccountId) => {
    const shipped = buildTransactionRowPresentation(input);
    const activity = buildActivityRowPresentation(input, now, openAccountId);

    expect(activity.accessibilityLabel).toBe(
      shipped.accessibilityLabel.replace(shipped.caption, activity.caption),
    );
    expect({
      ...activity,
      caption: shipped.caption,
      tiles: shipped.tiles,
      accessibilityLabel: shipped.accessibilityLabel,
    }).toEqual(shipped);
  });
});

describe('resolveActivityCardView', () => {
  const cases: [AccountActivityStatus, number, ActivityCardBody, boolean][] = [
    ['idle', 0, 'loading', false],
    ['idle', 2, 'loading', false],
    ['initialLoading', 0, 'loading', false],
    ['initialLoading', 2, 'loading', false],
    ['initialError', 0, 'error', true],
    ['initialError', 2, 'error', true],
    ['ready', 0, 'empty', false],
    ['ready', 2, 'rows', true],
  ];

  it.each(cases)('%s with %i rows renders %s, See all %s', (status, rowCount, body, showSeeAll) => {
    expect(resolveActivityCardView(status, rowCount)).toEqual({ body, showSeeAll });
  });
});
