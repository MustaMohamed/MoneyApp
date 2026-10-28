import { AmountType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import {
  type PaySheetFieldErrors,
  type PayWritePreview,
  resolvePayButtonLabel,
  resolvePayCycleLine,
  resolvePaySheetStatusMessage,
  resolvePayTrackFootnote,
} from '@/modules/commitments/screens/commitments/detail/components/pay_sheet.helpers';

const TODAY = '2026-10-20';

const footnote = (
  overrides: Partial<Parameters<typeof resolvePayTrackFootnote>[0]> = {},
): string | undefined =>
  resolvePayTrackFootnote({
    amountType: AmountType.Fixed,
    amountText: '8000',
    estimate: undefined,
    commitmentCurrency: Currency.EGP,
    preview: { amount: 8000, currency: Currency.EGP, accountName: 'CIB' },
    paidDate: TODAY,
    today: TODAY,
    ...overrides,
  });

describe('resolvePayTrackFootnote', () => {
  it('reads the estimate hint for a variable commitment with the amount empty', () => {
    expect(
      footnote({
        amountType: AmountType.Variable,
        amountText: '',
        estimate: 600,
        preview: undefined,
      }),
    ).toBe('Estimated 600 EGP. Enter the amount on the bill.');
  });

  it("formats the estimate in the commitment's currency", () => {
    expect(
      footnote({
        amountType: AmountType.Variable,
        amountText: '',
        estimate: 15,
        commitmentCurrency: Currency.USD,
        preview: undefined,
      }),
    ).toBe('Estimated 15.00 USD. Enter the amount on the bill.');
  });

  it('reads the bare hint for a variable commitment with no estimate', () => {
    expect(
      footnote({
        amountType: AmountType.Variable,
        amountText: '',
        estimate: undefined,
        preview: undefined,
      }),
    ).toBe('Enter the amount on the bill.');
  });

  it('treats a whitespace-only amount as empty on a variable commitment', () => {
    expect(
      footnote({
        amountType: AmountType.Variable,
        amountText: '  ',
        estimate: 600,
        preview: undefined,
      }),
    ).toBe('Estimated 600 EGP. Enter the amount on the bill.');
  });

  it('is idle for a fixed commitment whose amount was cleared', () => {
    expect(footnote({ amountText: '', preview: undefined })).toBeUndefined();
  });

  it('is idle when a typed amount has no write to preview', () => {
    expect(footnote({ amountText: '8000', preview: undefined })).toBeUndefined();
  });

  it('previews the write dated today', () => {
    expect(footnote()).toBe('Writes an expense of 8,000 EGP on CIB, dated today.');
  });

  it('previews the write, not the hint, once a variable commitment has an amount', () => {
    expect(
      footnote({
        amountType: AmountType.Variable,
        amountText: '640',
        estimate: 600,
        preview: { amount: 640, currency: Currency.EGP, accountName: 'CIB' },
      }),
    ).toBe('Writes an expense of 640 EGP on CIB, dated today.');
  });

  it.each([
    ['another day in the same year', '2026-10-01', '2026-10-20', 'Thu 1 Oct'],
    ['a day in the year before', '2025-12-31', '2026-01-01', 'Wed 31 Dec 2025'],
    ['the last day of a short month', '2026-02-28', '2026-03-31', 'Sat 28 Feb'],
    ['a leap day', '2028-02-29', '2028-03-01', 'Tue 29 Feb'],
  ] as const)('dates the preview on %s', (_label, paidDate, today, day) => {
    expect(footnote({ paidDate, today })).toBe(
      `Writes an expense of 8,000 EGP on CIB, dated ${day}.`,
    );
  });

  it('reads "dated today" when today is a leap day', () => {
    expect(footnote({ paidDate: '2028-02-29', today: '2028-02-29' })).toBe(
      'Writes an expense of 8,000 EGP on CIB, dated today.',
    );
  });

  it.each([
    [{ amount: 735, currency: Currency.EGP, accountName: 'CIB' }, '735 EGP', 'CIB'],
    [{ amount: 15, currency: Currency.USD, accountName: 'Payoneer' }, '15.00 USD', 'Payoneer'],
  ] as [PayWritePreview, string, string][])(
    "formats the preview amount in the account's currency: %o",
    (preview, amount, account) => {
      expect(footnote({ preview })).toBe(
        `Writes an expense of ${amount} on ${account}, dated today.`,
      );
    },
  );
});

describe('resolvePayButtonLabel', () => {
  it.each(['', '0', '0.001'])('reads the bare label at %p', (amountText) => {
    expect(resolvePayButtonLabel(amountText, Currency.EGP)).toBe('Pay');
  });

  it.each([
    ['8000', Currency.EGP, 'Pay 8,000 EGP'],
    ['15', Currency.USD, 'Pay 15.00 USD'],
  ] as const)(
    "reads %p in the commitment's currency %s as %p",
    (amountText, currency, expected) => {
      expect(resolvePayButtonLabel(amountText, currency)).toBe(expected);
    },
  );
});

describe('resolvePaySheetStatusMessage', () => {
  it('is undefined with no fault', () => {
    expect(resolvePaySheetStatusMessage({})).toBeUndefined();
  });

  it('counts one fault', () => {
    expect(resolvePaySheetStatusMessage({ amount: 'Enter an amount' })).toBe(
      'Fix the 1 field marked above.',
    );
  });

  it('counts the amount, the account and the rate', () => {
    const errors: PaySheetFieldErrors = {
      amount: 'Enter an amount',
      account: 'Select an account',
      rate: 'Enter a rate',
    };

    expect(resolvePaySheetStatusMessage(errors)).toBe('Fix the 3 fields marked above.');
  });

  it('skips a field whose message is undefined', () => {
    expect(resolvePaySheetStatusMessage({ amount: undefined, account: 'Select an account' })).toBe(
      'Fix the 1 field marked above.',
    );
  });
});

describe('resolvePayCycleLine', () => {
  const payment = (
    due_date: string,
    paid_date: string | null = null,
    skipped_date: string | null = null,
  ) => ({ due_date, paid_date, skipped_date });

  it('reads Due with the due day and Due today in gold on the due day', () => {
    const line = resolvePayCycleLine(payment('2026-10-01'), '2026-10-01');
    expect(line.statusLabel).toBe(Strings.commitmentsStatusDue);
    expect(line.text).toBe('Thu 1 Oct 2026 · Due today');
    expect(line.tone).toBe('gold');
  });

  it('reads Overdue one day late across a month end', () => {
    const line = resolvePayCycleLine(payment('2026-10-31'), '2026-11-01');
    expect(line.statusLabel).toBe(Strings.commitmentsStatusOverdue);
    expect(line.text).toBe('Sat 31 Oct 2026 · 1 day late');
    expect(line.tone).toBe('danger');
  });

  it('reads Upcoming toward a leap day', () => {
    const line = resolvePayCycleLine(payment('2028-02-29'), '2028-02-26');
    expect(line.statusLabel).toBe(Strings.commitmentsStatusUpcoming);
    expect(line.text).toBe('Tue 29 Feb 2028 · in 3 days');
    expect(line.tone).toBe('caption');
  });

  it('counts the leap day between today and the due day', () => {
    expect(resolvePayCycleLine(payment('2028-03-01'), '2028-02-28').text).toBe(
      'Wed 1 Mar 2028 · in 2 days',
    );
  });

  // A settled cycle reads as the detail's This cycle card reads it: red marks only an actionable state.
  it('reads Paid against the due day from the paid date, in success', () => {
    const line = resolvePayCycleLine(payment('2026-10-01', '2026-10-03'), '2026-10-05');
    expect(line.statusLabel).toBe(Strings.commitmentsStatusPaid);
    expect(line.text).toBe('Thu 1 Oct 2026 · paid · 2 days late');
    expect(line.tone).toBe('success');
  });

  it('reads Skipped against the due day from the skipped date, in caption', () => {
    const line = resolvePayCycleLine(payment('2026-10-01', null, '2026-10-02'), '2026-10-05');
    expect(line.statusLabel).toBe(Strings.commitmentsStatusSkipped);
    expect(line.text).toBe('Thu 1 Oct 2026 · skipped · 1 day late');
    expect(line.tone).toBe('caption');
  });

  it('reads today itself as a leap day', () => {
    const line = resolvePayCycleLine(payment('2028-03-01'), '2028-02-29');
    expect(line.statusLabel).toBe(Strings.commitmentsStatusUpcoming);
    expect(line.text).toBe('Wed 1 Mar 2028 · in 1 day');
  });
});
