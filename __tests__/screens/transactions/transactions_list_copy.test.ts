import { Strings } from '@/constants/strings';

const MONTH = 'August';
const AMOUNT = '1,240 EGP';
const ACCOUNT = 'CIB Current';
const DESTINATION = 'Wallet';
const CARD = 'Visa Platinum';

describe('transactions list copy (MA-093)', () => {
  it('names the month in the empty-month headline and body, and offers the way back', () => {
    expect(Strings.emptyTransactionsMonthHeadline(MONTH)).toBe('Nothing recorded in August');
    expect(Strings.emptyTransactionsMonthDescription(MONTH)).toBe(
      'Add a transaction dated in August, or pick another month.',
    );
    expect(Strings.emptyTransactionsMonthBackCta).toBe('Back to this month');
  });

  it.each<[string, () => string, string]>([
    [
      'an expense',
      () => Strings.deleteConfirmBodyExpense(AMOUNT, ACCOUNT),
      '1,240 EGP returns to CIB Current. This cannot be undone.',
    ],
    [
      'an income',
      () => Strings.deleteConfirmBodyIncome(AMOUNT, ACCOUNT),
      '1,240 EGP leaves CIB Current. This cannot be undone.',
    ],
    [
      'a transfer',
      () => Strings.deleteConfirmBodyTransfer(AMOUNT, ACCOUNT, DESTINATION),
      '1,240 EGP moves back to CIB Current from Wallet. This cannot be undone.',
    ],
    [
      'a card payment',
      () => Strings.deleteConfirmBodyCardPayment(AMOUNT, ACCOUNT, CARD),
      '1,240 EGP moves back to CIB Current and is owed on Visa Platinum again. This cannot be undone.',
    ],
    [
      'a card credit',
      () => Strings.deleteConfirmBodyCardCredit(AMOUNT, CARD),
      '1,240 EGP is owed on Visa Platinum again. This cannot be undone.',
    ],
  ])('the delete body for %s names the balance effect', (_name, build, expected) => {
    expect(build()).toBe(expected);
  });

  it('the Delete button reads Deleting… while the delete is in flight', () => {
    expect(Strings.deleteConfirmDeleting).toBe('Deleting…');
  });

  it('the toast after a delete reads Transaction deleted.', () => {
    expect(Strings.transactionDeletedToast).toBe('Transaction deleted.');
  });

  it('the no-transactions button reads Add transaction', () => {
    expect(Strings.emptyTransactionsCta).toBe('Add transaction');
  });

  it('the delete failure line says what changed', () => {
    expect(Strings.errDeleteFailed).toBe("Couldn't delete this transaction. Nothing was changed.");
  });

  it('no string keeps the old delete failure wording', () => {
    const texts: string[] = [];
    for (const value of Object.values(Strings)) {
      if (typeof value === 'string') texts.push(value);
    }

    expect(texts.filter((text) => text.includes('Could not delete transaction'))).toEqual([]);
  });
});
