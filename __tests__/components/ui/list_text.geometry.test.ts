import {
  LIST_HERO_MAX_FONT_SCALE,
  resolveListHeroGeometry,
} from '@/components/ui/list_text.geometry';
import { Size, Spacing, Type, lineHeightFor } from '@/constants/theme';

describe('resolveListHeroGeometry', () => {
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
      counters: Math.max(Size.statusCounterIcon, lineHeightFor(size(Type.micro))),
    };
  }

  it("keeps today's sizes and rows at font scale 1.0", () => {
    expect(resolveListHeroGeometry(1)).toEqual(heroAt(1));
    expect(resolveListHeroGeometry(1)).toMatchObject({
      header: lineHeightFor(Type.overline),
      amount: lineHeightFor(Type.hero),
      columns: lineHeightFor(Type.micro) + Spacing.xxxs + lineHeightFor(Type.body),
      caption: lineHeightFor(Type.chip),
    });
  });

  it('scales every size and row at the cap, 1.3', () => {
    expect(LIST_HERO_MAX_FONT_SCALE).toBe(1.3);
    expect(resolveListHeroGeometry(1.3)).toEqual(heroAt(1.3));
  });

  it('returns the capped values at font scale 2.0', () => {
    expect(resolveListHeroGeometry(2)).toEqual(heroAt(LIST_HERO_MAX_FONT_SCALE));
  });
});
