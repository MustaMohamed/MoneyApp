import { resolveSuggestedAmounts } from '@/modules/budget/screens/budget/suggested_amounts.helpers';

describe('resolveSuggestedAmounts', () => {
  it('reads December for a January budget and October to December for its mean', () => {
    expect(
      resolveSuggestedAmounts('2027-01', {
        '2026-09': 9000,
        '2026-10': 900,
        '2026-11': 600,
        '2026-12': 300,
        '2027-01': 5000,
      }),
    ).toEqual({ spentLastMonth: 300, threeMonthAverage: 600 });
  });

  it('counts a month with no spending as zero in the mean: 600, absent and 900 give 500', () => {
    expect(resolveSuggestedAmounts('2026-11', { '2026-10': 600, '2026-08': 900 })).toEqual({
      spentLastMonth: 600,
      threeMonthAverage: 500,
    });
  });

  it('rounds last month half up to a whole unit: 640.50 gives 641', () => {
    expect(resolveSuggestedAmounts('2026-11', { '2026-10': 640.5 }).spentLastMonth).toBe(641);
  });

  it('rounds a mean of 539.50 half up: 810.63, 606.80 and 201.07 give 540', () => {
    expect(
      resolveSuggestedAmounts('2026-11', {
        '2026-10': 810.63,
        '2026-09': 606.8,
        '2026-08': 201.07,
      }).threeMonthAverage,
    ).toBe(540);
  });

  it('rounds a mean of 710.33 down: 2130.99 over three months gives 710', () => {
    expect(
      resolveSuggestedAmounts('2026-11', {
        '2026-10': 710.33,
        '2026-09': 710.33,
        '2026-08': 710.33,
      }).threeMonthAverage,
    ).toBe(710);
  });

  it.each([
    ['no months', {}],
    ['no category spend', undefined],
  ])('with %s reports both values as no suggestion', (_name, spend) => {
    expect(resolveSuggestedAmounts('2026-11', spend)).toEqual({
      spentLastMonth: undefined,
      threeMonthAverage: undefined,
    });
  });

  it('reports a last month that rounds to 0 as no suggestion: 0.40 gives undefined', () => {
    const result = resolveSuggestedAmounts('2026-11', { '2026-10': 0.4 });
    expect(result.spentLastMonth).toBeUndefined();
    expect(result.threeMonthAverage).toBeUndefined();
  });

  it('ignores the budget month itself and any month after it', () => {
    expect(resolveSuggestedAmounts('2026-11', { '2026-11': 999, '2026-12': 999 })).toEqual({
      spentLastMonth: undefined,
      threeMonthAverage: undefined,
    });
  });
});
