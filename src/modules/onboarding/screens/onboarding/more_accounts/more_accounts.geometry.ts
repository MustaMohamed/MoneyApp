import type { ViewStyle } from 'react-native';

import { ACCOUNT_TYPE_LABELS } from '@/constants/account_type_labels';
import { Size, Spacing } from '@/constants/theme';
import {
  DEFAULT_ACCOUNT_COLOR,
  findAccountColor,
} from '@/modules/accounts/constants/account_palette';
import type { Account } from '@/modules/accounts/entities/account.entity';
import { BROADSHEET_HEADLINE_TRACKING_EM } from '@/modules/onboarding/components/onboarding_shell/onboarding_broadsheet';
import { formatCurrencyParts } from '@/utils/format_amount';
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

/** Reads `current_balance`, not `opening_balance`: the two are equal only at account creation. */
export function resolveAccountRowA11yLabel(account: Account): string {
  const { value, code } = formatCurrencyParts(account.current_balance, account.currency);
  return `${account.name}, ${ACCOUNT_TYPE_LABELS[account.type]}, ${value} ${code}`;
}
