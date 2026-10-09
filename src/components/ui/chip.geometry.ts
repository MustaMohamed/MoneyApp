import { type ScaledTextStyle, scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { Size, Spacing, Type } from '@/constants/theme';

// `.chip__root--size-md`'s own `padding-block`, unscaled CSS.
export const CHIP_MD_PADDING_BLOCK = 4;

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

/** mockup.html:699, `.hero-pill` at `var(--type-caption)`; `HERO_PILL_HEIGHT` at scale 1, the 4pt padding pair around the scaled caption line. */
export function resolveHeroPillGeometry(fontScale: number): ChipLabelGeometry {
  return resolveChipLabelGeometry(fontScale, Spacing.xxs);
}
