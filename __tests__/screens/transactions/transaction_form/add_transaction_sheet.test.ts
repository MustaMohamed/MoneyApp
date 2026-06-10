import { shouldRenderAddTransactionSheetBody } from '@/modules/transactions/screens/transactions/transaction_form/add_transaction_sheet.helpers';

describe('shouldRenderAddTransactionSheetBody', () => {
  it('skips the expensive body before the sheet has opened', () => {
    expect(shouldRenderAddTransactionSheetBody(false, false)).toBe(false);
  });

  it('renders while open and during close grace', () => {
    expect(shouldRenderAddTransactionSheetBody(true, false)).toBe(true);
    expect(shouldRenderAddTransactionSheetBody(false, true)).toBe(true);
  });
});
