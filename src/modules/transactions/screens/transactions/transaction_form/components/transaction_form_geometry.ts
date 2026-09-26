import { Spacing, TouchSize, Type, lineHeightFor } from '@/constants/theme';
import { ms } from '@/utils/responsive';

export const FACT_ROW_MIN_HEIGHT = TouchSize.min;

export const TRANSACTION_FORM_SKELETON_GEOMETRY = {
  tabBar: ms(36),
  amount: ms(40),
  accountRow: FACT_ROW_MIN_HEIGHT,
  factRow: FACT_ROW_MIN_HEIGHT,
  factRowCount: 4,
  keyBar: { width: ms(60), height: lineHeightFor(Type.body) },
  valueBar: { width: ms(100), height: lineHeightFor(Type.body) },
  rowGap: Spacing.md,
} as const;
