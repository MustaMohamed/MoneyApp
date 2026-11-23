import { BudgetGroup } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import {
  BUDGET_GROUP_OPTIONS,
  countSetBudgetFaults,
  resolveBudgetGroupRowValue,
  resolveSetBudgetFooterMessage,
  type SetBudgetFaults,
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
