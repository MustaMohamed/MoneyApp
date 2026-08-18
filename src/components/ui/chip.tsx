import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Chip, cn } from 'heroui-native';
import React from 'react';
import { View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { Colors, Radius, Size, Spacing, Type, lineHeightFor } from '@/constants/theme';
import { CoreTokens, GoldTokens } from '@/constants/theme_tokens';
import { ms } from '@/utils/responsive';

/**
 * `chip.tsx` is the home for HeroUI `Chip`-derived wrappers. It is named after
 * the underlying primitive rather than its current export so a non-selectable
 * `Chip` re-export can live here too. It exports `SelectablePill` (the
 * selectable gold-tint pill), `SuccessChip` (the static confirmation badge)
 * and `HeroPill` (N4's static hero-card pill).
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

/** mockup.html:702, `.hero-pill svg { width: 11px }`. */
const HERO_PILL_GLYPH = ms(11);

/**
 * The pill's own composed height — mockup.html:697-699, `.hero-pill`'s 4pt
 * padding pair plus one caption line box. It gets its own name rather than
 * borrowing `Size.summaryPillTrack`: the track is the ROW's height and the two
 * are only equal while the row is one line, which is a decision the row owns.
 * `onboarding_ready.geometry.test.ts` asserts the FIT between them, never an
 * equality, so a two-line track would not silently drag the pill with it.
 */
export const HERO_PILL_HEIGHT = Spacing.xxs * 2 + lineHeightFor(Type.caption);

/**
 * mockup.html:696-701, `.hero-pill`. Frozen for the reason `N3_ROW_STYLE` is:
 * shared by reference across every pill on the card, so one stray assignment
 * would move all of them and a suite reading keys at module load would not
 * notice.
 *
 * The explicit `height` is load-bearing, not decorative. `.hero-pill` names no
 * height, and the row it sits in is a zero-slack fixed track with `overflow:
 * hidden`; a HeroUI `Chip` root carries its own box, which is exactly why
 * `SuccessChip` above has to pin `Size.compactChipHeight`. Unpinned, every pill
 * clips and no unit test sees it. `paddingVertical` stays alongside it because
 * it is the mockup's own declaration and the term `HERO_PILL_HEIGHT` is
 * composed from — the two state the same box, they do not disagree.
 *
 * Recorded deviation: `.hero-pill`'s `inset 0 1px 0 rgba(255,255,255,.07)`
 * highlight is not ported. `boxShadow` has zero style uses anywhere in `src/`,
 * and the shipped dashboard hero card omits the same inset on the same element.
 */
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
  /** Visible label text. */
  label: string;
  /** Leading glyph — the pill kind decides it, so the caller passes it. */
  glyph: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
}

/**
 * N4's hero-card pill — mockup.html:696-702, `.hero-pill`.
 *
 * `variant="secondary" color="default"` is the neutral combination
 * `SelectablePill` above already ships on the installed HeroUI Native, with its
 * appearance driven entirely by `className` and `style`. Geometry and fill go
 * in `style` rather than `className` because `Chip` forwards `style` to its
 * Pressable as `[chipStyleSheet.root, style]` and therefore wins over the
 * size-variant classes — the mechanism `SuccessChip`'s docstring records.
 * `animation="disable-all"` matches `SelectablePill`'s call for pills with no
 * press feedback; this one is static.
 *
 * The label carries `text-foreground` rather than inheriting the variant's own
 * `--color-default-soft-foreground`: mockup.html:699 paints `.hero-pill` in
 * `--foreground`, and unlike `SuccessChip` — whose whole reason for choosing
 * soft/success is that variant's fill and label colour — this pill overrides
 * the variant's fill anyway. The glyph takes the same value through
 * `CoreTokens.text1`, which `--foreground` resolves to.
 *
 * Purely presentational: no `onPress`, and no `accessibilityRole`, so it never
 * announces as a button.
 */
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
