import { Colors } from '@/constants/theme';

export interface OverallVM {
  budgeted: number;
  spent: number;
  left: number;
  pct: number;
}

export interface BudgetDashboardSummaryVM extends OverallVM {
  categoryCount: number;
}

/** Boundary: exactly 100% is `budgetNear`; only strictly above 1 is `budgetOver`. */
export function budgetBandColor(pct: number): string {
  if (pct > 1) return Colors.dark.budgetOver;
  if (pct >= 0.9) return Colors.dark.budgetNear;
  if (pct >= 0.8) return Colors.dark.budgetWatch;
  if (pct >= 0.5) return Colors.dark.budgetSteady;
  return Colors.dark.budgetUnder;
}
