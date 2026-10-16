import { Strings } from '@/constants/strings';

describe('App name: the dashboard header, About and the onboarding brand header', () => {
  it('appName reads MoneyApp', () => {
    expect(Strings.appName).toBe('MoneyApp');
  });
});

describe('Net worth sheet: the due caption', () => {
  it('dashboardBreakdownDueOn puts due before the date', () => {
    expect(Strings.dashboardBreakdownDueOn('Oct 5')).toBe('due Oct 5');
  });
});

describe('Budget category detail: the connectors', () => {
  it('budgetDetailPartOf joins the part and the whole with of', () => {
    expect(Strings.budgetDetailPartOf('120', '500')).toBe('120 of 500');
    expect(Strings.budgetDetailPartOf(3, 6)).toBe('3 of 6');
  });

  it('budgetDetailMonthsShort puts mo after the count', () => {
    expect(Strings.budgetDetailMonthsShort(6)).toBe('6 mo');
  });

  it('budgetDetailSoFarSuffix reads the ledger suffix with its leading space', () => {
    expect(Strings.budgetDetailSoFarSuffix).toBe(' · so far');
  });
});
