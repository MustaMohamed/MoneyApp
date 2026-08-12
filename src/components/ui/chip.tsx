import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Chip, cn } from 'heroui-native';
import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { Colors, Radius, Size, Spacing, Type, lineHeightFor } from '@/constants/theme';
import { GoldTokens } from '@/constants/theme_tokens';
import { ms } from '@/utils/responsive';

/**
 * `chip.tsx` is the home for HeroUI `Chip`-derived wrappers. It is named after
 * the underlying primitive rather than its current export so a non-selectable
 * `Chip` re-export can live here too. It exports `SelectablePill` (the
 * selectable gold-tint pill) and `SuccessChip` (the static confirmation
 * badge).
 */

export interface SelectablePillProps {
  /** Visible label text. */
  label: string;
  /** Selected (active) state — drives the gold-tint styling. */
  selected: boolean;
  onPress: () => void;
  /** Optional leading color dot (filter pills with a category/account color). */
  dotColor?: string;
  /**
   * Leading adornment node — when provided, replaces the dotColor dot.
   * Used for type/category icons.
   */
  startIcon?: React.ReactNode;
  /** Show a trailing gold check when `selected` (multi-select filter pills). */
  checkable?: boolean;
  /**
   * Block presses without changing appearance (e.g. locked commitment form).
   * Forwarded directly to HeroUI `Chip`'s underlying RN `Pressable` as
   * `disabled` — unlike `components/ui/button.tsx`, which maps RN `disabled`
   * onto HeroUI's `isDisabled`.
   */
  disabled?: boolean;
  /** Accessibility label; defaults to `label`. */
  accessibilityLabel?: string;
  /** Layout passthrough (e.g. `{ flex: 1 }` for equal-width currency pills). */
  style?: StyleProp<ViewStyle>;
}

/**
 * Canonical selectable pill. Wraps HeroUI `Chip`; HeroUI has no `selected`
 * boolean, so this owns the gold-tint selected/unselected styling. Purely
 * presentational — selection state lives in the parent.
 *
 * `animation="disable-all"` matches the prior plain-`Pressable` pills, which
 * had no press feedback.
 */
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
  /** Visible label text. */
  label: string;
  /** Accessibility label; defaults to `label`. */
  accessibilityLabel?: string;
}

/**
 * Static confirmation badge — mockup.html:632-639, `.badge-ok`, whose CSS
 * comment names the exact HeroUI combination it was drawn from
 * (`chip__root--variant-soft--color-success`). Purely presentational: no
 * `onPress`, and no `accessibilityRole`, so it never announces as a button.
 *
 * The fill and the label colour both come from the soft/success variant —
 * `--color-success-soft` (`chip.css:81-83`) and
 * `--color-success-soft-foreground` (`chip.css:184-186`). Passing a `bg-*` or
 * `text-*` class here would override the very thing the variant was chosen
 * for.
 *
 * Height, radius, padding and gap go in `style` rather than `className`
 * because `Chip` forwards `style` to its Pressable as
 * `[chipStyleSheet.root, style]`, so it wins over the size-variant classes
 * that set `padding-inline` and `border-radius`. `.chip__root` already
 * supplies `align-self: flex-start`, so the chip hugs its label instead of
 * stretching to the content width.
 *
 * Recorded deviation: the mockup paints the glyph `--success-soft-fg`, a
 * `color-mix` with no runtime token in this repo, and `useThemeColor` has no
 * precedent in `src/`. The glyph takes `Colors.dark.positive` (the un-mixed
 * `--success`), so glyph and label differ by one mix step.
 */
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
