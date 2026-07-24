import { Size } from '@/constants/theme';
import { BUDGET_COPY_PREVIEW_ROW_GEOMETRY } from '@/modules/budget/screens/budget/components/budget_copy_sheet.helpers';

describe('Budget copy sheet preview-row geometry', () => {
  it('exposes one immutable geometry contract for loading and loaded rows', () => {
    expect(BUDGET_COPY_PREVIEW_ROW_GEOMETRY).toEqual({
      minHeight: Size.budgetCopyPreviewRowHeight,
    });
    expect(Object.isFrozen(BUDGET_COPY_PREVIEW_ROW_GEOMETRY)).toBe(true);
  });
});
