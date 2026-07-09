import { CategoryType } from '@/constants/enums';
import {
  buildSpendingPlanRows,
  computeAllocationHelper,
  computeSpendingPlansSummary,
  planIntersectsMonth,
  validatePlanDraft,
} from '@/modules/budget/screens/budget/spending_plans.helpers';
import type { Category } from '@/modules/categories/entities/category.entity';

const categories: Category[] = [
  {
    id: 'cat_food',
    name: 'Food',
    type: CategoryType.Expense,
    icon: 'food',
    color: '#f90',
    is_default: 0,
    sort_order: 0,
    budget_group: null,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'cat_income',
    name: 'Salary',
    type: CategoryType.Income,
    icon: 'cash',
    color: '#0f0',
    is_default: 0,
    sort_order: 1,
    budget_group: null,
    created_at: '',
    updated_at: '',
  },
];

const plan = {
  id: 'plan_trip',
  name: 'Alexandria weekend',
  start_date: '2026-07-30',
  end_date: '2026-08-02',
  total_amount: 8000,
  created_at: '',
  updated_at: '',
  categories: [{ plan_id: 'plan_trip', category_id: 'cat_food', allocated_amount: 3000 }],
};

describe('spending plan helpers', () => {
  it('detects month intersections for cross-month plans', () => {
    expect(planIntersectsMonth(plan, '2026-07')).toBe(true);
    expect(planIntersectsMonth(plan, '2026-08')).toBe(true);
    expect(planIntersectsMonth(plan, '2026-09')).toBe(false);
  });

  it('builds rows with totals and allocation rows', () => {
    const rows = buildSpendingPlanRows({
      plans: [plan],
      categories,
      spendByPlanId: { plan_trip: { cat_food: 1200 } },
      selectedMonth: '2026-07',
    });

    expect(rows).toEqual([
      expect.objectContaining({
        id: 'plan_trip',
        name: 'Alexandria weekend',
        totalAmount: 8000,
        spent: 1200,
        left: 6800,
        pct: 0.15,
        categoryCount: 1,
        allocationRows: [
          expect.objectContaining({
            categoryId: 'cat_food',
            categoryName: 'Food',
            allocatedAmount: 3000,
            spent: 1200,
            pct: 0.4,
          }),
        ],
      }),
    ]);
  });

  it('computes plans summary from visible rows', () => {
    const rows = buildSpendingPlanRows({
      plans: [plan],
      categories,
      spendByPlanId: { plan_trip: { cat_food: 1200 } },
      selectedMonth: '2026-07',
    });
    expect(computeSpendingPlansSummary(rows)).toEqual({
      planned: 8000,
      spent: 1200,
      left: 6800,
      pct: 0.15,
    });
  });

  it('allows allocations below the total and reports buffer', () => {
    expect(computeAllocationHelper(8000, { cat_food: 3000 })).toEqual({
      allocated: 3000,
      buffer: 5000,
      isOver: false,
    });
  });

  it('marks allocations above the total as invalid', () => {
    expect(computeAllocationHelper(5000, { cat_food: 3000, cat_travel: 3000 })).toEqual({
      allocated: 6000,
      buffer: -1000,
      isOver: true,
    });
  });

  it('validates draft fields before save', () => {
    expect(
      validatePlanDraft({
        name: '',
        startDate: '2026-07-20',
        endDate: '2026-07-19',
        totalAmount: 0,
        categoryIds: [],
        allocations: {},
      }),
    ).toEqual({
      name: 'Enter a plan name',
      dates: 'End date must be on or after start date',
      amount: 'Enter a plan amount',
      categories: 'Select at least one category',
    });
  });
});
