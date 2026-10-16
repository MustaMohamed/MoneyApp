import { Strings } from '@/constants/strings';

describe('MA-173: the words a component held as literals read the strings file unchanged', () => {
  it.each([
    ['fabAddAccessibility', 'Add'],
    ['fabMenuAddTransaction', 'Add Transaction'],
    ['fabMenuAddAccount', 'Add Account'],
    ['fabMenuAddCommitment', 'Add Commitment'],
    ['categoriesEditAccessibility', 'Edit category'],
    ['categoriesDeleteAccessibility', 'Delete category'],
    ['categoriesTypeAccessibility', 'Category type'],
    ['commitmentStatusFilterAccessibility', 'Commitment status filter'],
    ['dashboardSettingsAccessibility', 'Settings'],
    ['appName', 'MoneyApp'],
  ] as const)('%s reads %j', (key, words) => {
    expect(Strings[key]).toBe(words);
  });

  it('budgetDetailSoFarSuffix reads the ledger suffix with its leading space', () => {
    expect(Strings.budgetDetailSoFarSuffix).toBe(' · so far');
  });
});

describe('MA-173: a count of one reads in the singular, every other count as today', () => {
  it('dashMonthSpentTxs reads 0 txs, 1 tx and 2 txs', () => {
    expect(Strings.dashMonthSpentTxs(0)).toBe('0 txs');
    expect(Strings.dashMonthSpentTxs(1)).toBe('1 tx');
    expect(Strings.dashMonthSpentTxs(2)).toBe('2 txs');
  });

  it('commitmentsDurationAfterCountOf reads After 1 payment and After 2 payments', () => {
    expect(Strings.commitmentsDurationAfterCountOf(1)).toBe('After 1 payment');
    expect(Strings.commitmentsDurationAfterCountOf(2)).toBe('After 2 payments');
  });
});

describe('MA-173: the on-screen connectors compose their arguments as the screens print them today', () => {
  it('dashboardBreakdownDueOn puts due before the date', () => {
    expect(Strings.dashboardBreakdownDueOn('Oct 5')).toBe('due Oct 5');
  });

  it('budgetDetailPartOf joins the part and the whole with of', () => {
    expect(Strings.budgetDetailPartOf('120', '500')).toBe('120 of 500');
    expect(Strings.budgetDetailPartOf(3, 6)).toBe('3 of 6');
  });

  it('budgetDetailMonthsShort puts mo after the count', () => {
    expect(Strings.budgetDetailMonthsShort(6)).toBe('6 mo');
  });
});
