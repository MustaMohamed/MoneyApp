import { AmountType, Currency } from '@/constants/enums';
import {
  type PaySheetFieldErrors,
  type PayWritePreview,
  resolvePayButtonLabel,
  resolvePayConvertedAmount,
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

  it('reads the save error with no fault, the count over it once a fault is set, and nothing with neither (MA-219)', () => {
    const saveError = "Couldn't save this payment. Nothing was changed. Try again.";

    expect(resolvePaySheetStatusMessage({}, saveError)).toBe(saveError);
    expect(resolvePaySheetStatusMessage({ account: 'Select an account' }, saveError)).toBe(
      'Fix the 1 field marked above.',
    );
    expect(resolvePaySheetStatusMessage({}, undefined)).toBeUndefined();
  });

  it('skips a field whose message is undefined', () => {
    expect(resolvePaySheetStatusMessage({ amount: undefined, account: 'Select an account' })).toBe(
      'Fix the 1 field marked above.',
    );
  });
});

// Every expected figure is `resolveCommitmentPaymentAmounts` output: EGP to USD divides, USD to EGP multiplies.
describe('resolvePayConvertedAmount (MA-219)', () => {
  const converted = (
    overrides: Partial<Parameters<typeof resolvePayConvertedAmount>[0]> = {},
  ): ReturnType<typeof resolvePayConvertedAmount> =>
    resolvePayConvertedAmount({
      commitmentCurrency: Currency.USD,
      accountCurrency: Currency.EGP,
      amountText: '100',
      rateText: '49.06',
      ...overrides,
    });

  it('reads the EGP amount for a USD commitment paid from an EGP account', () => {
    expect(converted()).toEqual({ amount: 4906, currency: Currency.EGP });
  });

  it('reads the EGP amount for a USD commitment paid from a USD account', () => {
    expect(converted({ accountCurrency: Currency.USD })).toEqual({
      amount: 4906,
      currency: Currency.EGP,
    });
  });

  it('reads the USD amount for an EGP commitment paid from a USD account', () => {
    expect(
      converted({
        commitmentCurrency: Currency.EGP,
        accountCurrency: Currency.USD,
        amountText: '5000',
      }),
    ).toEqual({ amount: 101.92, currency: Currency.USD });
  });

  it('reads nothing for an EGP commitment paid from an EGP account', () => {
    expect(
      converted({
        commitmentCurrency: Currency.EGP,
        accountCurrency: Currency.EGP,
        amountText: '5000',
        rateText: undefined,
      }),
    ).toBeUndefined();
  });

  it('reads the EGP amount for a USD commitment before an account is lit', () => {
    expect(converted({ accountCurrency: undefined })).toEqual({
      amount: 4906,
      currency: Currency.EGP,
    });
  });

  it('reads nothing for an EGP commitment before an account is lit', () => {
    expect(
      converted({ commitmentCurrency: Currency.EGP, accountCurrency: undefined }),
    ).toBeUndefined();
  });

  it.each(['', '0', '1,23', '48.', '-5'])(
    'reads nothing for the refused amount %p',
    (amountText) => {
      expect(converted({ amountText })).toBeUndefined();
    },
  );

  it.each([undefined, '', '0', 'abc', '48.'])(
    'reads nothing for the refused rate %p',
    (rateText) => {
      expect(converted({ rateText })).toBeUndefined();
    },
  );

  it('reads nothing for an amount the resolver refuses to store', () => {
    expect(converted({ amountText: '99999999999999999999' })).toBeUndefined();
  });

  it.each([
    ['0.01 EGP at 49.06 into USD', Currency.EGP, Currency.USD, '0.01', '49.06'],
    ['0.50 USD at 0.01 into EGP', Currency.USD, Currency.EGP, '0.50', '0.01'],
  ] as const)(
    'reads nothing for a conversion under the money floor: %s',
    (_label, commitmentCurrency, accountCurrency, amountText, rateText) => {
      expect(
        converted({ commitmentCurrency, accountCurrency, amountText, rateText }),
      ).toBeUndefined();
    },
  );

  // The resolver rounds the amount to 1.00 first, so 0.02, not `roundMoney(1.005 / 40)` = 0.03.
  it("reads the resolver's rounding: 1.005 EGP at 40 is 0.02 USD", () => {
    expect(
      converted({
        commitmentCurrency: Currency.EGP,
        accountCurrency: Currency.USD,
        amountText: '1.005',
        rateText: '40',
      }),
    ).toEqual({ amount: 0.02, currency: Currency.USD });
  });
});
