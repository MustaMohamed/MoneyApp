import { Size, Spacing, touchFloorHitSlop } from '@/constants/theme';
import { ms } from '@/utils/responsive';

/** Lifts the compact chip to the touch floor; unscaled, so it can outgrow the scaled paddings on a small phone. */
export const CHIP_SLOP_Y = touchFloorHitSlop(Size.compactChipHeight).top;

/** Android drops a touch outside the ScrollView, so each padding holds the whole slop. */
export const ROW_PADDING_TOP = Math.max(ms(9), CHIP_SLOP_Y);
export const ROW_PADDING_BOTTOM = Math.max(Spacing.xs, CHIP_SLOP_Y);
