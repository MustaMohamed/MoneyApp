import { AccountType, CategoryType, Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { TransactionAmountError } from '@/modules/transactions/domain/transaction_amounts';
import {
  resolveDestinationFloorError,
  resolveTransactionFormSemantics,
  resolveTransactionSaveError,
  toTransactionTimestamp,
} from '@/modules/transactions/screens/transactions/transaction_form/transaction_form.helpers';
import { parsePositiveDecimal } from '@/utils/parse_decimal';

describe('transaction form helpers', () => {
  it.each([
    ['50abc', undefined],
    ['0', undefined],
    ['-1', undefined],
    ['', undefined],
    ['12,34', undefined],
    ['50.25', 50.25],
    ['5,000.25', 5000.25],
  ])('strictly parses %s', (input, expected) => {
    expect(parsePositiveDecimal(input)).toBe(expected);
  });

  it('derives Card credit semantics from Income on a credit card', () => {
    expect(resolveTransactionFormSemantics(TransactionType.Income, AccountType.CreditCard)).toEqual(
      {
        isCardCredit: true,
        categoryType: CategoryType.Expense,
        usesBudget: true,
        typeLabel: Strings.addTxTypeCardCredit,
        supportingText: Strings.addTxSupportCardCredit,
      },
    );
  });

  it('keeps cash income on income categories without budget assignment', () => {
    expect(resolveTransactionFormSemantics(TransactionType.Income, AccountType.Bank)).toEqual({
      isCardCredit: false,
      categoryType: CategoryType.Income,
      usesBudget: false,
      typeLabel: Strings.addTxTypeIncome,
      supportingText: Strings.addTxSupportIncome,
    });
  });

  it('captures local date and time from the same submit clock', () => {
    const now = new Date(2026, 6, 1, 0, 30, 45);
    expect(toTransactionTimestamp(now)).toEqual({
      date: '2026-07-01',
      time: '00:30:45',
    });
  });

  it('maps balance policy issues to actionable form copy', () => {
    expect(
      resolveTransactionSaveError({ issues: [{ code: 'card_credit_exceeds_liability' }] }),
    ).toBe(Strings.addTxErrCardCreditExceedsLiability);
    expect(resolveTransactionSaveError(new Error('write failed'))).toBe(
      Strings.transactionSaveError,
    );
  });

  it('maps the discriminated output-guard cause to the named constant, ignoring its own message', () => {
    expect(
      resolveTransactionSaveError(
        new TransactionAmountError('arbitrary internal text', 'unstorable'),
      ),
    ).toBe(Strings.addTxErrAmountUnstorable);
  });

  it('falls through an undiscriminated TransactionAmountError to the generic banner', () => {
    expect(
      resolveTransactionSaveError(
        new TransactionAmountError('A positive USD exchange rate is required'),
      ),
    ).toBe(Strings.transactionSaveError);
  });
});

describe('resolveDestinationFloorError', () => {
  const floor = (input: {
    type: TransactionType;
    amount: number;
    sourceCurrency: Currency | undefined;
    destinationCurrency: Currency | undefined;
    exchangeRateText: string;
  }) => resolveDestinationFloorError(input);

  it('refuses the divide branch when the leg rounds to zero: 0.2 EGP / 50 → 0.00 USD', () => {
    expect(
      floor({
        type: TransactionType.Transfer,
        amount: 0.2,
        sourceCurrency: Currency.EGP,
        destinationCurrency: Currency.USD,
        exchangeRateText: '50',
      }),
    ).toBe(Strings.addTxErrConvertedBelowMin(Currency.USD));
  });

  it('refuses the exact half-even tie: 0.25 EGP / 50 rounds down to 0.00 USD', () => {
    expect(
      floor({
        type: TransactionType.CCPayment,
        amount: 0.25,
        sourceCurrency: Currency.EGP,
        destinationCurrency: Currency.USD,
        exchangeRateText: '50',
      }),
    ).toBe(Strings.addTxErrConvertedBelowMin(Currency.USD));
  });

  it('passes one cent above the tie: 0.26 EGP / 50 → 0.01 USD', () => {
    expect(
      floor({
        type: TransactionType.Transfer,
        amount: 0.26,
        sourceCurrency: Currency.EGP,
        destinationCurrency: Currency.USD,
        exchangeRateText: '50',
      }),
    ).toBeUndefined();
  });

  it('refuses the multiply branch too: 0.01 USD × 0.4 → 0.00 EGP', () => {
    expect(
      floor({
        type: TransactionType.Transfer,
        amount: 0.01,
        sourceCurrency: Currency.USD,
        destinationCurrency: Currency.EGP,
        exchangeRateText: '0.4',
      }),
    ).toBe(Strings.addTxErrConvertedBelowMin(Currency.EGP));
  });

  it('USD → USD passes at the floor: the leg is the amount itself', () => {
    expect(
      floor({
        type: TransactionType.Transfer,
        amount: 0.01,
        sourceCurrency: Currency.USD,
        destinationCurrency: Currency.USD,
        exchangeRateText: '50',
      }),
    ).toBeUndefined();
  });

  it('EGP → EGP passes at the floor with no rate at all', () => {
    expect(
      floor({
        type: TransactionType.Transfer,
        amount: 0.01,
        sourceCurrency: Currency.EGP,
        destinationCurrency: Currency.EGP,
        exchangeRateText: '',
      }),
    ).toBeUndefined();
  });

  it('stays silent for types without a destination leg', () => {
    expect(
      floor({
        type: TransactionType.Expense,
        amount: 0.2,
        sourceCurrency: Currency.EGP,
        destinationCurrency: Currency.USD,
        exchangeRateText: '50',
      }),
    ).toBeUndefined();
  });

  it('stays silent while the destination, rate, or entered amount carry their own field errors', () => {
    const base = {
      type: TransactionType.Transfer,
      amount: 0.2,
      sourceCurrency: Currency.EGP,
      destinationCurrency: Currency.USD,
      exchangeRateText: '50',
    };
    expect(floor({ ...base, destinationCurrency: undefined })).toBeUndefined();
    expect(floor({ ...base, exchangeRateText: '' })).toBeUndefined();
    expect(floor({ ...base, exchangeRateText: '0' })).toBeUndefined();
    expect(floor({ ...base, amount: 0.005 })).toBeUndefined();
    expect(floor({ ...base, amount: Number.NaN })).toBeUndefined();
  });
});
