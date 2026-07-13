import { CategoryType } from '@/constants/enums';
import type { SpendingPlanWithCategories } from '@/modules/budget/database/spending_plans';
import {
  buildSpendingPlanCardChips,
  buildSpendingPlanRows,
  computeAllocationHelper,
  computePlanTiming,
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
    id: 'cat_travel',
    name: 'Travel',
    type: CategoryType.Expense,
    icon: 'bag',
    color: '#09f',
    is_default: 0,
    sort_order: 1,
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
    sort_order: 2,
    budget_group: null,
    created_at: '',
    updated_at: '',
  },
];

const plan: SpendingPlanWithCategories = {
  id: 'plan_trip',
  name: 'Alexandria weekend',
  start_date: '2026-07-30',
  end_date: '2026-08-02',
  total_amount: 8000,
  created_at: '',
  updated_at: '',
  categories: [{ plan_id: 'plan_trip', category_id: 'cat_food', allocated_amount: 3000 }],
};

function planFixture({
  id = 'plan_trip',
  startDate = '2026-07-08',
  endDate = '2026-07-18',
  totalAmount = 8000,
  categoryRows = [{ plan_id: id, category_id: 'cat_food', allocated_amount: 3000 }],
}: {
  id?: string;
  startDate?: string;
  endDate?: string;
  totalAmount?: number;
  categoryRows?: SpendingPlanWithCategories['categories'];
} = {}): SpendingPlanWithCategories {
  return {
    id,
    name: `Plan ${id}`,
    start_date: startDate,
    end_date: endDate,
    total_amount: totalAmount,
    created_at: '',
    updated_at: '',
    categories: categoryRows,
  };
}

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
      today: '2026-07-13',
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
      today: '2026-07-13',
    });
    expect(computeSpendingPlansSummary(rows)).toEqual({
      planned: 8000,
      spent: 1200,
      left: 6800,
      pct: 0.15,
      itemizedAmount: 3000,
      itemizedPct: 0.375,
      activeCount: 0,
      upcomingCount: 1,
      onTrackCount: 0,
      watchCount: 0,
      overCount: 0,
      needsAttentionCount: 0,
    });
  });

  it('uses inclusive UTC date-only timing for active plans', () => {
    expect(computePlanTiming('2026-07-08', '2026-07-18', '2026-07-13')).toEqual({
      lifecycle: 'active',
      totalDays: 11,
      elapsedDays: 6,
      elapsedPct: 6 / 11,
      daysValue: 5,
    });
  });

  it.each([
    ['2026-07-26', '2026-07-28', 'upcoming', 13],
    ['2026-07-01', '2026-07-12', 'completed', 1],
  ] as const)(
    'derives %s to %s as %s with the expected day distance',
    (startDate, endDate, lifecycle, daysValue) => {
      expect(computePlanTiming(startDate, endDate, '2026-07-13')).toEqual(
        expect.objectContaining({ lifecycle, daysValue }),
      );
    },
  );

  it.each([
    {
      name: 'upcoming before pace is considered',
      plan: planFixture({ startDate: '2026-07-26', endDate: '2026-07-28', totalAmount: 2500 }),
      spent: 0,
      status: 'upcoming',
    },
    {
      name: 'on track while spend trails elapsed time',
      plan: planFixture({
        totalAmount: 8000,
        categoryRows: [{ plan_id: 'plan_trip', category_id: 'cat_food', allocated_amount: null }],
      }),
      spent: 3000,
      status: 'onTrack',
    },
    {
      name: 'watch while spend is at least ten points ahead of pace',
      plan: planFixture({
        totalAmount: 8000,
        categoryRows: [{ plan_id: 'plan_trip', category_id: 'cat_food', allocated_amount: null }],
      }),
      spent: 6020,
      status: 'watch',
    },
    {
      name: 'over before an active pace or category warning is considered',
      plan: planFixture({ totalAmount: 2500 }),
      spent: 2870,
      status: 'over',
    },
  ])('derives $name', ({ plan: fixture, spent, status }) => {
    const row = buildSpendingPlanRows({
      plans: [fixture],
      categories,
      spendByPlanId: { plan_trip: { cat_food: spent } },
      selectedMonth: '2026-07',
      today: '2026-07-13',
    })[0];

    expect(row.status).toBe(status);
  });

  it('marks an active plan watch when an allocated category is exactly 80% used', () => {
    const row = buildSpendingPlanRows({
      plans: [
        planFixture({
          startDate: '2026-07-01',
          endDate: '2026-07-20',
          totalAmount: 2000,
          categoryRows: [{ plan_id: 'plan_trip', category_id: 'cat_food', allocated_amount: 1000 }],
        }),
      ],
      categories,
      spendByPlanId: { plan_trip: { cat_food: 800 } },
      selectedMonth: '2026-07',
      today: '2026-07-13',
    })[0];

    expect(row.paceDelta).toBeLessThan(0.1);
    expect(row.detailCategoryRows[0]).toEqual(
      expect.objectContaining({ pct: 0.8, isWarning: true, isOver: false }),
    );
    expect(row.status).toBe('watch');
  });

  it('keeps a completed plan within budget on track', () => {
    const row = buildSpendingPlanRows({
      plans: [
        planFixture({
          startDate: '2026-07-01',
          endDate: '2026-07-12',
          totalAmount: 1000,
          categoryRows: [{ plan_id: 'plan_trip', category_id: 'cat_food', allocated_amount: 1000 }],
        }),
      ],
      categories,
      spendByPlanId: { plan_trip: { cat_food: 800 } },
      selectedMonth: '2026-07',
      today: '2026-07-13',
    })[0];

    expect(row.timing.lifecycle).toBe('completed');
    expect(row.status).toBe('onTrack');
  });

  it('builds allocated and unallocated detail rows without fabricated values', () => {
    const row = buildSpendingPlanRows({
      plans: [
        planFixture({
          totalAmount: 5000,
          categoryRows: [
            { plan_id: 'plan_trip', category_id: 'cat_food', allocated_amount: 1000 },
            { plan_id: 'plan_trip', category_id: 'cat_travel', allocated_amount: null },
          ],
        }),
      ],
      categories,
      spendByPlanId: { plan_trip: { cat_food: 800, cat_travel: 125 } },
      selectedMonth: '2026-07',
      today: '2026-07-13',
    })[0];

    expect(row.detailCategoryRows).toEqual([
      expect.objectContaining({
        categoryId: 'cat_food',
        spent: 800,
        allocatedAmount: 1000,
        left: 200,
        pct: 0.8,
      }),
      {
        categoryId: 'cat_travel',
        categoryName: 'Travel',
        icon: 'bag',
        color: '#09f',
        spent: 125,
        isOver: false,
        isWarning: false,
      },
    ]);
    expect(row.highestPressureCategory).toEqual(
      expect.objectContaining({ categoryId: 'cat_food', pct: 0.8 }),
    );
    expect(row.cardChips).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'category',
          category: expect.objectContaining({ id: 'cat_travel', spent: 125 }),
        }),
      ]),
    );
  });

  it('summarizes itemization, lifecycle, status, and attention counts', () => {
    const plans = [
      planFixture({
        id: 'on_track',
        startDate: '2026-07-10',
        endDate: '2026-07-20',
        totalAmount: 1000,
      }),
      planFixture({
        id: 'watch',
        startDate: '2026-07-10',
        endDate: '2026-07-20',
        totalAmount: 1000,
      }),
      planFixture({
        id: 'over',
        startDate: '2026-07-01',
        endDate: '2026-07-12',
        totalAmount: 1000,
      }),
      planFixture({
        id: 'upcoming',
        startDate: '2026-07-20',
        endDate: '2026-07-21',
        totalAmount: 1000,
      }),
    ].map((fixture) => ({
      ...fixture,
      categories: [{ plan_id: fixture.id, category_id: 'cat_food', allocated_amount: 250 }],
    }));
    const rows = buildSpendingPlanRows({
      plans,
      categories,
      spendByPlanId: {
        on_track: { cat_food: 100 },
        watch: { cat_food: 500 },
        over: { cat_food: 1100 },
        upcoming: { cat_food: 0 },
      },
      selectedMonth: '2026-07',
      today: '2026-07-13',
    });

    expect(computeSpendingPlansSummary(rows)).toEqual({
      planned: 4000,
      spent: 1700,
      left: 2300,
      pct: 0.425,
      itemizedAmount: 1000,
      itemizedPct: 0.25,
      activeCount: 2,
      upcomingCount: 1,
      onTrackCount: 1,
      watchCount: 1,
      overCount: 1,
      needsAttentionCount: 2,
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

  it('marks negative allocations as invalid', () => {
    expect(
      validatePlanDraft({
        name: 'Trip',
        startDate: '2026-07-01',
        endDate: '2026-07-02',
        totalAmount: 1000,
        categoryIds: ['cat_food'],
        allocations: { cat_food: -1 },
      }),
    ).toEqual({ allocations: 'Each allocation must be zero or greater.' });
  });

  it('marks non-finite allocations as invalid', () => {
    expect(
      validatePlanDraft({
        name: 'Trip',
        startDate: '2026-07-01',
        endDate: '2026-07-02',
        totalAmount: 1000,
        categoryIds: ['cat_food'],
        allocations: { cat_food: Number.NaN },
      }),
    ).toEqual({ allocations: 'Each allocation must be zero or greater.' });
  });

  it('builds compact allocation, category, and overflow chips for plan cards', () => {
    expect(
      buildSpendingPlanCardChips({
        allocationRows: [
          {
            categoryId: 'cat_food',
            categoryName: 'Food',
            icon: 'food',
            color: '#caa445',
            allocatedAmount: 1000,
            spent: 200,
            left: 800,
            pct: 0.2,
            isOver: false,
          },
        ],
        categoryChips: [
          { id: 'cat_food', name: 'Food', icon: 'food', color: '#caa445', spent: 200 },
          { id: 'cat_travel', name: 'Travel', icon: 'bag', color: '#6aa9ff', spent: 100 },
          { id: 'cat_hotel', name: 'Hotel', icon: 'bed', color: '#64c987', spent: 80 },
          { id: 'cat_car', name: 'Car', icon: 'car', color: '#ff644e', spent: 40 },
        ],
      }),
    ).toEqual([
      expect.objectContaining({ type: 'allocation', id: 'cat_food' }),
      expect.objectContaining({ type: 'category', id: 'cat_travel' }),
      expect.objectContaining({ type: 'category', id: 'cat_hotel' }),
      { type: 'more', id: 'more', count: 1 },
    ]);
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
