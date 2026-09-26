import { AccountType, CategoryType, Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { TransactionAmountError } from '@/modules/transactions/domain/transaction_amounts';
import {
  TransactionAccountArchivedError,
  TransactionValidationError,
} from '@/modules/transactions/repositories/transaction.errors';
import {
  countTransactionFormFieldErrors,
  resolveBudgetFieldError,
  resolveDestinationFloorError,
  resolveTransactionDeleteError,
  resolveTransactionFormSemantics,
  resolveTransactionFormStatus,
  resolveTransactionSaveError,
  toTransactionTimestamp,
  type TransactionFormFieldErrors,
} from '@/modules/transactions/screens/transactions/transaction_form/transaction_form.helpers';
import { makeTestAccount } from '@/test_helpers/transaction';
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

  // #363: whatever still reaches save after `resolveDestinationFloorError` already validated —
  // e.g. state changed between validation and submit — gets its own copy, not the retry banner.
  it('maps the discriminated zero-destination cause to its own copy, ignoring its own message', () => {
    expect(
      resolveTransactionSaveError(
        new TransactionAmountError('arbitrary internal text', 'zero-destination'),
      ),
    ).toBe(Strings.addTxErrDestinationTooSmall);
  });

  it('falls through an undiscriminated TransactionAmountError to the generic banner', () => {
    expect(
      resolveTransactionSaveError(
        new TransactionAmountError('A positive USD exchange rate is required'),
      ),
    ).toBe(Strings.transactionSaveError);
  });

  it('MA-053: maps an archived-account refusal to the line naming the account', () => {
    const refusal = new TransactionAccountArchivedError(
      'source',
      makeTestAccount({ name: 'Old Card' }),
    );

    expect(resolveTransactionSaveError(refusal)).toBe(
      Strings.transactionAccountArchived('Old Card'),
    );
    expect(resolveTransactionSaveError(new TransactionValidationError('invalid'))).toBe(
      Strings.transactionSaveError,
    );
  });

  it('MA-053: maps a delete refusal to the same line and anything else to the delete copy', () => {
    const refusal = new TransactionAccountArchivedError(
      'destination',
      makeTestAccount({ name: 'Old Card' }),
    );

    expect(resolveTransactionDeleteError(refusal)).toBe(
      Strings.transactionAccountArchived('Old Card'),
    );
    expect(resolveTransactionDeleteError(new Error('x'))).toBe(Strings.errDeleteFailed);
  });

  it('MA-073: a blank-named archived account reads "Unnamed account" on save and delete', () => {
    const refusal = new TransactionAccountArchivedError(
      'source',
      makeTestAccount({ name: '  ', is_archived: 1 }),
    );
    const line = Strings.transactionAccountArchived(Strings.unnamedAccount);

    expect(resolveTransactionSaveError(refusal)).toBe(line);
    expect(resolveTransactionDeleteError(refusal)).toBe(line);
  });

  it('MA-073: a deleted archived account reads "Deleted Account" on save and delete', () => {
    const refusal = new TransactionAccountArchivedError(
      'source',
      makeTestAccount({ name: '', is_archived: 1, is_deleted: 1 }),
    );
    const line = Strings.transactionAccountArchived(Strings.deletedAccount);

    expect(resolveTransactionSaveError(refusal)).toBe(line);
    expect(resolveTransactionDeleteError(refusal)).toBe(line);
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

describe('MA-105 footer status line', () => {
  const lookupFailed = 'Could not load budgets';

  it('counts one field at fault', () => {
    const errors: TransactionFormFieldErrors = { amount: 'Enter an amount' };

    expect(countTransactionFormFieldErrors(errors)).toBe(1);
    expect(resolveTransactionFormStatus({ errors })).toBe('Fix the 1 field marked above.');
  });

  it('counts two fields at fault', () => {
    const errors: TransactionFormFieldErrors = {
      amount: 'Enter an amount',
      category: 'Pick a category',
    };

    expect(countTransactionFormFieldErrors(errors)).toBe(2);
    expect(resolveTransactionFormStatus({ errors })).toBe('Fix the 2 fields marked above.');
  });

  it('counts the rate row, which keeps its own inline line', () => {
    expect(
      countTransactionFormFieldErrors({ rate: 'Enter a rate', account: 'Pick an account' }),
    ).toBe(2);
    expect(resolveTransactionFormStatus({ errors: { rate: 'Enter a rate' } })).toBe(
      'Fix the 1 field marked above.',
    );
  });

  it('counts only the keys whose message is set', () => {
    const errors: TransactionFormFieldErrors = {
      amount: undefined,
      account: undefined,
      toAccount: undefined,
      category: 'Pick a category',
      budget: undefined,
      rate: undefined,
    };

    expect(countTransactionFormFieldErrors(errors)).toBe(1);
  });

  it('counts the budget field without a lookup failure and not with one', () => {
    expect(countTransactionFormFieldErrors({ budget: 'Pick a budget' })).toBe(1);
    expect(
      countTransactionFormFieldErrors(
        { budget: lookupFailed, amount: 'Enter an amount' },
        lookupFailed,
      ),
    ).toBe(1);
    expect(
      resolveTransactionFormStatus({
        errors: { budget: lookupFailed },
        budgetLookupError: lookupFailed,
      }),
    ).toBeUndefined();
  });

  it('counts every key the errors type carries, and no budget fault behind a lookup failure', () => {
    const errors: Required<TransactionFormFieldErrors> = {
      amount: 'Enter an amount',
      account: 'Pick an account',
      toAccount: 'Pick where the money goes',
      category: 'Pick a category',
      budget: 'Pick a budget',
      rate: 'Enter a rate',
    };

    expect(countTransactionFormFieldErrors(errors)).toBe(6);
    expect(countTransactionFormFieldErrors({ budget: lookupFailed }, lookupFailed)).toBe(0);
  });

  it('reads a budget error as a field fault only without a lookup failure', () => {
    expect(resolveBudgetFieldError('Pick a budget', lookupFailed)).toBeUndefined();
    expect(resolveBudgetFieldError('Pick a budget', undefined)).toBe('Pick a budget');
  });

  it('returns the save error when no field is at fault', () => {
    expect(
      resolveTransactionFormStatus({ errors: {}, saveError: Strings.transactionSaveError }),
    ).toBe(Strings.transactionSaveError);
  });

  it('puts the count line over a save error', () => {
    expect(
      resolveTransactionFormStatus({
        errors: { amount: 'Enter an amount' },
        saveError: Strings.transactionSaveError,
      }),
    ).toBe('Fix the 1 field marked above.');
  });

  it('is empty with no field at fault and no save error', () => {
    expect(resolveTransactionFormStatus({ errors: {} })).toBeUndefined();
  });

  it.each([
    [
      'a plain Error',
      new Error('write failed'),
      "Couldn't save this transaction. Nothing was changed. Try again.",
    ],
    [
      'an archived-account refusal',
      new TransactionAccountArchivedError('source', makeTestAccount({ name: 'Old Card' })),
      Strings.transactionAccountArchived('Old Card'),
    ],
    [
      'an unstorable amount',
      new TransactionAmountError('internal', 'unstorable'),
      Strings.addTxErrAmountUnstorable,
    ],
    [
      'a destination too small',
      new TransactionAmountError('internal', 'zero-destination'),
      Strings.addTxErrDestinationTooSmall,
    ],
    [
      'a card credit past the card balance',
      { issues: [{ code: 'card_credit_exceeds_liability' }] },
      Strings.addTxErrCardCreditExceedsLiability,
    ],
    [
      'a card payment past the card balance',
      { issues: [{ code: 'cc_payment_exceeds_liability' }] },
      Strings.addTxErrCcPaymentExceedsLiability,
    ],
  ])('carries %s to the track as its shipped line', (_label, error, line) => {
    expect(
      resolveTransactionFormStatus({ errors: {}, saveError: resolveTransactionSaveError(error) }),
    ).toBe(line);
  });
});
