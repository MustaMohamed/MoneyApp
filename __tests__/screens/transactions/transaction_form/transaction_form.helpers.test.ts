import { AccountType, CategoryType, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { TransactionAmountError } from '@/modules/transactions/domain/transaction_amounts';
import {
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

  // §3.4: never `error.message` — the resolver's other four throws are
  // hardcoded domain literals, not Strings keys, so echoing `.message` would
  // turn them into user copy the moment schema and resolver disagree. Bound
  // to the constant, with an arbitrary message, to prove the mapping ignores it.
  it('maps a TransactionAmountError to the §3.4 constant, never its own message', () => {
    expect(resolveTransactionSaveError(new TransactionAmountError('arbitrary internal text'))).toBe(
      Strings.addTxErrAmountUnstorable,
    );
  });
});
