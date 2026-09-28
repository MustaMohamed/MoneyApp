import { scaledFontSize } from '@/components/ui/text_scale.geometry';
import { Size, Spacing, Type, lineHeightFor } from '@/constants/theme';
import {
  TRANSACTIONS_HERO_MAX_FONT_SCALE,
  resolveDayHeaderGeometry,
  resolveSearchTallyGeometry,
  resolveTransactionsHeroGeometry,
} from '@/modules/transactions/screens/transactions/components/transactions_text.geometry';

describe('resolveSearchTallyGeometry', () => {
  it("keeps today's slot at font scale 1.0", () => {
    expect(resolveSearchTallyGeometry(1)).toEqual({
      slotHeight: Spacing.xxs + lineHeightFor(Type.micro),
      lineHeight: lineHeightFor(Type.micro),
    });
  });

  it.each([1.3, 2])(
    "sizes the line and the slot from the text's own scaled size at font scale %s",
    (scale) => {
      const lineHeight = lineHeightFor(scaledFontSize(Type.micro, scale));
      expect(resolveSearchTallyGeometry(scale)).toEqual({
        slotHeight: Spacing.xxs + lineHeight,
        lineHeight,
      });
    },
  );
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

describe('resolveDayHeaderGeometry', () => {
  it.each([1, 1.3, 2])(
    'sizes the label, the pill and the header from the caption size at font scale %s, uncapped',
    (scale) => {
      const fontSize = Type.caption * scale;
      const lineHeight = lineHeightFor(fontSize);
      const pillHeight = lineHeight + 2 * Spacing.xxxs;
      expect(resolveDayHeaderGeometry(scale)).toEqual({
        fontSize,
        lineHeight,
        pillHeight,
        height: Spacing.md + pillHeight + Spacing.xs,
      });
    },
  );
});
