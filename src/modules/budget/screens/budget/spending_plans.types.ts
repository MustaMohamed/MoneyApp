import type { BudgetStatus } from '@/modules/budget/screens/budget/budget.helpers';

export type SpendingPlanLifecycle = 'upcoming' | 'active' | 'completed';
export type SpendingPlanStatus = 'upcoming' | 'onTrack' | 'watch' | 'over';
export type SpendingPlanStatusTone = 'accent' | 'success' | 'warning' | 'danger';

export interface SpendingPlansSummaryStatusItemVM {
  key: 'onTrack' | 'watch' | 'over' | 'upcoming';
  icon: 'check-circle-outline' | 'alert-circle-outline' | 'alert-octagon-outline' | 'clock-outline';
  color: string;
  label: string;
}

export interface SpendingPlanTimingVM {
  lifecycle: SpendingPlanLifecycle;
  totalDays: number;
  elapsedDays: number;
  elapsedPct: number;
  daysValue: number;
}

export interface SpendingPlanDetailCategoryVM {
  categoryId: string;
  categoryName: string;
  icon: string;
  color: string;
  spent: number;
  allocatedAmount?: number;
  left?: number;
  pct?: number;
  isOver: boolean;
  isWarning: boolean;
}

export interface SpendingPlanAllocationRowVM {
  categoryId: string;
  categoryName: string;
  icon: string;
  color: string;
  allocatedAmount: number;
  spent: number;
  left: number;
  pct: number;
  isOver: boolean;
}

export interface SpendingPlanCategoryChipVM {
  id: string;
  name: string;
  icon: string;
  color: string;
  spent: number;
}

export type SpendingPlanCardChipVM =
  | { type: 'allocation'; id: string; allocation: SpendingPlanAllocationRowVM }
  | { type: 'category'; id: string; category: SpendingPlanCategoryChipVM }
  | { type: 'more'; id: 'more'; count: number };

export interface SpendingPlanCardAllocationChipVM extends SpendingPlanAllocationRowVM {
  amountLabel: string;
  percentageLabel: string;
  bandColor: string;
  accessibilityLabel: string;
}

export interface SpendingPlanCardCategoryChipVM extends SpendingPlanCategoryChipVM {
  accessibilityLabel: string;
}

export type SpendingPlanCardDisplayChipVM =
  | { type: 'allocation'; id: string; allocation: SpendingPlanCardAllocationChipVM }
  | { type: 'category'; id: string; category: SpendingPlanCardCategoryChipVM }
  | { type: 'more'; id: 'more'; count: number; label: string; accessibilityLabel: string };

export interface SpendingPlanCardVM {
  openDetailsAccessibilityLabel: string;
  statusLabel: string;
  statusTone: SpendingPlanStatusTone;
  dateLabel: string;
  balanceAmountLabel: string;
  balanceMetaLabel: string;
  balanceAccessibilityLabel: string;
  balanceColor: string;
  spentLabel: string;
  percentageLabel: string;
  progressColor: string;
  progressStatus: BudgetStatus;
  elapsedMarkerPercentage?: number;
  elapsedMarkerColor?: string;
  paceLabel?: string;
  allocationFooterLabel: string;
  allocationChips: SpendingPlanCardAllocationChipVM[];
  chips: SpendingPlanCardDisplayChipVM[];
}

export interface SpendingPlanDetailMetricVM {
  label: string;
  value: string;
}

export interface SpendingPlanDetailInsightVM {
  key: 'pace' | 'final' | 'category';
  icon: 'speedometer' | 'flag-checkered' | 'alert-circle-outline' | 'alert-octagon-outline';
  color: string;
  label: string;
}

export type SpendingPlanDetailCategoryRowVM =
  | {
      kind: 'allocated';
      categoryId: string;
      categoryName: string;
      icon: string;
      color: string;
      pct: number;
      amountLabel: string;
      percentageLabel: string;
      supportingLabel: string;
      balanceLabel: string;
      balanceColor: string;
      statusLabel: string;
      statusTone: SpendingPlanStatusTone;
      progressColor: string;
      accessibilityLabel: string;
    }
  | {
      kind: 'unallocated';
      categoryId: string;
      categoryName: string;
      icon: string;
      color: string;
      amountLabel: string;
      supportingLabel: string;
      accessibilityLabel: string;
    };

export interface SpendingPlanDetailVM {
  pct: number;
  progressPercentage: number;
  dateLabel: string;
  balanceAmountLabel: string;
  balanceMetaLabel: string;
  balanceAccessibilityLabel: string;
  balanceColor: string;
  statusLabel: string;
  statusTone: SpendingPlanStatusTone;
  spentLabel: string;
  percentageLabel: string;
  totalSpentLabel: string;
  progressColor: string;
  progressStatus: BudgetStatus;
  elapsedMarkerPercentage?: number;
  elapsedMarkerColor?: string;
  metrics: SpendingPlanDetailMetricVM[];
  insights: SpendingPlanDetailInsightVM[];
  categoryRows: SpendingPlanDetailCategoryRowVM[];
  flexibleRow?: { label: string; amountLabel: string; supportingLabel: string };
}

export interface SpendingPlanRowVM {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  spent: number;
  left: number;
  pct: number;
  isOver: boolean;
  categoryCount: number;
  categoryChips: SpendingPlanCategoryChipVM[];
  allocationRows: SpendingPlanAllocationRowVM[];
  cardChips: SpendingPlanCardChipVM[];
  allocatedTotal: number;
  buffer: number;
  timing: SpendingPlanTimingVM;
  status: SpendingPlanStatus;
  paceDelta: number;
  detailCategoryRows: SpendingPlanDetailCategoryVM[];
  highestPressureCategory?: SpendingPlanDetailCategoryVM;
  card: SpendingPlanCardVM;
  detail: SpendingPlanDetailVM;
}

export interface SpendingPlansSummaryVM {
  planned: number;
  spent: number;
  left: number;
  pct: number;
  planCount: number;
  monthLabel: string;
  eyebrowLabel: string;
  usedPercentage: number;
  progressPercentage: number;
  itemizedAmount: number;
  itemizedPct: number;
  itemizedPercentage: number;
  balanceAmount: number;
  balanceStatus: 'left' | 'over';
  balanceColor: string;
  barColor: string;
  barStatus: BudgetStatus;
  activeCount: number;
  upcomingCount: number;
  onTrackCount: number;
  watchCount: number;
  overCount: number;
  needsAttentionCount: number;
  statusItems: SpendingPlansSummaryStatusItemVM[];
}

export interface AllocationHelperVM {
  allocated: number;
  /** `undefined` while no plan total has been entered. */
  buffer: number | undefined;
  isOver: boolean;
}
