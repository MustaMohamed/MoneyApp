import { Spacing, TouchSize } from '@/constants/theme';
import { FACT_ROW_MIN_HEIGHT } from '@/modules/transactions/screens/transactions/transaction_form/components/form_picker_row';
import { TRANSACTION_FORM_SKELETON_GEOMETRY } from '@/modules/transactions/screens/transactions/transaction_form/components/transaction_form_loading';

describe('TRANSACTION_FORM_SKELETON_GEOMETRY', () => {
  it('sizes the account bar and each fact row at the fact-row minimum', () => {
    // Without this, two undefined values would compare equal below.
    expect(FACT_ROW_MIN_HEIGHT).toBe(TouchSize.min);
    expect(TRANSACTION_FORM_SKELETON_GEOMETRY).toMatchObject({
      accountRow: FACT_ROW_MIN_HEIGHT,
      factRow: FACT_ROW_MIN_HEIGHT,
    });
  });

  it('draws four fact rows: Category, Budget, Date and Note', () => {
    expect(TRANSACTION_FORM_SKELETON_GEOMETRY).toMatchObject({ factRowCount: 4 });
  });

  it('spaces the account bar from the first fact row by Spacing.md', () => {
    expect(TRANSACTION_FORM_SKELETON_GEOMETRY).toMatchObject({ rowGap: Spacing.md });
  });
});
