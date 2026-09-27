import { Size, Spacing, Type, lineHeightFor } from '@/constants/theme';
import {
  resolveSearchTallyGeometry,
  resolveTransactionsHeroGeometry,
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
  it("keeps today's rows at font scale 1.0", () => {
    expect(resolveTransactionsHeroGeometry(1)).toEqual({
      header: lineHeightFor(Type.overline),
      amount: lineHeightFor(Type.hero),
      columns: lineHeightFor(Type.micro) + Spacing.xxxs + lineHeightFor(Type.body),
      rail: Size.progressThin,
      caption: lineHeightFor(Type.chip),
    });
  });

  it('doubles every text row at font scale 2.0 and keeps the rail', () => {
    expect(resolveTransactionsHeroGeometry(2)).toEqual({
      header: lineHeightFor(Type.overline) * 2,
      amount: lineHeightFor(Type.hero) * 2,
      columns: lineHeightFor(Type.micro) * 2 + Spacing.xxxs + lineHeightFor(Type.body) * 2,
      rail: Size.progressThin,
      caption: lineHeightFor(Type.chip) * 2,
    });
  });
});
