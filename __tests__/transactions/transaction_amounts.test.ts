import { Currency, TransactionType } from '@/constants/enums';
import {
  resolveTransactionAmounts,
  TransactionAmountError,
} from '@/modules/transactions/domain/transaction_amounts';

describe('resolveTransactionAmounts', () => {
  it('normalizes a USD expense to EGP without a destination amount', () => {
    expect(
      resolveTransactionAmounts({
        type: TransactionType.Expense,
        amount: 10,
        sourceCurrency: Currency.USD,
        exchangeRate: 50,
      }),
    ).toEqual({ egpAmount: 500, toAmount: null, exchangeRate: 50 });
  });

  it.each([TransactionType.Transfer, TransactionType.CCPayment])(
    'converts an EGP source to a USD destination for %s',
    (type) => {
      expect(
        resolveTransactionAmounts({
          type,
          amount: 500,
          sourceCurrency: Currency.EGP,
          destinationCurrency: Currency.USD,
          exchangeRate: 50,
        }),
      ).toEqual({ egpAmount: 500, toAmount: 10, exchangeRate: 50 });
    },
  );

  it.each([TransactionType.Transfer, TransactionType.CCPayment])(
    'converts a USD source to an EGP destination for %s',
    (type) => {
      expect(
        resolveTransactionAmounts({
          type,
          amount: 10,
          sourceCurrency: Currency.USD,
          destinationCurrency: Currency.EGP,
          exchangeRate: 50,
        }),
      ).toEqual({ egpAmount: 500, toAmount: 500, exchangeRate: 50 });
    },
  );

  it.each([TransactionType.Transfer, TransactionType.CCPayment])(
    'keeps the source amount for a USD-to-USD destination for %s',
    (type) => {
      expect(
        resolveTransactionAmounts({
          type,
          amount: 10,
          sourceCurrency: Currency.USD,
          destinationCurrency: Currency.USD,
          exchangeRate: 50,
        }),
      ).toEqual({ egpAmount: 500, toAmount: 10, exchangeRate: 50 });
    },
  );

  it('does not persist an exchange rate when neither side uses USD', () => {
    expect(
      resolveTransactionAmounts({
        type: TransactionType.Transfer,
        amount: 500,
        sourceCurrency: Currency.EGP,
        destinationCurrency: Currency.EGP,
        exchangeRate: 50,
      }),
    ).toEqual({ egpAmount: 500, toAmount: 500, exchangeRate: null });
  });

  it('rejects a missing destination and invalid rate', () => {
    expect(() =>
      resolveTransactionAmounts({
        type: TransactionType.CCPayment,
        amount: 500,
        sourceCurrency: Currency.EGP,
      }),
    ).toThrow(TransactionAmountError);
    expect(() =>
      resolveTransactionAmounts({
        type: TransactionType.Transfer,
        amount: 500,
        sourceCurrency: Currency.EGP,
        destinationCurrency: Currency.USD,
        exchangeRate: 0,
      }),
    ).toThrow(TransactionAmountError);
  });
});
