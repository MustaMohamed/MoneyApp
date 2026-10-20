import { PixelRatio } from 'react-native';

import {
  FACT_ROW_BADGE_FONT_SIZE,
  FACT_ROW_FITTED_PADDING,
  FACT_ROW_FONT_SIZE,
  FACT_ROW_PADDING,
  FACT_ROW_TILE,
  FACT_ROW_VALUE_GAP,
  type FactRowShape,
  resolveFactRowFlex,
  resolveFactRowGeometry,
  resolveFactRowHeight,
  resolveFactRowValueTextProps,
} from '@/components/ui/fact_row.geometry';
import {
  FITTED_LINE_SLACK,
  resolveFitAmountTextProps,
  resolveOneLineTextProps,
  scaledFontSize,
  scaledTextStyle,
} from '@/components/ui/text_scale.geometry';
import { Spacing, TouchSize, Type, lineHeightFor } from '@/constants/theme';
import { ms } from '@/utils/responsive';

const PLAIN: FactRowShape = {
  fitsValue: false,
  holdsAmount: false,
  hasCaption: false,
  wrapsValue: false,
  holdsField: false,
};

describe('fact row tokens (MA-197)', () => {
  it('keeps the canvas `.fact` tokens the transaction detail row shipped with: 14/20 text, 9.5 badge, 8 padding, 20 tile, 8 between value parts', () => {
    expect({
      font: FACT_ROW_FONT_SIZE,
      badge: FACT_ROW_BADGE_FONT_SIZE,
      padding: FACT_ROW_PADDING,
      tile: FACT_ROW_TILE,
      gap: FACT_ROW_VALUE_GAP,
      fittedPadding: FACT_ROW_FITTED_PADDING,
    }).toEqual({
      font: Type.body,
      badge: Type.compactBadge,
      padding: Spacing.xs,
      tile: ms(20),
      gap: Spacing.xs,
      fittedPadding: Spacing.xs - FITTED_LINE_SLACK / 2,
    });
  });
});

describe('resolveFactRowHeight (MA-197, from MA-181)', () => {
  // Frame C1 `.fact`: 8 above and below the taller of the 14/20 value line and the 20 account tile.
  function paddedLineAt(fontScale: number): number {
    return 2 * Spacing.xs + Math.max(lineHeightFor(scaledFontSize(Type.body, fontScale)), ms(20));
  }

  it.each([0.85, 1])('stands at the 44 touch floor at font scale %s', (fontScale) => {
    expect(resolveFactRowHeight(fontScale)).toBe(PixelRatio.roundToNearestPixel(TouchSize.min));
  });

  it.each([2, 3])(
    'is the padded value line in whole device pixels, above the touch floor, at font scale %s',
    (fontScale) => {
      const row = resolveFactRowHeight(fontScale);

      expect(row).toBe(PixelRatio.roundToNearestPixel(paddedLineAt(fontScale)));
      expect(row).toBeGreaterThan(TouchSize.min);
    },
  );

  it('grows from 2.0 to 3.0', () => {
    expect(resolveFactRowHeight(3)).toBeGreaterThan(resolveFactRowHeight(2));
  });

  it.each([1, 2, 3])(
    'holds a fitted value line and one device pixel of slack inside its fitted padding at font scale %s',
    (fontScale) => {
      const fittedLineBox = resolveFactRowHeight(fontScale) - 2 * FACT_ROW_FITTED_PADDING;

      expect(fittedLineBox + 1e-9).toBeGreaterThanOrEqual(
        scaledTextStyle(FACT_ROW_FONT_SIZE, fontScale).lineHeight + FITTED_LINE_SLACK,
      );
    },
  );
});

describe('resolveFactRowGeometry (MA-197)', () => {
  const shapes: Array<
    [string, Partial<FactRowShape>, 'height' | 'minHeight', 'plain' | 'fitted' | 'none', boolean]
  > = [
    ['a field, the Note', { holdsField: true }, 'minHeight', 'none', false],
    ['a captioned label, the stale Rate row', { hasCaption: true }, 'minHeight', 'plain', true],
    [
      'a wrapped value, the budget lookup failure',
      { wrapsValue: true },
      'minHeight',
      'plain',
      false,
    ],
    ['a fitted value with no amount, the Rate row', { fitsValue: true }, 'height', 'fitted', false],
    ['a fitted amount or count', { fitsValue: true, holdsAmount: true }, 'height', 'fitted', true],
    ['a one-line value', {}, 'height', 'plain', false],
  ];
  const paddingOf = { plain: FACT_ROW_PADDING, fitted: FACT_ROW_FITTED_PADDING, none: 0 };

  describe.each([1, 2, 3])('at font scale %s', (fontScale) => {
    it.each(shapes)(
      '%s stands at the shared row height as its %s',
      (_name, flags, sizing, padding, labelGivesWay) => {
        const row = resolveFactRowHeight(fontScale);

        expect(resolveFactRowGeometry({ ...PLAIN, ...flags }, fontScale)).toEqual({
          height: sizing === 'height' ? row : undefined,
          minHeight: sizing === 'minHeight' ? row : undefined,
          paddingVertical: paddingOf[padding],
          labelGivesWay,
        });
      },
    );
  });

  it('sets exactly one of height and minHeight on every shape', () => {
    for (const [, flags] of shapes) {
      const geometry = resolveFactRowGeometry({ ...PLAIN, ...flags }, 2);

      expect([geometry.height, geometry.minHeight].filter((v) => v !== undefined)).toHaveLength(1);
    }
  });

  it('puts a field ahead of every other flag: no padding and the label held whole', () => {
    expect(
      resolveFactRowGeometry(
        {
          fitsValue: true,
          holdsAmount: true,
          hasCaption: true,
          wrapsValue: true,
          holdsField: true,
        },
        2,
      ),
    ).toEqual({
      height: undefined,
      minHeight: resolveFactRowHeight(2),
      paddingVertical: 0,
      labelGivesWay: false,
    });
  });

  it('grows a captioned or wrapped row from the floor ahead of a fitted value, and holds the label whole beside a wrapped amount', () => {
    expect(resolveFactRowGeometry({ ...PLAIN, fitsValue: true, hasCaption: true }, 2)).toEqual({
      height: undefined,
      minHeight: resolveFactRowHeight(2),
      paddingVertical: FACT_ROW_PADDING,
      labelGivesWay: true,
    });
    expect(resolveFactRowGeometry({ ...PLAIN, wrapsValue: true, holdsAmount: true }, 2)).toEqual({
      height: undefined,
      minHeight: resolveFactRowHeight(2),
      paddingVertical: FACT_ROW_PADDING,
      labelGivesWay: false,
    });
  });
});

describe('resolveFactRowValueTextProps (MA-197)', () => {
  it.each([1, 2])('gives a fitted value the fitted amount props at font scale %s', (fontScale) => {
    const props = resolveFactRowValueTextProps(
      { ...PLAIN, fitsValue: true },
      FACT_ROW_FONT_SIZE,
      fontScale,
    );

    expect(props).toEqual(resolveFitAmountTextProps(FACT_ROW_FONT_SIZE, fontScale));
    expect(props).toHaveProperty('adjustsFontSizeToFit', fontScale > 1);
  });

  it.each([1, 2])(
    'gives a wrapped value no line cap, OS scaling and its own line box at font scale %s',
    (fontScale) => {
      const props = resolveFactRowValueTextProps(
        { ...PLAIN, wrapsValue: true },
        Type.caption,
        fontScale,
      );

      expect(props).toEqual({
        allowFontScaling: true,
        style: { fontSize: Type.caption, lineHeight: lineHeightFor(Type.caption) },
      });
      expect(props).not.toHaveProperty('numberOfLines');
    },
  );

  it.each([1, 2])(
    'gives a wrapped value the wrapped props even when it is also fitted, at font scale %s',
    (fontScale) => {
      expect(
        resolveFactRowValueTextProps(
          { ...PLAIN, wrapsValue: true, fitsValue: true, holdsAmount: true },
          Type.caption,
          fontScale,
        ),
      ).toEqual(
        resolveFactRowValueTextProps({ ...PLAIN, wrapsValue: true }, Type.caption, fontScale),
      );
    },
  );

  it.each([1, 2])(
    'gives any other value one scaled line ending in an ellipsis at font scale %s',
    (fontScale) => {
      expect(resolveFactRowValueTextProps(PLAIN, FACT_ROW_FONT_SIZE, fontScale)).toEqual(
        resolveOneLineTextProps(scaledTextStyle(FACT_ROW_FONT_SIZE, fontScale)),
      );
    },
  );
});

describe('resolveFactRowFlex (MA-197)', () => {
  it('lets the label give way first: it grows from a zero basis, and the value group keeps its own width and shrinks after', () => {
    expect(resolveFactRowFlex(true)).toEqual({
      label: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 },
      group: { flexGrow: 0, flexShrink: 1, flexBasis: 'auto' },
    });
  });

  it('holds the label whole and gives the value group the rest of the row', () => {
    expect(resolveFactRowFlex(false)).toEqual({
      label: { flexShrink: 0 },
      group: { flex: 1, minWidth: 0 },
    });
  });
});
