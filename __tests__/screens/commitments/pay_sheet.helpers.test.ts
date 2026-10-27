import { AmountType, Currency } from '@/constants/enums';
import {
  type PaySheetFieldErrors,
  type PayWritePreview,
  resolvePayButtonLabel,
  resolvePayPrefillAccountId,
  resolvePaySheetStatusMessage,
  resolvePayStripChips,
  resolvePayTrackFootnote,
} from '@/modules/commitments/screens/commitments/detail/components/pay_sheet.helpers';
import { makeTestAccount } from '@/test_helpers/transaction';

const cib = makeTestAccount({ id: 'acc-cib', name: 'CIB', currency: Currency.EGP });
const wallet = makeTestAccount({ id: 'acc-wallet', name: 'Wallet', currency: Currency.EGP });
const payoneer = makeTestAccount({ id: 'acc-usd', name: 'Payoneer', currency: Currency.USD });
const ACCOUNTS = [cib, wallet, payoneer];

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

describe('resolvePayStripChips', () => {
  it('draws one chip per account in the given order, lighting the held id only', () => {
    const chips = resolvePayStripChips(ACCOUNTS, 'acc-wallet');

    expect(chips.map((chip) => [chip.id, chip.name, chip.selected])).toEqual([
      ['acc-cib', 'CIB', false],
      ['acc-wallet', 'Wallet', true],
      ['acc-usd', 'Payoneer', false],
    ]);
    expect(chips.every((chip) => !chip.locked && !chip.dimmed)).toBe(true);
  });

  it('lights no chip when the held id is empty', () => {
    const chips = resolvePayStripChips(ACCOUNTS, '');

    expect(chips).toHaveLength(3);
    expect(chips.some((chip) => chip.selected)).toBe(false);
  });

  it('lights no chip for an id the list does not hold', () => {
    const chips = resolvePayStripChips(ACCOUNTS, 'acc-archived');

    expect(chips.some((chip) => chip.selected)).toBe(false);
  });
});

describe('resolvePayPrefillAccountId', () => {
  it("keeps the commitment's account while the loaded list holds it", () => {
    expect(resolvePayPrefillAccountId('acc-wallet', ACCOUNTS)).toBe('acc-wallet');
  });

  it('drops an archived account, which the loaded list no longer holds', () => {
    expect(resolvePayPrefillAccountId('acc-archived', ACCOUNTS)).toBe('');
  });

  it('falls back to no account, not the first one, for a commitment with none', () => {
    expect(resolvePayPrefillAccountId(null, ACCOUNTS)).toBe('');
  });
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
