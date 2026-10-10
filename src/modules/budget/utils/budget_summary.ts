import { Colors } from '@/constants/theme';
import { compareToPercent, exceedsToCent } from '@/utils/money';

/** One threshold for the warning word and the watch colour step, so a figure never shows one without the other. */
export const BUDGET_WARNING_PERCENT = 80;

interface OverallVM {
  budgeted: number;
  spent: number;
  left: number;
}

export interface BudgetDashboardSummaryVM extends OverallVM {
  categoryCount: number;
}

/** Steps compare in integer cents: 50, 80 and 90% open their step, exactly 100% is `budgetNear`, over to the cent is `budgetOver`. */
export function budgetBandColor(spent: number, limit: number): string {
  if (limit <= 0) return Colors.dark.budgetUnder;
  if (exceedsToCent(spent, limit)) return Colors.dark.budgetOver;
  if (compareToPercent(spent, limit, 90) >= 0) return Colors.dark.budgetNear;
  if (compareToPercent(spent, limit, BUDGET_WARNING_PERCENT) >= 0) return Colors.dark.budgetWatch;
  if (compareToPercent(spent, limit, 50) >= 0) return Colors.dark.budgetSteady;
  return Colors.dark.budgetUnder;
}
