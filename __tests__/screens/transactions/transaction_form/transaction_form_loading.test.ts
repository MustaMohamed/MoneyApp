import { SHEET_FOOTER_CLEARANCE } from '@/components/ui/sheet';
import { Size, Spacing, TouchSize, Type, lineHeightFor } from '@/constants/theme';
import {
  FACT_ROW_MIN_HEIGHT,
  TRANSACTION_FORM_CONTENT_CONTAINER_STYLE,
  TRANSACTION_FORM_FOOTER_CLEARANCE,
  TRANSACTION_FORM_SKELETON_GEOMETRY,
} from '@/modules/transactions/screens/transactions/transaction_form/components/transaction_form_geometry';

describe('TRANSACTION_FORM_SKELETON_GEOMETRY', () => {
  it('sizes the account bar and each fact row at the fact-row minimum', () => {
    // Without this, two undefined values would compare equal below.
    expect(FACT_ROW_MIN_HEIGHT).toBe(TouchSize.min);
    expect(TRANSACTION_FORM_SKELETON_GEOMETRY).toMatchObject({
      accountRow: FACT_ROW_MIN_HEIGHT,
      factRow: FACT_ROW_MIN_HEIGHT,
    });
  });

  it('draws four fact rows: Category, Budget, Date and Note', () => {
    expect(TRANSACTION_FORM_SKELETON_GEOMETRY).toMatchObject({ factRowCount: 4 });
  });

  it('sizes the key and value bars at the fact row text line box', () => {
    expect(TRANSACTION_FORM_SKELETON_GEOMETRY.keyBar.height).toBe(lineHeightFor(Type.body));
    expect(TRANSACTION_FORM_SKELETON_GEOMETRY.valueBar.height).toBe(lineHeightFor(Type.body));
  });
});

describe('transaction form content inset', () => {
  it('clears the bare CTA footer plus the status track at its two-line cap and its gap', () => {
    expect(TRANSACTION_FORM_FOOTER_CLEARANCE).toBe(
      SHEET_FOOTER_CLEARANCE + Size.statusTrack + Spacing.xs,
    );
  });

  it('pads the body and the skeleton alike and gaps their rows by Spacing.xs', () => {
    expect(TRANSACTION_FORM_CONTENT_CONTAINER_STYLE).toEqual({
      padding: Spacing.md,
      gap: Spacing.xs,
      paddingBottom: TRANSACTION_FORM_FOOTER_CLEARANCE,
    });
  });
});
