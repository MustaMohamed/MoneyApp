import { CategoryType } from '@/constants/enums';
import type { SpendingPlanWithCategories } from '@/modules/budget/database/spending_plans';
import type { Category } from '@/modules/categories/entities/category.entity';

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
  categoryChips: Array<{ id: string; name: string; icon: string; color: string }>;
  allocationRows: SpendingPlanAllocationRowVM[];
  allocatedTotal: number;
  buffer: number;
}

export interface SpendingPlansSummaryVM {
  planned: number;
  spent: number;
  left: number;
  pct: number;
}

export interface AllocationHelperVM {
  allocated: number;
  buffer: number;
  isOver: boolean;
}

export interface PlanDraftValidationErrors {
  name?: string;
  dates?: string;
  amount?: string;
  categories?: string;
  allocations?: string;
}

function monthRange(yearMonth: string): { start: string; endExclusive: string } {
  const [year, month] = yearMonth.split('-').map(Number);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return {
    start: `${yearMonth}-01`,
    endExclusive: `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`,
  };
}

export function planIntersectsMonth(
  plan: Pick<SpendingPlanWithCategories, 'start_date' | 'end_date'>,
  yearMonth: string,
): boolean {
  const range = monthRange(yearMonth);
  return plan.start_date < range.endExclusive && plan.end_date >= range.start;
}

export function computeAllocationHelper(
  totalAmount: number,
  allocations: Record<string, number | undefined>,
): AllocationHelperVM {
  let allocated = 0;
  for (const amount of Object.values(allocations)) allocated += amount ?? 0;
  return { allocated, buffer: totalAmount - allocated, isOver: allocated > totalAmount };
}

export function buildSpendingPlanRows({
  plans,
  categories,
  spendByPlanId,
  selectedMonth,
}: {
  plans: SpendingPlanWithCategories[];
  categories: Category[];
  spendByPlanId: Record<string, Record<string, number>>;
  selectedMonth: string;
}): SpendingPlanRowVM[] {
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  return plans
    .filter((plan) => planIntersectsMonth(plan, selectedMonth))
    .map((plan) => {
      const spend = spendByPlanId[plan.id] ?? {};
      const categoryChips = plan.categories
        .map((row) => categoryById.get(row.category_id))
        .filter(
          (category): category is Category =>
            category !== undefined && category.type === CategoryType.Expense,
        )
        .map((category) => ({
          id: category.id,
          name: category.name,
          icon: category.icon,
          color: category.color,
        }));
      const spent = plan.categories.reduce(
        (total, row) => total + (spend[row.category_id] ?? 0),
        0,
      );
      const allocationRows = plan.categories
        .filter((row) => row.allocated_amount !== null)
        .map((row) => {
          const category = categoryById.get(row.category_id);
          const allocatedAmount = row.allocated_amount ?? 0;
          const categorySpent = spend[row.category_id] ?? 0;
          return {
            categoryId: row.category_id,
            categoryName: category?.name ?? row.category_id,
            icon: category?.icon ?? 'tag',
            color: category?.color ?? '#ffffff',
            allocatedAmount,
            spent: categorySpent,
            left: allocatedAmount - categorySpent,
            pct: allocatedAmount > 0 ? categorySpent / allocatedAmount : 0,
            isOver: categorySpent > allocatedAmount,
          };
        });
      const allocatedTotal = plan.categories.reduce(
        (total, row) => total + (row.allocated_amount ?? 0),
        0,
      );
      return {
        id: plan.id,
        name: plan.name,
        startDate: plan.start_date,
        endDate: plan.end_date,
        totalAmount: plan.total_amount,
        spent,
        left: plan.total_amount - spent,
        pct: plan.total_amount > 0 ? spent / plan.total_amount : 0,
        isOver: spent > plan.total_amount,
        categoryCount: plan.categories.length,
        categoryChips,
        allocationRows,
        allocatedTotal,
        buffer: plan.total_amount - allocatedTotal,
      };
    });
}

export function computeSpendingPlansSummary(rows: SpendingPlanRowVM[]): SpendingPlansSummaryVM {
  const planned = rows.reduce((total, row) => total + row.totalAmount, 0);
  const spent = rows.reduce((total, row) => total + row.spent, 0);
  return { planned, spent, left: planned - spent, pct: planned > 0 ? spent / planned : 0 };
}

export function validatePlanDraft({
  name,
  startDate,
  endDate,
  totalAmount,
  categoryIds,
  allocations,
}: {
  name: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  categoryIds: string[];
  allocations: Record<string, number | undefined>;
}): PlanDraftValidationErrors {
  const errors: PlanDraftValidationErrors = {};
  if (name.trim().length === 0) errors.name = 'Enter a plan name';
  if (endDate < startDate) errors.dates = 'End date must be on or after start date';
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) errors.amount = 'Enter a plan amount';
  if (categoryIds.length === 0) errors.categories = 'Select at least one category';
  if (computeAllocationHelper(totalAmount, allocations).isOver) {
    errors.allocations = 'Allocations exceed the plan total';
  }
  return errors;
}
