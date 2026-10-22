import { type ScaledTextStyle, scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { Size, Spacing, Type, lineHeightFor } from '@/constants/theme';

/** The `SelectablePill` label's size at scale 1. */
export const SELECTABLE_PILL_LABEL_FONT_SIZE = Type.micro;

// `.chip__root--size-md`'s own `padding-block`, unscaled CSS.
export const CHIP_MD_PADDING_BLOCK = 4;

// `SelectablePill`'s `border` class, unscaled CSS px; React Native counts it inside the chip's height.
export const PILL_BORDER_WIDTH = 1;

// A `SelectablePill` with no adornment takes `py-1`, unscaled CSS px.
export const SELECTABLE_PILL_PADDING_BLOCK = 4;

/** The bare pill's height at scale 1, its shortest. */
export const SELECTABLE_PILL_BARE_HEIGHT: number =
  lineHeightFor(SELECTABLE_PILL_LABEL_FONT_SIZE) +
  2 * SELECTABLE_PILL_PADDING_BLOCK +
  2 * PILL_BORDER_WIDTH;

/** A pill never exceeds its line, so a label that wraps keeps the pill's rounded right end inside its card. */
export const WRAPPING_PILL_STYLE = { maxWidth: '100%' } as const;

/** The label shrinks to wrap inside the pill instead of pushing it past its line. */
export const WRAPPING_PILL_LABEL_STYLE = { flexShrink: 1 } as const;

export interface ChipLabelGeometry {
  height: number;
  label: ScaledTextStyle;
}

/** A chip's scaled caption line inside a block padding pair, never shorter than `floor`. */
function resolveChipLabelGeometry(
  fontScale: number,
  paddingBlock: number,
  floor = 0,
): ChipLabelGeometry {
  const label = scaledTextStyle(Type.caption, fontScale);
  return { height: Math.max(floor, label.lineHeight + 2 * paddingBlock), label };
}

/** `Size.compactChipHeight` is the floor; above it the chip is its scaled label line inside the md padding. */
export function resolveSuccessChipGeometry(fontScale: number): ChipLabelGeometry {
  return resolveChipLabelGeometry(fontScale, CHIP_MD_PADDING_BLOCK, Size.compactChipHeight);
}

/** mockup.html:699, `.hero-pill` at `var(--type-caption)`; `HERO_PILL_HEIGHT` at scale 1, the 4pt padding pair around the scaled caption line, never shorter than `floor`. */
export function resolveHeroPillGeometry(fontScale: number, floor = 0): ChipLabelGeometry {
  return resolveChipLabelGeometry(fontScale, Spacing.xxs, floor);
}
