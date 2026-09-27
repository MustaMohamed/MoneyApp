import { Size, Spacing, Type, lineHeightFor } from '@/constants/theme';
import {
  TRANSACTIONS_HERO_MAX_FONT_SCALE,
  resolveSearchTallyGeometry,
  resolveTransactionsHeroGeometry,
  scaledFontSize,
  scaledLineHeight,
} from '@/modules/transactions/screens/transactions/components/transactions_text.geometry';

describe('scaledLineHeight', () => {
  it('is the theme line height at font scale 1.0', () => {
    expect(scaledLineHeight(Type.micro, 1)).toBe(lineHeightFor(Type.micro));
  });

  it('doubles at font scale 2.0', () => {
    expect(scaledLineHeight(Type.micro, 2)).toBe(lineHeightFor(Type.micro) * 2);
  });
});

describe('scaledFontSize', () => {
  it('follows the font scale up to its cap', () => {
    expect(scaledFontSize(Type.overline, 1)).toBe(Type.overline);
    expect(scaledFontSize(Type.overline, 2)).toBe(Type.overline * 2);
    expect(scaledFontSize(Type.overline, 2, 1.3)).toBe(Type.overline * 1.3);
  });
});

describe('resolveSearchTallyGeometry', () => {
  it("keeps today's slot at font scale 1.0", () => {
    expect(resolveSearchTallyGeometry(1)).toEqual({
      slotHeight: Spacing.xxs + lineHeightFor(Type.micro),
      lineHeight: lineHeightFor(Type.micro),
    });
  });

  it('grows the slot and the skeleton bar with the line at font scale 2.0', () => {
    expect(resolveSearchTallyGeometry(2)).toEqual({
      slotHeight: Spacing.xxs + lineHeightFor(Type.micro) * 2,
      lineHeight: lineHeightFor(Type.micro) * 2,
    });
  });
});

describe('resolveTransactionsHeroGeometry', () => {
  function heroAt(scale: number) {
    const size = (fontSize: number) => fontSize * scale;
    return {
      overline: size(Type.overline),
      hero: size(Type.hero),
      subhead: size(Type.subhead),
      micro: size(Type.micro),
      body: size(Type.body),
      chip: size(Type.chip),
      header: lineHeightFor(size(Type.overline)),
      amount: lineHeightFor(size(Type.hero)),
      columns: lineHeightFor(size(Type.micro)) + Spacing.xxxs + lineHeightFor(size(Type.body)),
      rail: Size.progressThin,
      caption: lineHeightFor(size(Type.chip)),
    };
  }

  it("keeps today's sizes and rows at font scale 1.0", () => {
    expect(resolveTransactionsHeroGeometry(1)).toEqual(heroAt(1));
    expect(resolveTransactionsHeroGeometry(1)).toMatchObject({
      header: lineHeightFor(Type.overline),
      amount: lineHeightFor(Type.hero),
      columns: lineHeightFor(Type.micro) + Spacing.xxxs + lineHeightFor(Type.body),
      caption: lineHeightFor(Type.chip),
    });
  });

  it('scales every size and row at the cap, 1.3', () => {
    expect(TRANSACTIONS_HERO_MAX_FONT_SCALE).toBe(1.3);
    expect(resolveTransactionsHeroGeometry(1.3)).toEqual(heroAt(1.3));
  });

  it('returns the capped values at font scale 2.0', () => {
    expect(resolveTransactionsHeroGeometry(2)).toEqual(heroAt(TRANSACTIONS_HERO_MAX_FONT_SCALE));
  });
});
