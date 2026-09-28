import { Strings } from '@/constants/strings';

describe('add and edit sheet copy', () => {
  it('titles the sheet in sentence case', () => {
    expect(Strings.addTxTitle).toBe('Add transaction');
    expect(Strings.editTxTitle).toBe('Edit transaction');
  });

  it('labels the primary action Save on add and Save changes on edit', () => {
    expect(Strings.addTxSaveCta).toBe('Save');
    expect(Strings.editTxSaveCta).toBe('Save changes');
  });

  it('drops the dead edit title key and keeps the shipped CC Payment tab', () => {
    expect(Object.hasOwn(Strings, 'editTransaction')).toBe(false);
    expect(Strings.addTxTypeCCPayment).toBe('CC Payment');
  });
});

describe('MA-105 footer status track copy', () => {
  it('reads the save failure as the canvas Copy note wrote it', () => {
    expect(Strings.transactionSaveError).toBe(
      "Couldn't save this transaction. Nothing was changed. Try again.",
    );
  });

  it('counts the fields at fault in the singular at 1 and the plural above', () => {
    expect(Strings.fixFieldsMarkedAbove(1)).toBe('Fix the 1 field marked above.');
    expect(Strings.fixFieldsMarkedAbove(2)).toBe('Fix the 2 fields marked above.');
  });

  it('keeps no string that still reads Could not save this transaction', () => {
    const stale = Object.entries(Strings).filter(
      ([, value]) => typeof value === 'string' && value.includes('Could not save this transaction'),
    );

    expect(stale).toEqual([]);
  });
});

describe('MA-106 saved toast and prerequisite state copy', () => {
  it('confirms a save as the canvas Copy note wrote it', () => {
    expect(Strings.transactionSavedToast).toBe('Transaction saved.');
  });

  it('reads the form data failure and its retry as written, beside the shipped no-accounts title', () => {
    expect(Strings.addTxDataLoadError).toBe("Couldn't load your accounts and categories.");
    expect(Strings.addTxDataLoadRetry).toBe('Try again');
    expect(Strings.addTxNoAccountsTitle).toBe('No Accounts Yet');
  });

  it('keeps no string that still reads Could not load the accounts and categories', () => {
    const stale = Object.entries(Strings).filter(
      ([, value]) =>
        typeof value === 'string' && value.includes('Could not load the accounts and categories'),
    );

    expect(stale).toEqual([]);
  });
});
