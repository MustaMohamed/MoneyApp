import { CategoryType } from '@/constants/enums';
import { Colors } from '@/constants/theme';
import type { SpendingPlanWithCategories } from '@/modules/budget/entities/budget.entity';
import {
  buildSpendingPlanCardChips,
  buildSpendingPlanRows,
  computeAllocationHelper,
  computePlanTiming,
  planIntersectsMonth,
} from '@/modules/budget/screens/budget/spending_plans.helpers';
import { computeSpendingPlansSummary } from '@/modules/budget/screens/budget/spending_plans_summary.helpers';
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

  it('derives a display-ready compact active card and allocation chip', () => {
    const row = buildSpendingPlanRows({
      plans: [
        planFixture({
          startDate: '2026-07-13',
          endDate: '2026-08-01',
          totalAmount: 8000,
        }),
      ],
      categories,
      spendByPlanId: { plan_trip: { cat_food: 1200 } },
      selectedMonth: '2026-07',
      today: '2026-07-13',
    })[0];

    expect(row.card).toEqual(
      expect.objectContaining({
        statusLabel: 'Watch',
        statusTone: 'warning',
        dateLabel: 'Jul 13 - Aug 1 · 19 days left',
        balanceAmountLabel: '6,800',
        balanceMetaLabel: 'EGP left',
        balanceColor: Colors.dark.positive,
        spentLabel: '1,200 / 8,000 spent',
        percentageLabel: '15% used',
        progressColor: Colors.dark.gold,
        progressStatus: 'under',
        elapsedMarkerPercentage: 5,
        elapsedMarkerColor: Colors.shared.transferBlue,
        paceLabel: '10 pts ahead of pace',
        allocationFooterLabel: '3,000 assigned · 5,000 flexible',
        openDetailsAccessibilityLabel: 'Open Plan plan_trip details',
        balanceAccessibilityLabel: '6,800 EGP left',
      }),
    );
    expect(row.allocationRows[0]).toEqual({
      categoryId: 'cat_food',
      categoryName: 'Food',
      icon: 'food',
      color: '#f90',
      allocatedAmount: 3000,
      spent: 1200,
      left: 1800,
      pct: 0.4,
      isOver: false,
    });
    const allocationChip = row.card.chips[0];
    expect(allocationChip.type).toBe('allocation');
    if (allocationChip.type !== 'allocation') throw new Error('Expected allocation chip');
    expect(allocationChip.id).toBe('cat_food');
    expect(allocationChip.allocation.amountLabel).toBe('1,200/3,000');
    expect(allocationChip.allocation.percentageLabel).toBe('40%');
    expect(allocationChip.allocation.bandColor).toBe(Colors.dark.budgetUnder);
    expect(allocationChip.allocation.accessibilityLabel).toBe('Food, 1,200 of 3,000, 40% used');
  });

  it('derives lifecycle copy and omits the elapsed marker outside active plans', () => {
    const [upcoming, completed, completedOver] = buildSpendingPlanRows({
      plans: [
        planFixture({
          id: 'upcoming',
          startDate: '2026-07-18',
          endDate: '2026-07-21',
          categoryRows: [{ plan_id: 'upcoming', category_id: 'cat_food', allocated_amount: null }],
        }),
        planFixture({
          id: 'completed',
          startDate: '2026-07-01',
          endDate: '2026-07-12',
          totalAmount: 1000,
          categoryRows: [{ plan_id: 'completed', category_id: 'cat_food', allocated_amount: null }],
        }),
        planFixture({
          id: 'completed_over',
          startDate: '2026-07-01',
          endDate: '2026-07-11',
          totalAmount: 1000,
          categoryRows: [
            { plan_id: 'completed_over', category_id: 'cat_food', allocated_amount: null },
          ],
        }),
      ],
      categories,
      spendByPlanId: {
        upcoming: { cat_food: 0 },
        completed: { cat_food: 800 },
        completed_over: { cat_food: 1100 },
      },
      selectedMonth: '2026-07',
      today: '2026-07-13',
    });

    expect(upcoming.card).toEqual(
      expect.objectContaining({
        statusLabel: 'Upcoming',
        statusTone: 'accent',
        dateLabel: 'Jul 18 - Jul 21 · starts in 5 days',
      }),
    );
    expect(upcoming.card).not.toHaveProperty('elapsedMarkerPercentage');
    expect(upcoming.card).not.toHaveProperty('paceLabel');

    expect(completed.card).toEqual(
      expect.objectContaining({
        statusLabel: 'On track',
        statusTone: 'success',
        dateLabel: 'Jul 1 - Jul 12 · ended yesterday',
        paceLabel: '200 left at finish',
      }),
    );
    expect(completed.card).not.toHaveProperty('elapsedMarkerPercentage');

    expect(completedOver.card).toEqual(
      expect.objectContaining({
        statusLabel: 'Over',
        statusTone: 'danger',
        dateLabel: 'Jul 1 - Jul 11 · ended 2 days ago',
        balanceAmountLabel: '100',
        balanceMetaLabel: 'EGP over',
        balanceColor: Colors.dark.negative,
        progressColor: Colors.dark.negative,
        progressStatus: 'over',
        paceLabel: '100 over at finish',
      }),
    );
    expect(completedOver.card).not.toHaveProperty('elapsedMarkerPercentage');
  });

  it('derives unallocated category chip spend without limit or percentage values', () => {
    const row = buildSpendingPlanRows({
      plans: [
        planFixture({
          categoryRows: [
            { plan_id: 'plan_trip', category_id: 'cat_travel', allocated_amount: null },
          ],
        }),
      ],
      categories,
      spendByPlanId: { plan_trip: { cat_travel: 125 } },
      selectedMonth: '2026-07',
      today: '2026-07-13',
    })[0];

    expect(row.categoryChips[0]).toEqual({
      id: 'cat_travel',
      name: 'Travel',
      icon: 'bag',
      color: '#09f',
      spent: 125,
    });
    expect(row.card.chips[0]).toEqual({
      type: 'category',
      id: 'cat_travel',
      category: {
        id: 'cat_travel',
        name: 'Travel',
        icon: 'bag',
        color: '#09f',
        spent: 125,
        accessibilityLabel: 'Travel, 125 spent',
      },
    });
    expect(row.card.chips[0]).not.toHaveProperty('category.allocatedAmount');
    expect(row.card.chips[0]).not.toHaveProperty('category.percentageLabel');
    expect(row.card.chips[0]).not.toHaveProperty('category.bandColor');
    expect(row.card.allocationFooterLabel).toBe('0 assigned · 8,000 flexible');
  });

  it('computes plans summary from visible rows', () => {
    const rows = buildSpendingPlanRows({
      plans: [plan],
      categories,
      spendByPlanId: { plan_trip: { cat_food: 1200 } },
      selectedMonth: '2026-07',
      today: '2026-07-13',
    });
    expect(computeSpendingPlansSummary(rows, '2026-07')).toEqual({
      planned: 8000,
      spent: 1200,
      left: 6800,
      pct: 0.15,
      planCount: 1,
      monthLabel: 'July 2026',
      eyebrowLabel: '1 plan in July 2026',
      usedPercentage: 15,
      progressPercentage: 15,
      itemizedAmount: 3000,
      itemizedPct: 0.375,
      itemizedPercentage: 38,
      balanceAmount: 6800,
      balanceStatus: 'left',
      balanceColor: Colors.dark.positive,
      barColor: Colors.dark.gold,
      barStatus: 'under',
      activeCount: 0,
      upcomingCount: 1,
      onTrackCount: 0,
      watchCount: 0,
      overCount: 0,
      needsAttentionCount: 0,
      statusItems: [
        {
          key: 'onTrack',
          icon: 'check-circle-outline',
          color: Colors.dark.positive,
          label: '0 on track',
        },
        {
          key: 'watch',
          icon: 'alert-circle-outline',
          color: Colors.dark.warning,
          label: '0 watch',
        },
        {
          key: 'over',
          icon: 'alert-octagon-outline',
          color: Colors.dark.negative,
          label: '0 over',
        },
        {
          key: 'upcoming',
          icon: 'clock-outline',
          color: Colors.shared.transferBlue,
          label: '1 upcoming',
        },
      ],
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

  it('marks an active plan watch at exactly ten percentage points ahead of pace', () => {
    const row = buildSpendingPlanRows({
      plans: [
        planFixture({
          startDate: '2026-07-13',
          endDate: '2026-07-14',
          totalAmount: 1000,
          categoryRows: [{ plan_id: 'plan_trip', category_id: 'cat_food', allocated_amount: null }],
        }),
      ],
      categories,
      spendByPlanId: { plan_trip: { cat_food: 600 } },
      selectedMonth: '2026-07',
      today: '2026-07-13',
    })[0];

    expect(row.timing.elapsedPct).toBe(0.5);
    expect(row.pct).toBe(0.6);
    expect(row.status).toBe('watch');
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

  it('treats positive spend against a zero allocation as the highest category pressure', () => {
    const row = buildSpendingPlanRows({
      plans: [
        planFixture({
          startDate: '2026-07-01',
          endDate: '2026-07-20',
          totalAmount: 2000,
          categoryRows: [
            { plan_id: 'plan_trip', category_id: 'cat_food', allocated_amount: 0 },
            { plan_id: 'plan_trip', category_id: 'cat_travel', allocated_amount: 1000 },
          ],
        }),
      ],
      categories,
      spendByPlanId: { plan_trip: { cat_food: 50, cat_travel: 500 } },
      selectedMonth: '2026-07',
      today: '2026-07-13',
    })[0];

    expect(row.isOver).toBe(false);
    expect(row.paceDelta).toBeLessThan(0.1);
    expect(row.detailCategoryRows[0]).toEqual(
      expect.objectContaining({ allocatedAmount: 0, spent: 50, pct: 1, isOver: true }),
    );
    expect(row.detail.categoryRows[0]).toEqual(
      expect.objectContaining({ percentageLabel: 'Over', statusLabel: 'Over' }),
    );
    expect(row.highestPressureCategory?.categoryId).toBe('cat_food');
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

  it('derives a display-ready detail summary, insights, and honest category rows', () => {
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
      spendByPlanId: { plan_trip: { cat_food: 850, cat_travel: 125 } },
      selectedMonth: '2026-07',
      today: '2026-07-13',
    })[0];

    expect(row.detail).toEqual(
      expect.objectContaining({
        dateLabel: 'Jul 8 - Jul 18 · 5 days left',
        balanceAmountLabel: '4,025',
        balanceMetaLabel: 'EGP left',
        spentLabel: '975 / 5,000 spent',
        percentageLabel: '20% used',
        elapsedMarkerPercentage: 55,
        metrics: [
          { label: 'Budget used', value: '20%' },
          { label: 'Time elapsed', value: '55%' },
          { label: 'Assigned', value: '1,000' },
          { label: 'Flexible', value: '4,000' },
        ],
        insights: [
          expect.objectContaining({ label: '35 pts under pace' }),
          expect.objectContaining({ label: 'Food has used 85% of its limit' }),
        ],
        flexibleRow: {
          label: 'Flexible',
          amountLabel: '4,000 EGP',
          supportingLabel: 'Unassigned plan budget',
        },
      }),
    );
    expect(row.detail.categoryRows).toEqual([
      expect.objectContaining({
        categoryId: 'cat_food',
        kind: 'allocated',
        categoryName: 'Food',
        amountLabel: '850 / 1,000',
        percentageLabel: '85%',
        supportingLabel: '85% used · watch',
        balanceLabel: '150 left',
        statusLabel: 'Watch',
      }),
      expect.objectContaining({
        categoryId: 'cat_travel',
        kind: 'unallocated',
        categoryName: 'Travel',
        amountLabel: '125 spent',
        supportingLabel: 'Included · no category limit',
      }),
    ]);
    expect(row.detail.categoryRows[1]).not.toHaveProperty('percentageLabel');
    expect(row.detail.categoryRows[1]).not.toHaveProperty('balanceLabel');
    expect(row.detail.categoryRows[1]).not.toHaveProperty('progressColor');
  });

  it('limits detail insights and omits the elapsed marker outside active plans', () => {
    const [upcoming, completed] = buildSpendingPlanRows({
      plans: [
        planFixture({
          id: 'upcoming_detail',
          startDate: '2026-07-18',
          endDate: '2026-07-21',
          categoryRows: [
            {
              plan_id: 'upcoming_detail',
              category_id: 'cat_food',
              allocated_amount: 1000,
            },
          ],
        }),
        planFixture({
          id: 'completed_detail',
          startDate: '2026-07-01',
          endDate: '2026-07-12',
          totalAmount: 1000,
          categoryRows: [
            {
              plan_id: 'completed_detail',
              category_id: 'cat_food',
              allocated_amount: 1000,
            },
          ],
        }),
      ],
      categories,
      spendByPlanId: {
        upcoming_detail: { cat_food: 900 },
        completed_detail: { cat_food: 800 },
      },
      selectedMonth: '2026-07',
      today: '2026-07-13',
    });

    expect(upcoming.detail).not.toHaveProperty('elapsedMarkerPercentage');
    expect(upcoming.detail.metrics[1]).toEqual({ label: 'Time elapsed', value: '0%' });
    expect(upcoming.detail.insights).toHaveLength(1);
    expect(completed.detail).not.toHaveProperty('elapsedMarkerPercentage');
    expect(completed.detail.metrics[1]).toEqual({ label: 'Time elapsed', value: '100%' });
    expect(completed.detail.insights).toEqual([
      expect.objectContaining({ label: '200 left at finish' }),
      expect.objectContaining({ label: 'Food has used 80% of its limit' }),
    ]);
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

    expect(computeSpendingPlansSummary(rows, '2026-07')).toEqual({
      planned: 4000,
      spent: 1700,
      left: 2300,
      pct: 0.425,
      planCount: 4,
      monthLabel: 'July 2026',
      eyebrowLabel: '4 plans in July 2026',
      usedPercentage: 43,
      progressPercentage: 43,
      itemizedAmount: 1000,
      itemizedPct: 0.25,
      itemizedPercentage: 25,
      balanceAmount: 2300,
      balanceStatus: 'left',
      balanceColor: Colors.dark.positive,
      barColor: Colors.dark.gold,
      barStatus: 'under',
      activeCount: 2,
      upcomingCount: 1,
      onTrackCount: 1,
      watchCount: 1,
      overCount: 1,
      needsAttentionCount: 2,
      statusItems: [
        {
          key: 'onTrack',
          icon: 'check-circle-outline',
          color: Colors.dark.positive,
          label: '1 on track',
        },
        {
          key: 'watch',
          icon: 'alert-circle-outline',
          color: Colors.dark.warning,
          label: '1 watch',
        },
        {
          key: 'over',
          icon: 'alert-octagon-outline',
          color: Colors.dark.negative,
          label: '1 over',
        },
        {
          key: 'upcoming',
          icon: 'clock-outline',
          color: Colors.shared.transferBlue,
          label: '1 upcoming',
        },
      ],
    });
  });

  it('derives display-ready over-budget summary fields', () => {
    const rows = buildSpendingPlanRows({
      plans: [planFixture({ totalAmount: 1000 })],
      categories,
      spendByPlanId: { plan_trip: { cat_food: 1100 } },
      selectedMonth: '2026-07',
      today: '2026-07-13',
    });

    expect(computeSpendingPlansSummary(rows, '2026-07')).toEqual(
      expect.objectContaining({
        left: -100,
        pct: 1.1,
        usedPercentage: 110,
        progressPercentage: 100,
        balanceAmount: 100,
        balanceStatus: 'over',
        balanceColor: Colors.dark.negative,
        barColor: Colors.dark.negative,
        barStatus: 'over',
      }),
    );
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
});
