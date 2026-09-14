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

/** B1 `.lgrp`: the gutter is this screen's, the same `Spacing.md` `SectionHeader` takes above it. */
export const ACCOUNTS_LIST_CARD_STYLE: Readonly<ViewStyle> = Object.freeze({
  marginHorizontal: Spacing.md,
});

/** B4 `.lgrp`, 12 under the active card; its own style so `ACCOUNTS_LIST_CARD_STYLE` keeps one key. */
export const ACCOUNTS_LIST_ARCHIVED_CARD_STYLE: Readonly<ViewStyle> = Object.freeze({
  marginHorizontal: Spacing.md,
  marginTop: Spacing.sm,
});

/** B4 `.lg-acc`: the collapsible header, 52 high. */
export const ACCOUNTS_LIST_ARCHIVED_HEADER_STYLE: Readonly<ViewStyle> = Object.freeze({
  height: Size.archivedCardHeaderHeight,
  paddingHorizontal: Spacing.md,
  gap: Spacing.xs,
  flexDirection: 'row',
  alignItems: 'center',
});

/** B5 `.ar-row`: 8 vertical against the canvas 10, since the 56 minimum decides the height. */
export const ACCOUNTS_LIST_ARCHIVED_ROW_STYLE: Readonly<ViewStyle> = Object.freeze({
  minHeight: Size.archivedRowMinHeight,
  paddingLeft: Spacing.md,
  paddingRight: Spacing.sm,
  paddingVertical: Spacing.xs,
  gap: Spacing.sm,
  flexDirection: 'row',
  alignItems: 'center',
});

/** B7 `.rail`: `padding: 4px 16px` on the canvas, as margins here since the scroll has no gutter. */
export const ACCOUNTS_LIST_RAIL_STYLE: Readonly<ViewStyle> = Object.freeze({
  marginHorizontal: Spacing.md,
  marginTop: Spacing.xxs,
  marginBottom: Spacing.xxs,
});
