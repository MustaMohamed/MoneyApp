import { StyleSheet } from 'react-native';

import { Size, Spacing, Type, lineHeightFor } from '@/constants/theme';
import {
  resolveBudgetCopyPreviewRowGeometry,
  resolveBudgetCopySourceRowLayout,
} from '@/modules/budget/screens/budget/components/budget_copy_sheet.helpers';

// A one-line loaded row: its padding, name and category lines at the OS scale, the category margin, the border.
function oneLineRowHeight(fontScale: number): number {
  return (
    2 * Spacing.xs +
    fontScale * (lineHeightFor(Type.body) + lineHeightFor(Type.micro)) +
    Spacing.xxxs +
    2 * StyleSheet.hairlineWidth
  );
}

describe('resolveBudgetCopyPreviewRowGeometry', () => {
  it.each([0.85, 1])('keeps the row at its token height at font scale %s', (fontScale) => {
    expect(resolveBudgetCopyPreviewRowGeometry(fontScale)).toEqual({
      minHeight: Size.budgetCopyPreviewRowHeight,
    });
  });

  it.each([2, 3])('stands as tall as a one-line loaded row at font scale %s', (fontScale) => {
    const { minHeight } = resolveBudgetCopyPreviewRowGeometry(fontScale);

    expect(minHeight).toBeCloseTo(oneLineRowHeight(fontScale), 10);
    expect(minHeight).toBeGreaterThan(Size.budgetCopyPreviewRowHeight);
  });
});

describe('resolveBudgetCopySourceRowLayout', () => {
  it.each([0.85, 1])(
    'keeps the pill and the target month on one line at font scale %s',
    (fontScale) => {
      expect(resolveBudgetCopySourceRowLayout(fontScale)).toStrictEqual({
        row: { flexDirection: 'row', alignItems: 'center' },
        filter: { flex: 1 },
      });
    },
  );

  it.each([1.15, 2, 3])(
    'stacks the target month under a pill with no flex at font scale %s',
    (fontScale) => {
      expect(resolveBudgetCopySourceRowLayout(fontScale)).toStrictEqual({
        row: { flexDirection: 'column', alignItems: 'stretch' },
        filter: undefined,
      });
    },
  );
});
