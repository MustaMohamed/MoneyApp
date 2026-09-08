import type { TextStyle, ViewStyle } from 'react-native';

import { Size, Spacing, Type, lineHeightFor } from '@/constants/theme';

/** B1 `.cb-row`, 12 on the right; layout keys sit here because `style` beats `className` in RN. */
export const ACCOUNTS_LIST_ROW_STYLE: Readonly<ViewStyle> = Object.freeze({
  minHeight: Size.accountListRowMinHeight,
  paddingLeft: Spacing.md,
  paddingRight: Spacing.sm,
  paddingVertical: Spacing.sm,
  gap: Spacing.sm,
  flexDirection: 'row',
  alignItems: 'center',
});

/** B1 `.cb-row .cap`, 11 over 14 — the currency code's size, not the 12 caption's. */
export const ACCOUNTS_LIST_ROW_CAPTION_STYLE: Readonly<TextStyle> = Object.freeze({
  fontSize: Type.micro,
  lineHeight: lineHeightFor(Type.micro),
  marginTop: Spacing.xxxs,
});

/** B1 `.lgrp`: the gutter is this screen's, matching `SectionHeader`'s own `mx-4` above it. */
export const ACCOUNTS_LIST_CARD_STYLE: Readonly<ViewStyle> = Object.freeze({
  marginHorizontal: Spacing.md,
});
