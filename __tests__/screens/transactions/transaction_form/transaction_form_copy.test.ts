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
