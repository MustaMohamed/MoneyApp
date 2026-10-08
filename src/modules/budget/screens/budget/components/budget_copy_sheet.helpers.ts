import { StyleSheet } from 'react-native';

import { Size, Spacing, Type, lineHeightFor } from '@/constants/theme';

// The preview row's terms: the height sum below and the sheet's `row`, `rowTitle` and `rowMeta` styles read them.
export const BUDGET_COPY_PREVIEW_ROW_PADDING_Y = Spacing.xs;
export const BUDGET_COPY_PREVIEW_ROW_TITLE_FONT_SIZE = Type.body;
export const BUDGET_COPY_PREVIEW_ROW_META_FONT_SIZE = Type.micro;
export const BUDGET_COPY_PREVIEW_ROW_META_MARGIN_TOP = Spacing.xxxs;
export const BUDGET_COPY_PREVIEW_ROW_BORDER_WIDTH = StyleSheet.hairlineWidth;

/** A loaded row whose name and category line each fit one line: padding, both OS-scaled lines, the line margin, the border. */
export function resolveBudgetCopyPreviewRowGeometry(fontScale: number): { minHeight: number } {
  return {
    minHeight: Math.max(
      Size.budgetCopyPreviewRowHeight,
      2 * BUDGET_COPY_PREVIEW_ROW_PADDING_Y +
        fontScale *
          (lineHeightFor(BUDGET_COPY_PREVIEW_ROW_TITLE_FONT_SIZE) +
            lineHeightFor(BUDGET_COPY_PREVIEW_ROW_META_FONT_SIZE)) +
        BUDGET_COPY_PREVIEW_ROW_META_MARGIN_TOP +
        2 * BUDGET_COPY_PREVIEW_ROW_BORDER_WIDTH,
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
