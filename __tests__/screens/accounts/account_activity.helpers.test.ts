import {
  buildActivityRowPresentation,
  formatActivityDayLabel,
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
  const tx = makeTestTransaction({ transaction_date: '2026-09-06', transaction_time: '14:30:00' });
  const account = makeTestAccount({ id: 'account-1', name: 'CIB' });
  const category = makeTestCategory({ id: 'category-1', name: 'Food' });

  it('changes the time slot and nothing else', () => {
    const shipped = buildTransactionRowPresentation({ tx, account, category });
    const activity = buildActivityRowPresentation({ tx, account, category }, localDate(2026, 9, 8));

    expect(activity.timeText).toBe('6 Sep');
    expect(shipped.timeText).toBe('2:30 PM');
    expect({ ...activity, timeText: shipped.timeText }).toEqual(shipped);
  });
});
