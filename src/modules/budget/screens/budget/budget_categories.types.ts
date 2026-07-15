export type BudgetHealth = 'on-track' | 'watch' | 'over';

export interface NamedBudgetVM {
  id: string;
  name: string;
  planned: number;
  spent: number;
  left: number;
  usedPct: number | undefined;
  categorySharePct: number | undefined;
  usedLabel: string;
  shareLabel: string;
  spentPlannedLabel: string;
  balanceAmountLabel: string;
  balanceMetaLabel: string;
  ringColor: string;
  accessibilityLabel: string;
  menuAccessibilityLabel: string;
}

export interface CategoryBudgetRowVM {
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  planned: number;
  spent: number;
  left: number;
  usedPct: number;
  status: BudgetHealth;
  statusLabel: string;
  statusChipColor: 'default' | 'danger';
  spentPlannedUsedLabel: string;
  balanceAmountLabel: string;
  balanceMetaLabel: string;
  ringColor: string;
  unassignedSpend: number;
  unassignedSpendLabel: string;
  budgets: NamedBudgetVM[];
  accessibilityLabel: string;
}

export interface BudgetCategoriesSummaryVM {
  hasPlan: boolean;
  emptyLabel: string | undefined;
  planned: number;
  spent: number;
  left: number;
  usedPct: number | undefined;
  unassignedIncome: number | undefined;
  unbudgetedSpend: number;
  eyebrowLabel: string;
  categoryCountLabel: string;
  balanceAmountLabel: string;
  balanceMetaLabel: string;
  balanceColor: string;
  barColor: string;
  spentPlannedLabel: string;
  usedLabel: string | undefined;
  plannedLabel: string;
  unassignedIncomeLabel: string;
  unbudgetedSpendLabel: string;
  lifecycleLabel: string;
  onTrackCount: number;
  watchCount: number;
  overCount: number;
  statusItems: Array<{
    key: BudgetHealth;
    label: string;
    icon: 'check-circle-outline' | 'alert-circle-outline' | 'alert-octagon-outline';
    color: string;
  }>;
}
