import { expenseSharePercent } from '@/modules/transactions/domain/expense_share';

describe('expenseSharePercent', () => {
  it.each([
    ['no income', 500, 0, null],
    ['income under half a cent', 500, 0.004, null],
    ['negative income', 50, -100, null],
    ['expense of 0', 0, 1000, 0],
    ['net credit, share below 0', -50, 100, -50],
    ['share on a half rounds up', 1005, 1000, 101],
    ['share over 100', 350, 100, 350],
  ] as const)('%s: (%s, %s) is %s', (_label, expenseEgp, incomeEgp, expected) => {
    expect(expenseSharePercent(expenseEgp, incomeEgp)).toBe(expected);
  });
});
