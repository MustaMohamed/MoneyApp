import { AccountType, TransactionType } from '@/constants/enums';
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
  const now = localDate(2026, 9, 8);
  const tx = makeTestTransaction({ transaction_date: '2026-09-06', transaction_time: '14:30:00' });
  const account = makeTestAccount({ id: 'account-1', name: 'CIB', type: AccountType.Bank });
  const card = makeTestAccount({ id: 'card-1', name: 'Visa', type: AccountType.CreditCard });
  const payoneer = makeTestAccount({ id: 'account-2', name: 'Payoneer' });
  const category = makeTestCategory({ id: 'category-1', name: 'Food' });

  it('moves the date onto the second line of a categorised expense', () => {
    const activity = buildActivityRowPresentation({ tx, account, category }, now, account.id);

    expect(activity.context).toBe('6 Sep');
    expect(activity.timeText).toBe('');
  });

  it('keeps the account on the second line of an uncategorised row, date in the time slot', () => {
    const activity = buildActivityRowPresentation({ tx, account }, now, account.id);

    expect(activity.context).toBe('CIB');
    expect(activity.timeText).toBe('6 Sep');
  });

  it('joins the category and the date on a card credit, whose title carries neither', () => {
    const activity = buildActivityRowPresentation(
      { tx: { ...tx, type: TransactionType.Income, account_id: card.id }, account: card, category },
      now,
      card.id,
    );

    expect(activity.context).toBe('Food · 6 Sep');
    expect(activity.timeText).toBe('');
  });

  it('leaves a transfer on source → destination with its date in the time slot', () => {
    const activity = buildActivityRowPresentation(
      {
        tx: { ...tx, type: TransactionType.Transfer, to_account_id: payoneer.id },
        account,
        toAccount: payoneer,
      },
      now,
      account.id,
    );

    expect(activity.context).toBe('CIB → Payoneer');
    expect(activity.timeText).toBe('6 Sep');
  });

  it('reads a card payment as source → destination on the paying account', () => {
    const activity = buildActivityRowPresentation(
      {
        tx: { ...tx, type: TransactionType.CCPayment, to_account_id: card.id },
        account,
        toAccount: card,
      },
      now,
      account.id,
    );

    expect(activity.context).toBe('CIB → Visa');
    expect(activity.timeText).toBe('6 Sep');
  });

  it('reads a card payment as the other side alone on the card it paid', () => {
    const activity = buildActivityRowPresentation(
      {
        tx: { ...tx, type: TransactionType.CCPayment, to_account_id: card.id },
        account,
        toAccount: card,
      },
      now,
      card.id,
    );

    expect(activity.context).toBe('From CIB');
    expect(activity.timeText).toBe('6 Sep');
  });

  it('speaks the new second line where the shipped label speaks the account', () => {
    const shipped = buildTransactionRowPresentation({ tx, account, category });
    const activity = buildActivityRowPresentation({ tx, account, category }, now, account.id);

    expect(shipped.accessibilityLabel.split(', ')[1]).toBe('CIB');
    expect(activity.accessibilityLabel.split(', ')[1]).toBe('6 Sep');
  });

  it('changes the context, the label and the time slot, and nothing else', () => {
    const shipped = buildTransactionRowPresentation({ tx, account, category });
    const activity = buildActivityRowPresentation({ tx, account, category }, now, account.id);

    expect(shipped.timeText).toBe('2:30 PM');
    expect({
      ...activity,
      context: shipped.context,
      timeText: shipped.timeText,
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
