import { Size } from '@/constants/theme';
import {
  BUDGET_CHART_LABEL_MAX_FONT_SCALE,
  resolveLedgerMonthColumnWidth,
  resolveRuleValueColumnWidth,
} from '@/modules/budget/screens/budget/budget_text.geometry';

describe('resolveRuleValueColumnWidth', () => {
  it('is the token width at a font scale of 1', () => {
    expect(resolveRuleValueColumnWidth(1)).toBe(Size.budgetRuleValueColumn);
  });

  it('is twice the token width at a font scale of 2', () => {
    expect(resolveRuleValueColumnWidth(2)).toBe(Size.budgetRuleValueColumn * 2);
  });
});

describe('resolveLedgerMonthColumnWidth', () => {
  it('MA-171: is the token width at a font scale of 1', () => {
    expect(resolveLedgerMonthColumnWidth(1)).toBe(Size.budgetLedgerMonthColumn);
  });

  it('MA-171: is twice the token width at a font scale of 2', () => {
    expect(resolveLedgerMonthColumnWidth(2)).toBe(Size.budgetLedgerMonthColumn * 2);
  });
});

describe('BUDGET_CHART_LABEL_MAX_FONT_SCALE', () => {
  it('MA-171: stops the chart month labels growing at 1.3', () => {
    expect(BUDGET_CHART_LABEL_MAX_FONT_SCALE).toBe(1.3);
  });
});
