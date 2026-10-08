import { scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { Strings } from '@/constants/strings';
import { Size, Type } from '@/constants/theme';
import {
  resolveAllocationSlotMinHeight,
  resolveSpendingPlanFieldGeometry,
  showsAllocationSuffix,
  validateAllocationText,
} from '@/modules/budget/screens/budget/spending_plan_sheet/spending_plan_sheet.helpers';

describe('validateAllocationText', () => {
  // Blank is unallocated and reaches the column as NULL, distinct from a deliberate 0.
  it.each([[''], ['   ']])('treats %p as unallocated rather than invalid', (text) => {
    expect(validateAllocationText(text)).toEqual({ ok: true, value: undefined });
  });

  it.each([['0'], ['0.00']])('parses %p as a deliberate zero', (text) => {
    expect(validateAllocationText(text)).toEqual({ ok: true, value: 0 });
  });

  it.each([
    ['5', 5],
    ['0.01', 0.01],
    ['1234.56', 1234.56],
  ])('parses %p as %p', (text, value) => {
    expect(validateAllocationText(text)).toEqual({ ok: true, value });
  });

  it('reports a sub-cent amount as a floor failure', () => {
    expect(validateAllocationText('0.005')).toEqual({
      ok: false,
      incomplete: false,
      message: Strings.budgetPlanAllocationBelowMin,
    });
  });

  it.each([['1.2.3'], ['abc']])('reports %p with the format message, not the floor one', (text) => {
    expect(validateAllocationText(text)).toEqual({
      ok: false,
      incomplete: false,
      message: Strings.errAmountInvalid,
    });
  });

  // A leading point is a plausible first keystroke on `decimal-pad`, so it is incomplete.
  it.each([['1.'], ['0.'], ['.'], ['.5'], ['.50'], ['.005']])(
    'flags %p as an incomplete decimal',
    (text) => {
      expect(validateAllocationText(text)).toEqual({
        ok: false,
        incomplete: true,
        message: Strings.errAmountInvalid,
      });
    },
  );
});

// The tracks are literals, not tokens: a drifted track must fail here, not on a device.
const fieldKinds = [
  { kind: 'name', size: Type.body, track: 40 },
  { kind: 'amount', size: Type.bodyStrong, track: 40 },
  { kind: 'allocation', size: Type.caption, track: 36 },
] as const;

describe('resolveSpendingPlanFieldGeometry', () => {
  describe.each(fieldKinds)('the $kind field', ({ kind, size, track }) => {
    it.each([0.85, 1])(
      'keeps its track and leaves the text to the OS at font scale %s',
      (fontScale) => {
        expect(resolveSpendingPlanFieldGeometry(kind, fontScale)).toStrictEqual({
          text: undefined,
          height: track,
        });
      },
    );

    it.each([2, 3])(
      'holds its scaled line, the input padding and both borders at font scale %s',
      (fontScale) => {
        const text = scaledTextStyle(size, fontScale);
        const geometry = resolveSpendingPlanFieldGeometry(kind, fontScale);

        expect(geometry.text).toEqual(text);
        expect(geometry.height).toBeCloseTo(text.lineHeight + 16 + 2 * Size.fieldBorderWidth, 10);
        expect(geometry.height).toBeGreaterThan(track);
      },
    );
  });
});

describe('resolveAllocationSlotMinHeight', () => {
  // The literal: today's slot is the 36 track, the 6 gap and the 20 error line.
  it.each([0.85, 1])('is 62 at font scale %s', (fontScale) => {
    expect(resolveAllocationSlotMinHeight(fontScale)).toBe(62);
  });

  it.each([2, 3])('is the allocation field height plus 26 at font scale %s', (fontScale) => {
    const field = resolveSpendingPlanFieldGeometry('allocation', fontScale);

    expect(resolveAllocationSlotMinHeight(fontScale)).toBeCloseTo(field.height + 26, 10);
    expect(resolveAllocationSlotMinHeight(fontScale)).toBeGreaterThan(62);
  });
});

describe('showsAllocationSuffix', () => {
  it.each([0.85, 1, 2, 3])('shows the suffix in an empty field at font scale %s', (fontScale) => {
    expect(showsAllocationSuffix('', fontScale)).toBe(true);
  });

  it.each([0.85, 1])('keeps the suffix beside a typed amount at font scale %s', (fontScale) => {
    expect(showsAllocationSuffix('5', fontScale)).toBe(true);
  });

  it.each([
    ['5', 1.15],
    ['5', 2],
    ['0', 1.15],
    ['0', 2],
  ])('hides the suffix once %p is typed at font scale %s', (text, fontScale) => {
    expect(showsAllocationSuffix(text, fontScale)).toBe(false);
  });
});
