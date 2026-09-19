import type { Insets, TextStyle, ViewStyle } from 'react-native';

import {
  Colors,
  Radius,
  Size,
  Spacing,
  TouchSize,
  Type,
  lineHeightFor,
  withAlpha,
} from '@/constants/theme';

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

/** B4 `.lg-acc`: the collapsible header row, 52 high, on a View inside the trigger. */
export const ACCOUNTS_LIST_ARCHIVED_HEADER_STYLE: Readonly<ViewStyle> = Object.freeze({
  flex: 1,
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

/** B7 `.note`, 12 over 16, centred, margin 12 16 0 under the active card. */
export const ACCOUNTS_LIST_REORDER_NOTE_STYLE: Readonly<TextStyle> = Object.freeze({
  fontSize: Type.caption,
  lineHeight: lineHeightFor(Type.caption),
  marginTop: Spacing.sm,
  marginHorizontal: Spacing.md,
  textAlign: 'center',
});

/** B6 grip: none on the left, or a tap on the balance's edge stops opening the account. */
export const ACCOUNTS_LIST_GRIP_HIT_SLOP: Readonly<Insets> = Object.freeze({
  top: (TouchSize.min - Size.reorderGripSlot) / 2,
  bottom: (TouchSize.min - Size.reorderGripSlot) / 2,
  right: TouchSize.min - Size.reorderGripSlot,
  left: 0,
});

/** B6 lifted row: 1px accent/50 at radius 12, margin 4/6; the fill is a class on the inner View, and no shadow in either mode. */
export const ACCOUNTS_LIST_LIFTED_ROW_STYLE: Readonly<ViewStyle> = Object.freeze({
  borderWidth: Size.hairline,
  borderColor: withAlpha(Colors.dark.gold, '80'),
  borderRadius: Radius.md,
  marginVertical: Spacing.xxs,
  marginHorizontal: Size.liftedRowInset,
  overflow: 'hidden',
});

/** B6: the slot and the lifted copy float over the active card's rows, from its top edge. */
export const ACCOUNTS_LIST_FLOATING_STYLE: Readonly<ViewStyle> = Object.freeze({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
});

/** B6 drop slot: a transparent dashed accent/45 outline, a row tall, at radius 12. */
export const ACCOUNTS_LIST_DROP_SLOT_STYLE: Readonly<ViewStyle> = Object.freeze({
  minHeight: Size.accountListRowMinHeight,
  borderWidth: Size.hairline,
  borderStyle: 'dashed',
  borderColor: withAlpha(Colors.dark.gold, '73'),
  borderRadius: Radius.md,
  backgroundColor: 'transparent',
});
