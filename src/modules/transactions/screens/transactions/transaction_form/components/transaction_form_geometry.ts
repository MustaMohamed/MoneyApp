import { SHEET_FOOTER_CLEARANCE } from '@/components/ui/sheet';
import { Size, Spacing, TouchSize, Type, lineHeightFor } from '@/constants/theme';
import { ms } from '@/utils/responsive';

export const FACT_ROW_MIN_HEIGHT = TouchSize.min;

/** The gap between the status track and Save. */
export const TRANSACTION_FORM_STATUS_GAP = Spacing.xs;

/** The bare CTA's clearance plus the status track at its two-line cap and its gap above Save. */
export const TRANSACTION_FORM_FOOTER_CLEARANCE =
  SHEET_FOOTER_CLEARANCE + Size.statusTrack + TRANSACTION_FORM_STATUS_GAP;

/** D6: the sheet's 16 padding plus the hero's 16 margin, since the hero root spans the sheet width. */
export const AMOUNT_RING_INSET = Spacing.xxl;

export const TRANSACTION_FORM_CONTENT_CONTAINER_STYLE = {
  padding: Spacing.md,
  gap: Spacing.xs,
  paddingBottom: TRANSACTION_FORM_FOOTER_CLEARANCE,
};

export const TRANSACTION_FORM_SKELETON_GEOMETRY = {
  tabBar: ms(36),
  amount: ms(40),
  accountRow: FACT_ROW_MIN_HEIGHT,
  factRow: FACT_ROW_MIN_HEIGHT,
  factRowCount: 4,
  keyBar: { width: ms(60), height: lineHeightFor(Type.body) },
  valueBar: { width: ms(100), height: lineHeightFor(Type.body) },
} as const;
