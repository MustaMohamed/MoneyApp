import { BudgetGroup } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import {
  BUDGET_GROUP_OPTIONS,
  countSetBudgetFaults,
  resolveBudgetGroupRowValue,
  resolveSetBudgetFooterMessage,
  resolveSetBudgetStatusLine,
  resolveSetBudgetSuggestions,
  type SetBudgetFaults,
  type SetBudgetStatusSubject,
} from '@/modules/budget/screens/budget/components/set_budget_sheet.helpers';

const NO_FAULTS: SetBudgetFaults = { category: undefined, name: undefined, limit: undefined };

describe('resolveSetBudgetFooterMessage (MA-295)', () => {
  it('with no faults passes the save error through', () => {
    expect(resolveSetBudgetFooterMessage(NO_FAULTS, 'write failed')).toBe('write failed');
  });

  it('with no faults and no save error reads nothing', () => {
    expect(resolveSetBudgetFooterMessage(NO_FAULTS, undefined)).toBeUndefined();
  });

  it('with the category and the limit marked counts two fields', () => {
    const faults: SetBudgetFaults = { ...NO_FAULTS, category: 'pick', limit: 'limit' };

    expect(countSetBudgetFaults(faults)).toBe(2);
    expect(resolveSetBudgetFooterMessage(faults, undefined)).toBe(Strings.fixFieldsMarkedAbove(2));
  });

  it('a marked field wins over a save error, counting one', () => {
    const faults: SetBudgetFaults = { ...NO_FAULTS, name: 'blank' };

    expect(countSetBudgetFaults(faults)).toBe(1);
    expect(resolveSetBudgetFooterMessage(faults, 'write failed')).toBe(
      Strings.fixFieldsMarkedAbove(1),
    );
  });

  it('counts all three fields when every one is marked', () => {
    expect(countSetBudgetFaults({ category: 'pick', name: 'blank', limit: 'limit' })).toBe(3);
  });
});

describe('the Group row value and the picker options (MA-296)', () => {
  it('a month with no group reads not grouped', () => {
    expect(resolveBudgetGroupRowValue(null)).toBe(Strings.budget5030NotGroupedMetric);
  });

  it("a set group reads that group's name", () => {
    expect(resolveBudgetGroupRowValue(BudgetGroup.Want)).toBe(Strings.budget5030GroupWant);
  });

  it('the options are exactly the stored groups, Need, Want, Savings in order', () => {
    expect(BUDGET_GROUP_OPTIONS.map((option) => option.value)).toEqual([
      BudgetGroup.Need,
      BudgetGroup.Want,
      BudgetGroup.Savings,
    ]);
    expect(BUDGET_GROUP_OPTIONS.map((option) => option.value)).toEqual(Object.values(BudgetGroup));
  });
});

describe('the footer status line (MA-319)', () => {
  const editSubject: SetBudgetStatusSubject = { kind: 'edit', spent: 900, limit: 2000 };

  it('no subject reads no status line', () => {
    expect(resolveSetBudgetStatusLine(undefined, '2026-11', '2026-11-30')).toBeUndefined();
  });

  it('adding to a category with no budget in the month reads the no-budget line', () => {
    expect(
      resolveSetBudgetStatusLine(
        { kind: 'add', categoryName: 'Health', budgetCount: 0 },
        '2026-11',
        '2026-11-30',
      ),
    ).toBe(Strings.budgetStatusNoBudget('Health', 'November'));
  });

  it('adding to a category with budgets reads the count line, one apart from two', () => {
    const line = (budgetCount: number) =>
      resolveSetBudgetStatusLine(
        { kind: 'add', categoryName: 'Shopping', budgetCount },
        '2026-11',
        '2026-11-30',
      );

    expect(line(1)).toBe(Strings.budgetStatusBudgetCount('Shopping', 1, 'November'));
    expect(line(2)).toBe(Strings.budgetStatusBudgetCount('Shopping', 2, 'November'));
    expect(line(1)).not.toBe(line(2));
  });

  it('editing on the last day of a 30-day budget month reads spent so far, with the grouped limit', () => {
    const line = resolveSetBudgetStatusLine(editSubject, '2026-11', '2026-11-30');

    expect(line).toBe(Strings.budgetStatusSpentSoFar('900', '2,000', 'November'));
    expect(line).toContain('2,000');
  });

  it('editing the day after the budget month reads the past form', () => {
    expect(resolveSetBudgetStatusLine(editSubject, '2026-11', '2026-12-01')).toBe(
      Strings.budgetStatusSpent('900', '2,000', 'November'),
    );
  });

  it('editing a later budget month reads the past form, never so far', () => {
    const line = resolveSetBudgetStatusLine(editSubject, '2026-12', '2026-11-30');

    expect(line).toBe(Strings.budgetStatusSpent('900', '2,000', 'December'));
    expect(line).not.toBe(Strings.budgetStatusSpentSoFar('900', '2,000', 'December'));
  });

  it('a leap February reads so far on the 29th and the past form on 1 March', () => {
    expect(resolveSetBudgetStatusLine(editSubject, '2028-02', '2028-02-29')).toBe(
      Strings.budgetStatusSpentSoFar('900', '2,000', 'February'),
    );
    expect(resolveSetBudgetStatusLine(editSubject, '2028-02', '2028-03-01')).toBe(
      Strings.budgetStatusSpent('900', '2,000', 'February'),
    );
  });
});

describe('the sheet suggestions (MA-319)', () => {
  it('reads spent last month and the 3-month average from the three months before', () => {
    expect(
      resolveSetBudgetSuggestions('2026-11', {
        '2026-11': 5000,
        '2026-10': 640,
        '2026-09': 900,
        '2026-08': 590,
        '2026-07': 7000,
      }),
    ).toEqual([
      { kind: 'spentLastMonth', amount: 640 },
      { kind: 'threeMonthAverage', amount: 710 },
    ]);
  });

  it('an empty map gives two suggestions with no amount', () => {
    expect(resolveSetBudgetSuggestions('2026-11', {})).toEqual([
      { kind: 'spentLastMonth', amount: undefined },
      { kind: 'threeMonthAverage', amount: undefined },
    ]);
  });

  it('a category with no spending entry gives two suggestions with no amount', () => {
    expect(resolveSetBudgetSuggestions('2026-11', undefined)).toEqual([
      { kind: 'spentLastMonth', amount: undefined },
      { kind: 'threeMonthAverage', amount: undefined },
    ]);
  });

  it('January reaches back across the year to December, November and October', () => {
    expect(
      resolveSetBudgetSuggestions('2026-01', {
        '2026-01': 5000,
        '2025-12': 300,
        '2025-11': 600,
        '2025-10': 900,
        '2025-09': 9000,
      }),
    ).toEqual([
      { kind: 'spentLastMonth', amount: 300 },
      { kind: 'threeMonthAverage', amount: 600 },
    ]);
  });
});
