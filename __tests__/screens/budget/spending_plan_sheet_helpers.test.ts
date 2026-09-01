import { Strings } from '@/constants/strings';
import { validateAllocationText } from '@/modules/budget/screens/budget/spending_plan_sheet/spending_plan_sheet.helpers';

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
