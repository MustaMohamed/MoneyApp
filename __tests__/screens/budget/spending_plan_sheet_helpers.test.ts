import { scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { Strings } from '@/constants/strings';
import { Size, Type } from '@/constants/theme';
import {
  countSpendingPlanFaults,
  formatLimitsFigure,
  formatPlanCategoriesValue,
  resolveAllocationSlotMinHeight,
  resolveAllocationSlotWidth,
  resolvePlanDailyLine,
  resolvePlanFooterLine,
  resolvePlanScheduleFaults,
  resolveSpendingPlanFieldGeometry,
  type SpendingPlanFieldFaults,
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

describe('formatLimitsFigure', () => {
  it.each([
    [3000, false, '3,000'],
    [2000.4, true, '2,000.40'],
    [500, true, '500.00'],
  ])('formats %p with hasCents %p as %p', (value, hasCents, expected) => {
    expect(formatLimitsFigure(value, hasCents)).toBe(expected);
  });
});

describe('resolveAllocationSlotWidth', () => {
  it.each([0.85, 1])('is the slot token at font scale %s', (fontScale) => {
    expect(resolveAllocationSlotWidth(fontScale)).toBe(Size.spendingPlanAllocationSlot);
  });

  it('grows with the empty field text at font scale 2', () => {
    const width = resolveAllocationSlotWidth(2);

    expect(width).toBe(
      2 * Size.spendingPlanAllocationFieldPaddingX +
        2 * Size.fieldBorderWidth +
        2 * Size.spendingPlanAllocationSlotText,
    );
    expect(width).toBeGreaterThan(Size.spendingPlanAllocationSlot);
  });

  it('never drops below the slot token at font scale 1.3', () => {
    expect(resolveAllocationSlotWidth(1.3)).toBeGreaterThanOrEqual(Size.spendingPlanAllocationSlot);
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

describe('resolvePlanDailyLine', () => {
  it('divides the total by the inclusive days', () => {
    expect(resolvePlanDailyLine(5000, '2026-11-12', '2026-11-15')).toBe(
      Strings.budgetPlanDailyLine(4, '1,250'),
    );
  });

  it('counts a plan that starts and ends on one day as one day', () => {
    expect(resolvePlanDailyLine(500, '2026-11-12', '2026-11-12')).toBe(
      Strings.budgetPlanDailyLine(1, '500'),
    );
  });

  it('counts across a 30-day month end', () => {
    expect(resolvePlanDailyLine(1000, '2026-04-30', '2026-05-01')).toBe(
      Strings.budgetPlanDailyLine(2, '500'),
    );
  });

  it('counts the leap day', () => {
    expect(resolvePlanDailyLine(3000, '2028-02-28', '2028-03-01')).toBe(
      Strings.budgetPlanDailyLine(3, '1,000'),
    );
  });

  it('prints a fractional daily amount in whole EGP', () => {
    expect(resolvePlanDailyLine(1000, '2026-11-12', '2026-11-14')).toBe(
      Strings.budgetPlanDailyLine(3, '333'),
    );
  });

  it('escalates once to the cent when the whole amount would print as 0', () => {
    expect(resolvePlanDailyLine(1, '2026-11-12', '2026-11-14')).toBe(
      Strings.budgetPlanDailyLine(3, '0.33'),
    );
  });

  it('prints an amount under half a cent as 0.00', () => {
    expect(resolvePlanDailyLine(0.01, '2026-11-12', '2026-11-14')).toBe(
      Strings.budgetPlanDailyLine(3, '0.00'),
    );
  });

  it.each<[string, number | undefined, string, string]>([
    ['an undefined total', undefined, '2026-11-12', '2026-11-15'],
    ['an empty start', 5000, '', '2026-11-15'],
    ['an empty end', 5000, '2026-11-12', ''],
    ['an end before the start', 5000, '2026-11-15', '2026-11-12'],
  ])('shows no line for %s', (_case, total, start, end) => {
    expect(resolvePlanDailyLine(total, start, end)).toBeUndefined();
  });
});

describe('formatPlanCategoriesValue', () => {
  it('reads the pick prompt with no categories', () => {
    expect(formatPlanCategoriesValue([])).toBe(Strings.budgetPlanPickCategories);
  });

  it('reads one name alone', () => {
    expect(formatPlanCategoriesValue(['Dining Out'])).toBe(
      Strings.budgetPlanCategoriesValue(['Dining Out'], 0),
    );
  });

  it('reads two names with nothing more', () => {
    expect(formatPlanCategoriesValue(['Dining Out', 'Transport'])).toBe(
      Strings.budgetPlanCategoriesValue(['Dining Out', 'Transport'], 0),
    );
  });

  it('reads the first two names and counts the rest', () => {
    expect(formatPlanCategoriesValue(['Dining Out', 'Transport', 'Groceries'])).toBe(
      Strings.budgetPlanCategoriesValue(['Dining Out', 'Transport'], 1),
    );
  });
});

const NO_FAULTS: SpendingPlanFieldFaults = {
  name: undefined,
  total: undefined,
  endDate: undefined,
  categories: undefined,
  allocations: {},
};

describe('resolvePlanScheduleFaults', () => {
  it('faults an end one day before the start', () => {
    expect(resolvePlanScheduleFaults('2026-11-15', '2026-11-14', 1).endDate).toBe(
      Strings.budgetPlanDateInvalid,
    );
  });

  it('clears an end on the start day', () => {
    expect(resolvePlanScheduleFaults('2026-11-15', '2026-11-15', 1)).toEqual({
      endDate: undefined,
      categories: undefined,
    });
  });

  it('clears an end that crosses a month end', () => {
    expect(resolvePlanScheduleFaults('2026-01-31', '2026-02-01', 1).endDate).toBeUndefined();
  });

  it('faults an end the day before a leap day start', () => {
    expect(resolvePlanScheduleFaults('2028-02-29', '2028-02-28', 1).endDate).toBe(
      Strings.budgetPlanDateInvalid,
    );
  });

  it('faults zero categories and clears one', () => {
    expect(resolvePlanScheduleFaults('2026-11-01', '2026-11-30', 0).categories).toBe(
      Strings.budgetPlanCategoryRequired,
    );
    expect(resolvePlanScheduleFaults('2026-11-01', '2026-11-30', 1).categories).toBeUndefined();
  });
});

describe('countSpendingPlanFaults', () => {
  it('counts zero with no fault', () => {
    expect(countSpendingPlanFaults(NO_FAULTS)).toBe(0);
  });

  it('counts one scalar and two allocation faults as 3, skipping an undefined row', () => {
    expect(
      countSpendingPlanFaults({
        ...NO_FAULTS,
        name: Strings.budgetPlanNameRequired,
        allocations: {
          cat_food: Strings.budgetPlanAllocationBelowMin,
          cat_fun: Strings.errAmountInvalid,
          cat_rent: undefined,
        },
      }),
    ).toBe(3);
  });

  it('counts every scalar key', () => {
    expect(
      countSpendingPlanFaults({
        name: Strings.budgetPlanNameRequired,
        total: Strings.budgetPlanAmountRequired,
        endDate: Strings.budgetPlanDateInvalid,
        categories: Strings.budgetPlanCategoryRequired,
        allocations: {},
      }),
    ).toBe(4);
  });
});

describe('resolvePlanFooterLine', () => {
  const overLine = 'over line';

  it('reads the fault count over a standing save error and the over line', () => {
    expect(
      resolvePlanFooterLine(
        { ...NO_FAULTS, name: Strings.budgetPlanNameRequired },
        Strings.budgetPlanAllocationInvalid,
        overLine,
      ),
    ).toBe(Strings.fixFieldsMarkedAbove(1));
  });

  it('counts allocation faults in the footer', () => {
    expect(
      resolvePlanFooterLine(
        {
          ...NO_FAULTS,
          total: Strings.budgetPlanAmountRequired,
          allocations: { cat_food: Strings.budgetPlanAllocationBelowMin },
        },
        undefined,
        overLine,
      ),
    ).toBe(Strings.fixFieldsMarkedAbove(2));
  });

  it('reads the save error with no fault', () => {
    expect(
      resolvePlanFooterLine(NO_FAULTS, Strings.budgetPlanOverlapError('Food', 'Trip'), overLine),
    ).toBe(Strings.budgetPlanOverlapError('Food', 'Trip'));
  });

  it('reads the over line with no fault and no save error', () => {
    expect(resolvePlanFooterLine(NO_FAULTS, undefined, overLine)).toBe(overLine);
  });

  it('reads nothing with no fault, no save error and no over line', () => {
    expect(resolvePlanFooterLine(NO_FAULTS, undefined, undefined)).toBeUndefined();
  });

  it('ignores an undefined allocation value', () => {
    expect(
      resolvePlanFooterLine(
        { ...NO_FAULTS, allocations: { cat_food: undefined } },
        undefined,
        overLine,
      ),
    ).toBe(overLine);
  });
});
