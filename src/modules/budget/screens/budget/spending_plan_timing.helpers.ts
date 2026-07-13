import type {
  SpendingPlanLifecycle,
  SpendingPlanStatus,
  SpendingPlanTimingVM,
} from '@/modules/budget/screens/budget/spending_plans.types';

const DAY_MS = 86_400_000;
const PACE_WARNING_THRESHOLD = 0.1;

function isoDayNumber(value: string): number {
  const [year, month, day] = value.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
}

export function computePlanTiming(
  startDate: string,
  endDate: string,
  today: string,
): SpendingPlanTimingVM {
  const start = isoDayNumber(startDate);
  const end = isoDayNumber(endDate);
  const current = isoDayNumber(today);
  const totalDays = end - start + 1;
  if (current < start) {
    return {
      lifecycle: 'upcoming',
      totalDays,
      elapsedDays: 0,
      elapsedPct: 0,
      daysValue: start - current,
    };
  }
  const elapsedDays = Math.min(totalDays, current - start + 1);
  return {
    lifecycle: current > end ? 'completed' : 'active',
    totalDays,
    elapsedDays,
    elapsedPct: elapsedDays / totalDays,
    daysValue: current > end ? current - end : end - current,
  };
}

export function derivePlanStatus(input: {
  lifecycle: SpendingPlanLifecycle;
  isOver: boolean;
  paceDelta: number;
  hasCategoryPressure: boolean;
}): SpendingPlanStatus {
  if (input.lifecycle === 'upcoming') return 'upcoming';
  if (input.isOver) return 'over';
  if (
    input.lifecycle === 'active' &&
    (input.paceDelta + Number.EPSILON >= PACE_WARNING_THRESHOLD || input.hasCategoryPressure)
  ) {
    return 'watch';
  }
  return 'onTrack';
}
