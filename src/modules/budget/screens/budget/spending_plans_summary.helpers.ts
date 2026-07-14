import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import type {
  SpendingPlanRowVM,
  SpendingPlansSummaryVM,
} from '@/modules/budget/screens/budget/spending_plans.types';
import { formatMonthYear } from '@/utils/format_date';

import { remainingLabel } from './budget.helpers';

export function computeSpendingPlansSummary(
  rows: SpendingPlanRowVM[],
  selectedMonth: string,
): SpendingPlansSummaryVM {
  const planned = rows.reduce((total, row) => total + row.totalAmount, 0);
  const spent = rows.reduce((total, row) => total + row.spent, 0);
  const left = planned - spent;
  const pct = planned > 0 ? spent / planned : 0;
  const itemizedAmount = rows.reduce((total, row) => total + row.allocatedTotal, 0);
  const itemizedPct = planned > 0 ? itemizedAmount / planned : 0;
  const usedPercentage = Math.round(pct * 100);
  const balance = remainingLabel(left);
  const isOver = balance.label === 'over';
  const activeCount = rows.filter((row) => row.timing.lifecycle === 'active').length;
  const upcomingCount = rows.filter((row) => row.timing.lifecycle === 'upcoming').length;
  const onTrackCount = rows.filter((row) => row.status === 'onTrack').length;
  const watchCount = rows.filter((row) => row.status === 'watch').length;
  const overCount = rows.filter((row) => row.status === 'over').length;
  const planCount = rows.length;
  const monthLabel = formatMonthYear(selectedMonth);

  return {
    planned,
    spent,
    left,
    pct,
    planCount,
    monthLabel,
    eyebrowLabel: Strings.budgetPlansSummaryEyebrow(planCount, monthLabel),
    usedPercentage,
    progressPercentage: Math.min(Math.max(usedPercentage, 0), 100),
    itemizedAmount,
    itemizedPct,
    itemizedPercentage: Math.round(itemizedPct * 100),
    balanceAmount: balance.magnitude,
    balanceStatus: balance.label,
    balanceColor: isOver ? Colors.dark.negative : Colors.dark.positive,
    barColor: isOver ? Colors.dark.negative : Colors.dark.gold,
    barStatus: isOver ? 'over' : 'under',
    activeCount,
    upcomingCount,
    onTrackCount,
    watchCount,
    overCount,
    needsAttentionCount: watchCount + overCount,
    statusItems: [
      {
        key: 'onTrack',
        icon: 'check-circle-outline',
        color: Colors.dark.positive,
        label: Strings.budgetPlansSummaryOnTrackCount(onTrackCount),
      },
      {
        key: 'watch',
        icon: 'alert-circle-outline',
        color: Colors.dark.warning,
        label: Strings.budgetPlansSummaryWatchCount(watchCount),
      },
      {
        key: 'over',
        icon: 'alert-octagon-outline',
        color: Colors.dark.negative,
        label: Strings.budgetPlansSummaryOverCount(overCount),
      },
      {
        key: 'upcoming',
        icon: 'clock-outline',
        color: Colors.shared.transferBlue,
        label: Strings.budgetPlansSummaryUpcomingCount(upcomingCount),
      },
    ],
  };
}
