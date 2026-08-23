import { Strings } from '@/constants/strings';
import { validateAllocationText } from '@/modules/budget/screens/budget/spending_plan_sheet/spending_plan_sheet.helpers';

describe('validateAllocationText', () => {
  // Blank is unallocated, never an error -- the state that reaches the column
  // as NULL. Distinct from a deliberate 0 at every layer (@layla Q5(b)).
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

  // Clears DECIMAL_PATTERN, fails the floor: the allocation-specific message,
  // not the format one. Scenario rows 4 and 12.
  it('reports a sub-cent amount as a floor failure', () => {
    expect(validateAllocationText('0.005')).toEqual({
      ok: false,
      incomplete: false,
      message: Strings.budgetPlanAllocationInvalid,
    });
  });

  // '.5' fails the pattern, so it is a format failure -- and 'Each allocation
  // must be 0 or at least 0.01.' is the wrong sentence for it.
  it('reports a pattern failure with the format message, not the floor one', () => {
    expect(validateAllocationText('.5')).toEqual({
      ok: false,
      incomplete: false,
      message: Strings.errAmountInvalid,
    });
  });

  // An incomplete decimal is what '0.40' passes through on its way in, so the
  // flag is what keeps a message off screen while the user is still typing.
  it.each([['1.'], ['0.'], ['.']])('flags %p as an incomplete decimal', (text) => {
    expect(validateAllocationText(text)).toEqual({
      ok: false,
      incomplete: true,
      message: Strings.errAmountInvalid,
    });
  });
});
