import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Chip, cn } from 'heroui-native';
import React from 'react';
import { View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { Colors, Radius, Size, Spacing, Type, lineHeightFor } from '@/constants/theme';
import { CoreTokens, GoldTokens } from '@/constants/theme_tokens';
import { ms } from '@/utils/responsive';

export interface SelectablePillProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  dotColor?: string;
  /** Leading adornment; when provided it replaces the `dotColor` dot. */
  startIcon?: React.ReactNode;
  checkable?: boolean;
  /** Forwarded to HeroUI `Chip`'s RN `Pressable` as `disabled`, not HeroUI's `isDisabled`. */
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** HeroUI `Chip` has no `selected` boolean, so this wrapper owns the gold-tint styling. */
export function SelectablePill({
  label,
  selected,
  onPress,
  dotColor,
  startIcon,
  checkable = false,
  disabled = false,
  accessibilityLabel,
  style,
}: SelectablePillProps): React.ReactElement {
  const hasAdornment = dotColor !== undefined || startIcon !== undefined || checkable;
  return (
    <Chip
      size="sm"
      variant="secondary"
      color="default"
      animation="disable-all"
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={style}
      className={cn(
        'rounded-full border',
        hasAdornment ? 'gap-1.5 px-2.5 py-1.5' : 'px-3 py-1',
        selected ? 'border-accent/50 bg-accent/15' : 'border-border bg-default/40',
      )}
    >
      {startIcon !== undefined ? (
        startIcon
      ) : dotColor !== undefined ? (
        <View style={{ backgroundColor: dotColor }} className="h-2 w-2 rounded-full" />
      ) : null}
      <Chip.Label
        className={cn(
          'text-[11px]',
          selected ? 'text-accent font-inter-semibold' : 'text-foreground/70 font-inter-medium',
        )}
      >
        {label}
      </Chip.Label>
      {checkable && selected ? (
        <MaterialCommunityIcons name="check" size={12} color={GoldTokens[500]} />
      ) : null}
    </Chip>
  );
}

/** mockup.html:633, `.badge-ok { gap: 6px }`. */
const SUCCESS_CHIP_GAP = ms(6);

/** mockup.html:639, `.badge-ok svg { width: 14px }`. */
const SUCCESS_CHIP_GLYPH = ms(14);

export interface SuccessChipProps {
  label: string;
  accessibilityLabel?: string;
}

/** `Chip` merges `style` after its size-variant classes, so geometry goes there, not in a class. */
export function SuccessChip({ label, accessibilityLabel }: SuccessChipProps): React.ReactElement {
  return (
    <Chip
      variant="soft"
      color="success"
      accessibilityLabel={accessibilityLabel ?? label}
      style={{
        height: Size.compactChipHeight,
        borderRadius: Radius.pill,
        paddingHorizontal: Spacing.sm,
        gap: SUCCESS_CHIP_GAP,
      }}
    >
      <MaterialCommunityIcons
        name="check-circle"
        size={SUCCESS_CHIP_GLYPH}
        color={Colors.dark.positive}
      />
      <Chip.Label
        className="font-inter-semibold"
        style={{ fontSize: Type.caption, lineHeight: lineHeightFor(Type.caption) }}
      >
        {label}
      </Chip.Label>
    </Chip>
  );
}

/** mockup.html:702, `.hero-pill svg { width: 11px }`. */
const HERO_PILL_GLYPH = ms(11);

/** mockup.html:697-699, `.hero-pill`'s 4pt padding pair plus one caption line box. */
export const HERO_PILL_HEIGHT = Spacing.xxs * 2 + lineHeightFor(Type.caption);

/** mockup.html:696-701, `.hero-pill`; without the explicit `height` the row clips. */
export const HERO_PILL_STYLE: Readonly<ViewStyle> = Object.freeze({
  flexDirection: 'row',
  alignItems: 'center',
  gap: Spacing.xxs,
  paddingHorizontal: Spacing.xs,
  paddingVertical: Spacing.xxs,
  borderRadius: Radius.pill,
  backgroundColor: Colors.dark.overlayWhite7,
  height: HERO_PILL_HEIGHT,
});

/** mockup.html:699, `.hero-pill` at `var(--type-caption)`. */
export const HERO_PILL_TEXT_STYLE: Readonly<TextStyle> = Object.freeze({
  fontSize: Type.caption,
  lineHeight: lineHeightFor(Type.caption),
});

export interface HeroPillProps {
  label: string;
  glyph: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
}

/** N4's hero-card pill, mockup.html:696-702, `.hero-pill`. */
export function HeroPill({ label, glyph }: HeroPillProps): React.ReactElement {
  return (
    <Chip variant="secondary" color="default" animation="disable-all" style={HERO_PILL_STYLE}>
      <MaterialCommunityIcons name={glyph} size={HERO_PILL_GLYPH} color={CoreTokens.text1} />
      <Chip.Label className="text-foreground font-inter" style={HERO_PILL_TEXT_STYLE}>
        {label}
      </Chip.Label>
    </Chip>
  );
}
