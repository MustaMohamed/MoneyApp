import { StyleSheet } from 'react-native';

import { Size, Spacing, Type, lineHeightFor } from '@/constants/theme';

/** A loaded row whose name and category line each fit one line: padding, both OS-scaled lines, the line margin, the border. */
export function resolveBudgetCopyPreviewRowGeometry(fontScale: number): { minHeight: number } {
  return {
    minHeight: Math.max(
      Size.budgetCopyPreviewRowHeight,
      2 * Spacing.xs +
        fontScale * (lineHeightFor(Type.body) + lineHeightFor(Type.micro)) +
        Spacing.xxxs +
        2 * StyleSheet.hairlineWidth,
    ),
  };
}

export interface BudgetCopySourceRowLayout {
  row: { flexDirection: 'row' | 'column'; alignItems: 'center' | 'stretch' };
  filter: { flex: 1 } | undefined;
}

/** Above scale 1 the target month drops under the pill, which then carries no `flex`: in a column it would size the pill from the column. */
export function resolveBudgetCopySourceRowLayout(fontScale: number): BudgetCopySourceRowLayout {
  return fontScale <= 1
    ? { row: { flexDirection: 'row', alignItems: 'center' }, filter: { flex: 1 } }
    : { row: { flexDirection: 'column', alignItems: 'stretch' }, filter: undefined };
}
