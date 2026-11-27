import type { ViewStyle } from 'react-native';

import { Size, Spacing } from '@/constants/theme';

// The row's `px-4 py-2.5`, unscaled CSS px, shared by the loaded row and its skeleton.
export const CATEGORY_BUDGET_ROW_STYLE: Readonly<ViewStyle> = Object.freeze({
  flexDirection: 'row',
  alignItems: 'center',
  gap: Spacing.sm,
  minHeight: Size.budgetDetailRowMinHeight,
  paddingHorizontal: 16,
  paddingVertical: 10,
});
