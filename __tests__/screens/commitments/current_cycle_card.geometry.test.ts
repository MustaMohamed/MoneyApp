import { PixelRatio } from 'react-native';

import { STATUS_BADGE_PADDING_VERTICAL } from '@/components/ui/status_badge';
import { FITTED_LINE_SLACK } from '@/components/ui/text_scale.geometry';
import { Radius, Size, Spacing, Type, lineHeightFor } from '@/constants/theme';
import {
  CURRENT_CYCLE_ACTIONS_GAP,
  CURRENT_CYCLE_ACTION_GAP,
  CURRENT_CYCLE_AMOUNT_FONT_SIZE,
  CURRENT_CYCLE_AMOUNT_GAP,
  CURRENT_CYCLE_CARD_BORDER_WIDTH,
  CURRENT_CYCLE_CARD_FRAME_STYLE,
  CURRENT_CYCLE_CODE_FONT_SIZE,
  CURRENT_CYCLE_DAY_LINE_FONT_SIZE,
  CURRENT_CYCLE_DUE_DAY_FONT_SIZE,
  CURRENT_CYCLE_LINE_GAP,
  CURRENT_CYCLE_OVERLINE_FONT_SIZE,
  CURRENT_CYCLE_ROW_GAP,
  resolveCurrentCycleCardGeometry,
} from '@/modules/commitments/screens/commitments/detail/components/current_cycle_card.geometry';

const PIXEL_2_DENSITY = 2.625;
const FONT_SCALES = [0.85, 1, 1.3, 2];

interface CardTokens {
  type: typeof Type;
  spacing: typeof Spacing;
  size: typeof Size;
  slack: number;
  ratio: number;
}

interface CardGeometry {
  headerHeight: number;
  bodyHeight: number;
  height: number;
}

const JEST_TOKENS: CardTokens = {
  type: Type,
  spacing: Spacing,
  size: Size,
  slack: FITTED_LINE_SLACK,
  ratio: PixelRatio.get(),
};

// Android ceils a scaled line box to a whole device pixel.
function lineBox(tokens: CardTokens, fontSize: number, fontScale: number): number {
  return Math.ceil(lineHeightFor(fontSize * fontScale) * tokens.ratio - 1e-6) / tokens.ratio;
}

// The overline beside the `tagMd` badge, whose padding no font scale grows.
function headerAt(tokens: CardTokens, fontScale: number): number {
  return Math.max(
    lineBox(tokens, tokens.type.overline, fontScale),
    lineBox(tokens, tokens.type.micro, fontScale) + 2 * STATUS_BADGE_PADDING_VERTICAL,
  );
}

// The due day over its day line, beside the fitted amount.
function bodyAt(tokens: CardTokens, fontScale: number): number {
  return Math.max(
    lineBox(tokens, tokens.type.body, fontScale) +
      tokens.spacing.xxxs +
      lineBox(tokens, tokens.type.micro, fontScale),
    lineBox(tokens, tokens.type.title, fontScale) + tokens.slack,
  );
}

function cardAt(tokens: CardTokens, fontScale: number, showsActions: boolean): CardGeometry {
  const { spacing, size } = tokens;
  const headerHeight = headerAt(tokens, fontScale);
  const bodyHeight = bodyAt(tokens, fontScale);
  const sum =
    2 * size.hairline +
    spacing.sm +
    headerHeight +
    spacing.xs +
    bodyHeight +
    (showsActions ? spacing.sm + size.ctaFooterTrack : 0) +
    spacing.sm +
    spacing.xxxs;
  return {
    headerHeight,
    bodyHeight,
    height: Math.round(sum * tokens.ratio + 1e-6) / tokens.ratio,
  };
}

function expectGeometry(actual: CardGeometry, expected: CardGeometry): void {
  expect(actual.headerHeight).toBeCloseTo(expected.headerHeight, 9);
  expect(actual.bodyHeight).toBeCloseTo(expected.bodyHeight, 9);
  expect(actual.height).toBeCloseTo(expected.height, 9);
}

describe('resolveCurrentCycleCardGeometry (MA-267)', () => {
  it('holds the frame, gaps and type sizes the This cycle card draws, with its 1 dp border', () => {
    expect(Object.isFrozen(CURRENT_CYCLE_CARD_FRAME_STYLE)).toBe(true);
    expect({
      frame: CURRENT_CYCLE_CARD_FRAME_STYLE,
      border: CURRENT_CYCLE_CARD_BORDER_WIDTH,
      rowGap: CURRENT_CYCLE_ROW_GAP,
      lineGap: CURRENT_CYCLE_LINE_GAP,
      amountGap: CURRENT_CYCLE_AMOUNT_GAP,
      actionsGap: CURRENT_CYCLE_ACTIONS_GAP,
      actionGap: CURRENT_CYCLE_ACTION_GAP,
      overline: CURRENT_CYCLE_OVERLINE_FONT_SIZE,
      dueDay: CURRENT_CYCLE_DUE_DAY_FONT_SIZE,
      dayLine: CURRENT_CYCLE_DAY_LINE_FONT_SIZE,
      amount: CURRENT_CYCLE_AMOUNT_FONT_SIZE,
      code: CURRENT_CYCLE_CODE_FONT_SIZE,
    }).toEqual({
      frame: {
        borderRadius: Radius.detailCard,
        boxShadow: 'none',
        paddingTop: Spacing.sm,
        paddingBottom: Spacing.sm + Spacing.xxxs,
        paddingHorizontal: Spacing.md,
        borderWidth: Size.hairline,
      },
      border: Size.hairline,
      rowGap: Spacing.xs,
      lineGap: Spacing.xxxs,
      amountGap: Spacing.xxs,
      actionsGap: Spacing.sm,
      actionGap: Spacing.xs,
      overline: Type.overline,
      dueDay: Type.body,
      dayLine: Type.micro,
      amount: Type.title,
      code: Type.micro,
    });
  });

  it.each(FONT_SCALES)(
    'sums border, padding, header, gap, body and the action row the loaded card draws at font scale %s',
    (fontScale) => {
      expectGeometry(
        resolveCurrentCycleCardGeometry(fontScale, true),
        cardAt(JEST_TOKENS, fontScale, true),
      );
      expectGeometry(
        resolveCurrentCycleCardGeometry(fontScale, false),
        cardAt(JEST_TOKENS, fontScale, false),
      );
    },
  );

  it.each([true, false])(
    'grows with the font scale when the action row shows: %s',
    (showsActions) => {
      const heights = FONT_SCALES.map(
        (fontScale) => resolveCurrentCycleCardGeometry(fontScale, showsActions).height,
      );

      for (let i = 1; i < heights.length; i += 1) {
        expect(heights[i]).toBeGreaterThan(heights[i - 1]);
      }
    },
  );

  it.each(FONT_SCALES)(
    'is taller with the action row by its gap and the 48 dp button track, within one device pixel, at font scale %s',
    (fontScale) => {
      const extra =
        resolveCurrentCycleCardGeometry(fontScale, true).height -
        resolveCurrentCycleCardGeometry(fontScale, false).height;

      expect(
        Math.abs(extra - (CURRENT_CYCLE_ACTIONS_GAP + Size.ctaFooterTrack)),
      ).toBeLessThanOrEqual(1 / PixelRatio.get() + 1e-9);
    },
  );

  it('lands on whole device pixels and the ceiled line boxes on a 2.625 density screen', () => {
    const rows: { actual: CardGeometry; expected: CardGeometry }[] = [];
    // The type sizes and the fitted slack compute at module load, so the density mock needs a fresh copy.
    jest.isolateModules(() => {
      const isolated = jest.requireActual<{ PixelRatio: typeof PixelRatio }>('react-native');
      jest.spyOn(isolated.PixelRatio, 'get').mockReturnValue(PIXEL_2_DENSITY);
      const theme = jest.requireActual<{
        Type: typeof Type;
        Spacing: typeof Spacing;
        Size: typeof Size;
      }>('@/constants/theme');
      const textScale = jest.requireActual<{ FITTED_LINE_SLACK: number }>(
        '@/components/ui/text_scale.geometry',
      );
      const card = jest.requireActual<{
        resolveCurrentCycleCardGeometry: typeof resolveCurrentCycleCardGeometry;
      }>('@/modules/commitments/screens/commitments/detail/components/current_cycle_card.geometry');
      const tokens: CardTokens = {
        type: theme.Type,
        spacing: theme.Spacing,
        size: theme.Size,
        slack: textScale.FITTED_LINE_SLACK,
        ratio: PIXEL_2_DENSITY,
      };
      for (const fontScale of [1, 1.3, 2]) {
        for (const showsActions of [true, false]) {
          rows.push({
            actual: card.resolveCurrentCycleCardGeometry(fontScale, showsActions),
            expected: cardAt(tokens, fontScale, showsActions),
          });
        }
      }
    });

    expect(rows).toHaveLength(6);
    for (const { actual, expected } of rows) {
      const pixels = actual.height * PIXEL_2_DENSITY;
      expect(Math.abs(pixels - Math.round(pixels))).toBeLessThan(1e-6);
      expectGeometry(actual, expected);
    }
  });
});
