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
  //
  // Also the boundary the incomplete pattern below must not cross. '0.005' has
  // digits on both sides of its point, so it parses; a pattern widened to
  // `/^\d*\.\d*$/` to admit '.5' would swallow it as incomplete and unpin
  // scenario 12 silently. That is why the widening is two anchored alternatives
  // and not one loose one.
  it('reports a sub-cent amount as a floor failure', () => {
    expect(validateAllocationText('0.005')).toEqual({
      ok: false,
      incomplete: false,
      message: Strings.budgetPlanAllocationBelowMin,
    });
  });

  // Text that is neither a number nor on its way to being one: no repair is a
  // single keystroke away, so it says so immediately. This is the branch the
  // '.5' row below used to sit in, and it stays reachable without it -- keeping
  // it asserted is what stops the incomplete class from swallowing the format
  // class whole.
  it.each([['1.2.3'], ['abc']])('reports %p with the format message, not the floor one', (text) => {
    expect(validateAllocationText(text)).toEqual({
      ok: false,
      incomplete: false,
      message: Strings.errAmountInvalid,
    });
  });

  // An incomplete decimal is what '0.40' passes through on its way in, so the
  // flag is what keeps a message off screen while the user is still typing.
  //
  // The three leading-point rows are the correction. '.5' was pinned here as a
  // NON-incomplete format failure, on the reasoning that it fails
  // DECIMAL_PATTERN like 'abc' does -- reasoning written when these fields were
  // `number-pad` and a point was not a key on them. Under `decimal-pad` it is
  // the plausible first keystroke, the mask accepts it, and the old verdict put
  // the row red with 'Numbers only.' mid-typing and blocked Save on digits and
  // a decimal point. '.005' comes with it: the pattern will not parse it, so
  // there is no number to hold against the floor, and the missing leading digit
  // is the repair either way. Red against `/^\d*\.$/`.
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
