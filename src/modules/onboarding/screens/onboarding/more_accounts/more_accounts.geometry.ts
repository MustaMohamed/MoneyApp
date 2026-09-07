import type { ViewStyle } from 'react-native';

import { Size, Spacing } from '@/constants/theme';
import {
  DEFAULT_ACCOUNT_COLOR,
  findAccountColor,
} from '@/modules/accounts/constants/account_palette';
import { BROADSHEET_HEADLINE_TRACKING_EM } from '@/modules/onboarding/components/onboarding_shell/onboarding_broadsheet';
import { ms } from '@/utils/responsive';

/** mockup.html:619, `.lrow { min-height: var(--size-budget-category-row-height) }`. */
export const N3_ROW_MIN_HEIGHT = Size.listRowHeight;

/** mockup.html:617-620, `.lrow`; layout keys sit here because `style` beats `className` in RN. */
export const N3_ROW_STYLE: Readonly<ViewStyle> = Object.freeze({
  minHeight: N3_ROW_MIN_HEIGHT,
  paddingHorizontal: Spacing.md,
  paddingVertical: Spacing.sm,
  gap: Spacing.sm,
  flexDirection: 'row',
  alignItems: 'center',
});

/** mockup.html:624, `.lrow .ty { gap: 5px }`. */
export const N3_ROW_TYPE_GAP = ms(5);

/** mockup.html:625, `.lrow .ty svg { width: 13px }`. */
export const N3_ROW_TYPE_GLYPH = ms(13);

/** mockup.html:2014, the headline's inline `line-height: 1.12`. */
export const N3_HEADLINE_LINE_HEIGHT_RATIO = 1.12;

/** mockup.html:411, `.b-headline { letter-spacing: -0.01em }`. */
export const N3_HEADLINE_TRACKING_EM = BROADSHEET_HEADLINE_TRACKING_EM;

/** The dot fill: mockup.html:574, `.dot`. */
export function resolveAccountRowDotColor(color: string | null): string {
  if (color === null) return DEFAULT_ACCOUNT_COLOR;
  return findAccountColor(color)?.hex ?? DEFAULT_ACCOUNT_COLOR;
}
