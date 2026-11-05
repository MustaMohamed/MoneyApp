import { Strings } from '@/constants/strings';

const mask = (s: string) => s.replace(/\d+/g, 'N');

describe('Branching strings: each branch fails a test when it is removed in either direction', () => {
  it.each([
    [
      'dashboardBreakdownAssetsHeader',
      (n: number) => Strings.dashboardBreakdownAssetsHeader('X', n),
    ],
    [
      'dashboardBreakdownLiabilitiesHeader',
      (n: number) => Strings.dashboardBreakdownLiabilitiesHeader('X', n),
    ],
    ['listHeroDaysLeft', (n: number) => Strings.listHeroDaysLeft(n)],
    ['dashMonthSpentTxs', (n: number) => Strings.dashMonthSpentTxs(n)],
    ['commitmentsDurationAfterCountOf', (n: number) => Strings.commitmentsDurationAfterCountOf(n)],
    [
      'emptyAccountsArchivedOnlyDescription',
      (n: number) => Strings.emptyAccountsArchivedOnlyDescription(n),
    ],
    ['fixFieldsMarkedAbove', (n: number) => Strings.fixFieldsMarkedAbove(n)],
    ['n4CaptionConverted', (n: number) => Strings.n4CaptionConverted(n, 'USD')],
    ['n4PillAccounts', (n: number) => Strings.n4PillAccounts(n)],
    ['n4PillNeedsRate', (n: number) => Strings.n4PillNeedsRate(n)],
  ] as const)('%s reads differently at a count of one than at two, past the count', (_name, f) => {
    expect(mask(f(1))).not.toEqual(mask(f(2)));
    expect(f(2)).toContain('2');
  });

  it.each([
    ['commitmentsEndsStepperUnit', (n: number) => Strings.commitmentsEndsStepperUnit(n)],
    ['n4CaptionCreditOnly', (n: number) => Strings.n4CaptionCreditOnly(n)],
    ['n4PillOpeningBal', (n: number) => Strings.n4PillOpeningBal(n)],
  ] as const)('%s reads differently at a count of one than at two', (_name, f) => {
    expect(f(1)).not.toEqual(f(2));
  });

  it('accountDetailMoveCommitmentCaption appends the next date only when one is given', () => {
    const nextDate = '12 Nov';
    const without = Strings.accountDetailMoveCommitmentCaption('X', 'Y');
    const withDate = Strings.accountDetailMoveCommitmentCaption('X', 'Y', nextDate);

    expect(withDate.startsWith(without)).toBe(true);
    expect(withDate.endsWith(nextDate)).toBe(true);
    expect(withDate).not.toEqual(without);
    expect(without).not.toContain('undefined');
  });
});
