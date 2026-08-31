import { Size, Spacing, TouchSize, Type, lineHeightFor } from '@/constants/theme';
import { ms } from '@/utils/responsive';

// jest-expo mocks Dimensions at 750pt, so scale clamps to 1.15; assert through ms(), not literals.
describe('zero-shift geometry tokens', () => {
  it('locks the seven authored base values', () => {
    expect(Size.fieldMessageTrack).toBe(ms(20));
    expect(Size.summaryValueSlot).toBe(ms(52));
    expect(Size.summaryCaptionSlot).toBe(ms(34));
    expect(Size.summaryPillTrack).toBe(ms(24));
    expect(Size.statusTrack).toBe(ms(34));
    // fieldHeight is deliberately not ms()-wrapped; see the test below.
    expect(Size.fieldHeight).toBe(48);
    expect(Size.progressRail).toBe(ms(55));
  });

  it('the N4 value slot stays taller than the number it has to hold', () => {
    expect(Size.summaryValueSlot).toBeGreaterThan(Type.amountEntry);
  });

  it('the field height is unscaled 48 and never breaches the touch floor', () => {
    // 48 is HeroUI Input's own unscaled min-height, so rows sized from this token align with it.
    expect(Size.fieldHeight).toBe(48);
    expect(Size.fieldHeight).toBeGreaterThanOrEqual(TouchSize.min);
  });

  it('the N4 pill row holds one padded caption line', () => {
    // Each ms() rounds independently, so this is a fit check, never an equality.
    expect(Spacing.xxs * 2 + lineHeightFor(Type.caption)).toBeLessThanOrEqual(
      Size.summaryPillTrack,
    );
  });

  it('the progress rail holds its bar and one label line', () => {
    // Each ms() rounds independently, so this is a fit check; the label row is flexed, not offset.
    expect(Spacing.sm * 2 + Size.progressThin + Size.compactBodyLineHeight).toBeLessThan(
      Size.progressRail,
    );
  });
});
