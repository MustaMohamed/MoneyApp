import { Strings } from '@/constants/strings';

describe('transactions list copy (MA-093)', () => {
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
