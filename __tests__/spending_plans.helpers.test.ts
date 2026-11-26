import { DETAIL_HERO_BADGE_COLORS } from '@/components/ui/hero_gradient_badge';
import { CURRENCY_CONFIG } from '@/constants/currency';
import { CategoryType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';
import { mixHex } from '@/modules/accounts/constants/account_badge_color';
import {
  contrastRatio,
  NON_TEXT_MIN_CONTRAST_RATIO,
} from '@/modules/accounts/constants/account_palette';
import type { SpendingPlanWithCategories } from '@/modules/budget/entities/budget.entity';
import { derivePlanStatus } from '@/modules/budget/screens/budget/spending_plan_timing.helpers';
import {
  buildSpendingPlanCardChips,
  buildSpendingPlanRows,
  computeAllocationHelper,
  computePlanTiming,
  planIntersectsMonth,
  resolveCategoryTileColors,
} from '@/modules/budget/screens/budget/spending_plans.helpers';
import { computeSpendingPlansSummary } from '@/modules/budget/screens/budget/spending_plans_summary.helpers';
import { heroStatusTag } from '@/modules/budget/utils/budget_hero';
import { budgetBandColor } from '@/modules/budget/utils/budget_summary';
import type { Category } from '@/modules/categories/entities/category.entity';
import {
  formatAmount,
  formatCurrencyAmount,
  formatDisplayAmountParts,
} from '@/utils/format_amount';

type PlanRow = ReturnType<typeof buildSpendingPlanRows>[number];

function limitsCardOf(row: PlanRow) {
  const card = row.detail.limitsCard;
  if (card === undefined) throw new Error('Expected a Category limits card');
  return card;
}

function limitRows(row: PlanRow) {
  return limitsCardOf(row).rows;
}

function limitRow(row: PlanRow, categoryId: string) {
  const found = limitRows(row).find((item) => item.categoryId === categoryId);
  if (found === undefined) throw new Error(`Expected a limit row for ${categoryId}`);
  return found;
}

// The pace reading alone: an active plan that is not over and has no category pressure.
function paceStatus(row: PlanRow) {
  return derivePlanStatus({
    lifecycle: 'active',
    isOver: false,
    spent: row.spent,
    totalAmount: row.totalAmount,
    elapsedDays: row.timing.elapsedDays,
    totalDays: row.timing.totalDays,
    hasCategoryPressure: false,
  });
}

const categories: Category[] = [
  {
    id: 'cat_food',
    name: 'Food',
    type: CategoryType.Expense,
    icon: 'food',
    color: '#FF9900',
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
    color: '#0099FF',
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
    color: '#00FF00',
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
      color: '#FF9900',
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

  it('reads ends tomorrow for an active plan with one day left and counts days beyond it', () => {
    const [oneDay, twoDays] = buildSpendingPlanRows({
      plans: [
        planFixture({ id: 'one_day', startDate: '2026-07-08', endDate: '2026-07-14' }),
        planFixture({ id: 'two_days', startDate: '2026-07-08', endDate: '2026-07-15' }),
      ],
      categories,
      spendByPlanId: { one_day: { cat_food: 0 }, two_days: { cat_food: 0 } },
      selectedMonth: '2026-07',
      today: '2026-07-13',
    });

    expect(oneDay.card.dateLabel).toBe('Jul 8 - Jul 14 · ends tomorrow');
    expect(twoDays.card.dateLabel).toBe('Jul 8 - Jul 15 · 2 days left');
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
      color: '#0099FF',
      spent: 125,
    });
    expect(row.card.chips[0]).toEqual({
      type: 'category',
      id: 'cat_travel',
      category: {
        id: 'cat_travel',
        name: 'Travel',
        icon: 'bag',
        color: '#0099FF',
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

  it('marks an active plan watch at exactly ten percentage points ahead of pace, and on track one cent below', () => {
    const build = (spent: number) =>
      buildSpendingPlanRows({
        plans: [
          planFixture({
            startDate: '2026-07-13',
            endDate: '2026-07-14',
            totalAmount: 1000,
            categoryRows: [
              { plan_id: 'plan_trip', category_id: 'cat_food', allocated_amount: null },
            ],
          }),
        ],
        categories,
        spendByPlanId: { plan_trip: { cat_food: spent } },
        selectedMonth: '2026-07',
        today: '2026-07-13',
      })[0];
    const row = build(600);

    expect(row.timing).toMatchObject({ elapsedDays: 1, totalDays: 2 });
    expect(row.pct).toBe(0.6);
    expect(row.status).toBe('watch');
    expect(build(599.99).status).toBe('onTrack');
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

    expect(paceStatus(row)).toBe('onTrack');
    expect(row).not.toHaveProperty('paceDelta');
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
    expect(paceStatus(row)).toBe('onTrack');
    expect(row).not.toHaveProperty('paceDelta');
    expect(row.detailCategoryRows[0]).toEqual(
      expect.objectContaining({ allocatedAmount: 0, spent: 50, pct: 1, isOver: true }),
    );
    expect(limitRow(row, 'cat_food').tag?.label).toBe(Strings.budgetPlansStatusOver);
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
        color: '#0099FF',
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

  it('derives honest limit rows and puts the category with no limit on the Flexible card', () => {
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

    expect(limitRows(row)).toEqual([
      expect.objectContaining({
        categoryId: 'cat_food',
        kind: 'allocated',
        categoryName: 'Food',
        amountLabel: formatAmount(150),
        supportingLabel: Strings.budgetPlansDetailLimitSpentOf(
          formatAmount(850),
          formatAmount(1000),
        ),
        balanceLabel: Strings.budgetPlansLeftStatus,
        tag: expect.objectContaining({ label: Strings.budgetPlansStatusWatch }),
      }),
    ]);
    const flexibleRows = row.detail.flexibleCard?.rows ?? [];
    expect(flexibleRows).toEqual([
      expect.objectContaining({
        categoryId: 'cat_travel',
        kind: 'unallocated',
        categoryName: 'Travel',
        amountLabel: formatAmount(125),
        supportingLabel: Strings.budgetPlansDetailNoCategoryLimit,
      }),
    ]);
    for (const field of ['pct', 'progressColor', 'tag']) {
      expect(flexibleRows[0]).not.toHaveProperty(field);
    }
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
    expect(computeAllocationHelper(8000, [3000])).toEqual({
      allocated: 3000,
      buffer: 5000,
      isOver: false,
      hasCents: false,
    });
  });

  // The array parameter is the guard: re-widening it to a per-category record stops compiling.
  it('marks allocations above the total as invalid', () => {
    expect(computeAllocationHelper(5000, [3000, 3000])).toEqual({
      allocated: 6000,
      buffer: -1000,
      isOver: true,
      hasCents: false,
    });
  });

  it('treats an unparseable allocation as contributing 0', () => {
    expect(computeAllocationHelper(100, [40, undefined]).allocated).toBe(40);
  });

  // Float subtraction gives -0.4000000000000057 here; only integer cents reports -0.4.
  it('reports an exact negative buffer when the allocations overshoot', () => {
    expect(computeAllocationHelper(100, [100.4]).buffer).toBe(-0.4);
  });

  it('reports no buffer and no overage while the total is unentered', () => {
    expect(computeAllocationHelper(undefined, [40])).toEqual({
      allocated: 40,
      buffer: undefined,
      isOver: false,
      hasCents: false,
    });
  });

  it('passes through that a typed allocation holds cents', () => {
    expect(computeAllocationHelper(5000, [2000.4]).hasCents).toBe(true);
  });

  // A signed zero renders as "-0.00"; under integer cents `a - b` with `a === b` gives +0.
  it('never reports a negative zero buffer', () => {
    expect(Object.is(computeAllocationHelper(100, [100]).buffer, 0)).toBe(true);
  });

  // A NULL allocation means "not decided"; a zero allocation means a deliberate zero.
  it('gives a NULL allocation no row at all, and a zero allocation a row worth 0', () => {
    const row = buildSpendingPlanRows({
      plans: [
        planFixture({
          categoryRows: [
            { plan_id: 'plan_trip', category_id: 'cat_food', allocated_amount: null },
            { plan_id: 'plan_trip', category_id: 'cat_travel', allocated_amount: 0 },
          ],
        }),
      ],
      categories,
      spendByPlanId: {},
      selectedMonth: '2026-07',
      today: '2026-07-13',
    })[0];

    expect(row.allocationRows.map((allocation) => allocation.categoryId)).toEqual(['cat_travel']);
    expect(row.allocationRows[0].allocatedAmount).toBe(0);
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

// 0.1 + 0.2 is 0.30000000000000004: a spend one float step past 0.3, a tie to the cent.
describe('a spend that ties its plan or its allocation to the cent is not over (MA-158)', () => {
  const build = (allocated: number, spend: number, totalAmount = 0.3) => {
    const rows = buildSpendingPlanRows({
      plans: [
        planFixture({
          totalAmount,
          categoryRows: [
            { plan_id: 'plan_trip', category_id: 'cat_food', allocated_amount: allocated },
          ],
        }),
      ],
      categories,
      spendByPlanId: { plan_trip: { cat_food: spend } },
      selectedMonth: '2026-07',
      today: '2026-07-13',
    });
    return { row: rows[0], summary: computeSpendingPlansSummary(rows, '2026-07') };
  };

  it('reads the plan, its allocation, its detail row and the summary as not over at the tie, and over 0.01 past it', () => {
    const over = build(0.3, 0.31);
    expect(over.row.isOver).toBe(true);
    expect(over.row.status).toBe('over');
    expect(over.row.card).toMatchObject({
      balanceColor: Colors.dark.negative,
      progressStatus: 'over',
    });
    expect(over.row.allocationRows[0].isOver).toBe(true);
    expect(over.row.allocationRows[0].pct).toBeGreaterThan(1);
    expect(limitRow(over.row, 'cat_food')).toMatchObject({
      balanceColor: Colors.dark.negative,
      progressColor: Colors.dark.budgetOver,
      balanceLabel: Strings.budgetPlansOverStatus,
      tag: { label: Strings.budgetPlansStatusOver, icon: 'alert-circle' },
    });
    expect(over.summary).toMatchObject({ balanceStatus: 'over', barStatus: 'over', overCount: 1 });

    const tie = build(0.3, 0.1 + 0.2);
    expect(tie.row.isOver).toBe(false);
    expect(tie.row.status).not.toBe('over');
    expect(tie.row.card).toMatchObject({
      balanceColor: Colors.dark.positive,
      progressStatus: 'under',
    });
    expect(tie.row.allocationRows[0]).toMatchObject({ isOver: false, pct: 1 });
    expect(limitRow(tie.row, 'cat_food')).toMatchObject({
      balanceColor: Colors.dark.text2,
      progressColor: Colors.dark.budgetNear,
      balanceLabel: Strings.budgetPlansLeftStatus,
      amountLabel: formatAmount(0),
      tag: { label: Strings.budgetPlansStatusWatch, icon: 'trending-up' },
    });
    expect(tie.summary).toMatchObject({ balanceStatus: 'left', barStatus: 'under', overCount: 0 });
  });

  it('reads a zero allocation with a spend under half a cent as 0%, and with a spend of 0.01 as over', () => {
    const over = build(0, 0.01, 1000).row;
    expect(over.card.allocationChips[0].percentageLabel).toBe(Strings.budgetPlansStatusOver);
    expect(limitRow(over, 'cat_food')).toMatchObject({
      progressColor: Colors.dark.budgetOver,
      balanceLabel: Strings.budgetPlansOverStatus,
      tag: { label: Strings.budgetPlansStatusOver },
    });

    const leftover = build(0, 5.5e-17, 1000).row;
    expect(leftover.card.allocationChips[0].percentageLabel).toBe('0%');
    const leftoverRow = limitRow(leftover, 'cat_food');
    expect(leftoverRow).toMatchObject({
      pct: 0,
      progressColor: Colors.dark.budgetUnder,
      balanceLabel: Strings.budgetPlansLeftStatus,
    });
    expect(leftoverRow.tag?.label).not.toBe(Strings.budgetPlansStatusOver);
  });
});

// 0.8 - (0.7 + 0.1) is 1.1102230246251565e-16 and 0.3 - (0.1 + 0.2) is -5.551115123125783e-17.
describe('a plan buffer under half a cent draws no Flexible card (MA-158)', () => {
  const build = (totalAmount: number, first: number, second: number) =>
    buildSpendingPlanRows({
      plans: [
        planFixture({
          totalAmount,
          categoryRows: [
            { plan_id: 'plan_trip', category_id: 'cat_food', allocated_amount: first },
            { plan_id: 'plan_trip', category_id: 'cat_travel', allocated_amount: second },
          ],
        }),
      ],
      categories,
      spendByPlanId: { plan_trip: {} },
      selectedMonth: '2026-07',
      today: '2026-07-13',
    })[0];

  it.each([
    { side: 'above', totalAmount: 0.8, first: 0.7, second: 0.1 },
    { side: 'below', totalAmount: 0.3, first: 0.1, second: 0.2 },
  ])(
    'reads a buffer one float step $side zero as zero, with no Flexible card',
    ({ totalAmount, first, second }) => {
      const row = build(totalAmount, first, second);

      expect(row.detail).not.toHaveProperty('flexibleCard');
      expect(Object.is(row.buffer, 0)).toBe(true);
    },
  );

  it('keeps the Flexible card for a buffer of 0.01', () => {
    expect(build(0.8, 0.7, 0.09).detail.flexibleCard).toMatchObject({
      amountLabel: formatCurrencyAmount(0.01, Currency.EGP),
      rows: [],
    });
  });
});

// (145 / 1000) * 100 is 14.499999999999998 and 0.105 - 0.1 is 0.0049999999999999906: halves a float rounds down.
describe('plan percents round a half up, the pace line rounds the exact gap, and the 80% warning sits on its boundary (MA-112)', () => {
  const build = ({
    startDate = '2026-07-08',
    endDate = '2026-07-18',
    today = '2026-07-13',
    totalAmount = 1000,
    allocated = null,
    spent,
  }: {
    startDate?: string;
    endDate?: string;
    today?: string;
    totalAmount?: number;
    allocated?: number | null;
    spent: number;
  }) => {
    const rows = buildSpendingPlanRows({
      plans: [
        planFixture({
          startDate,
          endDate,
          totalAmount,
          categoryRows: [
            { plan_id: 'plan_trip', category_id: 'cat_food', allocated_amount: allocated },
          ],
        }),
      ],
      categories,
      spendByPlanId: { plan_trip: { cat_food: spent } },
      selectedMonth: '2026-07',
      today,
    });
    return { row: rows[0], summary: computeSpendingPlansSummary(rows, '2026-07') };
  };

  const onDayThreeOfThirty = (spent: number) => {
    const { row } = build({
      startDate: '2026-07-01',
      endDate: '2026-07-30',
      today: '2026-07-03',
      spent,
    });
    return row.card.paceLabel;
  };

  it('a plan of 1,000 on day 3 of 30 reads 1 pts under pace at 95 spent and 1 pts ahead of pace at 105', () => {
    const under = Strings.budgetPlansPaceUnder(1);
    const ahead = Strings.budgetPlansPaceAhead(1);

    expect(onDayThreeOfThirty(95)).toBe(under);
    expect(onDayThreeOfThirty(105)).toBe(ahead);
  });

  it('a pace gap whose size rounds to 0 reads On pace: 104 spent on day 3 of 30', () => {
    expect(onDayThreeOfThirty(104)).toBe(Strings.budgetPlansPaceEven);
  });

  it('a plan of 1,000 with 145 spent reads 15% used on the card', () => {
    const { row } = build({ spent: 145 });

    expect(row.card.percentageLabel).toBe(Strings.budgetPlansSummaryUsed(15));
  });

  it('the Plans summary reads 15 used and 15 itemized for one plan of 1,000 with 145 spent and 145 allocated', () => {
    const { summary } = build({ allocated: 145, spent: 145 });

    expect(summary).toMatchObject({ usedPercentage: 15, itemizedPercentage: 15 });
  });

  // 23 days of 40 is 57.49999999999999 in floating point.
  it('the elapsed marker sits at the whole percent: day 23 of 40 is 58', () => {
    const { row } = build({
      startDate: '2026-07-01',
      endDate: '2026-08-09',
      today: '2026-07-23',
      spent: 0,
    });

    expect(row.card.elapsedMarkerPercentage).toBe(58);
  });

  it('an allocation of 200 with 29 spent reads 15% on the chip and in its accessibility label, and the limit row reads its caption and balance, and a zero allocation with 50 spent reads Over', () => {
    const zero = build({ totalAmount: 2000, allocated: 0, spent: 50 }).row;
    expect(limitRow(zero, 'cat_food')).toMatchObject({
      progressColor: Colors.dark.budgetOver,
      tag: { label: Strings.budgetPlansStatusOver },
    });

    const { row } = build({ allocated: 200, spent: 29 });
    const chip = row.card.allocationChips[0];
    const detailRow = limitRow(row, 'cat_food');
    const caption = Strings.budgetPlansDetailLimitSpentOf(formatAmount(29), formatAmount(200));

    expect({
      chip: chip.percentageLabel,
      chipA11y: chip.accessibilityLabel,
      detailA11y: detailRow.accessibilityLabel,
    }).toEqual({
      chip: '15%',
      chipA11y: Strings.budgetPlansAllocationChipA11y('Food', '29', '200', 15),
      detailA11y: Strings.budgetPlansDetailCategoryA11y(
        'Food',
        caption,
        Strings.budgetPlansDetailBalance(formatAmount(171), Strings.budgetPlansLeftStatus),
      ),
    });
  });

  // 844.9 + 0.05 + 0.05 is 844.9999999999999, which a float quotient prints as 84.
  it('a plan of 1,000 with a float sum of 845 spent reads 85% used on the hero', () => {
    const { row } = build({ spent: 844.9 + 0.05 + 0.05 });

    expect(row.detail.hero?.caption).toEqual(
      Strings.budgetPlansHeroUsedLine(85, row.timing.elapsedDays, row.timing.totalDays),
    );
  });

  // 2399.2 / 2999 is 0.7999999999999999: one float step under the 80% warning.
  it('an allocation of 2,999 warns at 2,399.20 spent and not at 2,399.19', () => {
    const isWarning = (spent: number) =>
      build({ totalAmount: 5000, allocated: 2999, spent }).row.detailCategoryRows[0]?.isWarning;

    expect({ onBoundary: isWarning(2399.2), oneCentUnder: isWarning(2399.19) }).toEqual({
      onBoundary: true,
      oneCentUnder: false,
    });
  });
});

describe('plan detail draws a Category limits card (MA-326)', () => {
  const extraCategories: Category[] = [
    {
      ...categories[0],
      id: 'cat_home',
      name: 'Home',
      icon: 'home',
      color: '#2A3A4F',
      sort_order: 3,
    },
    {
      ...categories[0],
      id: 'cat_aaa',
      name: 'Utilities',
      icon: 'flash',
      color: '#00FF00',
      sort_order: 4,
    },
  ];
  const limitCategories = [...categories, ...extraCategories];

  const build = ({
    startDate = '2026-07-08',
    endDate = '2026-07-18',
    today = '2026-07-13',
    totalAmount = 5000,
    limits,
    spend,
  }: {
    startDate?: string;
    endDate?: string;
    today?: string;
    totalAmount?: number;
    limits: Record<string, number | null>;
    spend: Record<string, number>;
  }) =>
    buildSpendingPlanRows({
      plans: [
        planFixture({
          startDate,
          endDate,
          totalAmount,
          categoryRows: Object.entries(limits).map(([categoryId, allocated]) => ({
            plan_id: 'plan_trip',
            category_id: categoryId,
            allocated_amount: allocated,
          })),
        }),
      ],
      categories: limitCategories,
      spendByPlanId: { plan_trip: spend },
      selectedMonth: '2026-07',
      today,
    })[0];

  it('states the assigned total, runs the limit rows largest limit first, tags 87.5% Watch, and keeps the null-limit category out of the card', () => {
    const row = build({
      limits: { cat_food: 1000, cat_home: null, cat_travel: 2000 },
      spend: { cat_food: 650, cat_home: 90, cat_travel: 1750 },
    });
    const card = row.detail.limitsCard;

    expect(card?.assignedLabel).toBe(Strings.budgetPlansDetailLimitsAssigned(formatAmount(3000)));
    expect(limitRows(row).map((item) => item.categoryId)).toEqual(['cat_travel', 'cat_food']);
    expect(row.detail.flexibleCard?.rows.map((item) => item.categoryId)).toEqual(['cat_home']);

    const caption = Strings.budgetPlansDetailLimitSpentOf(formatAmount(1750), formatAmount(2000));
    const travel = limitRow(row, 'cat_travel');
    expect(travel).toMatchObject({
      kind: 'allocated',
      supportingLabel: caption,
      amountLabel: formatAmount(250),
      amountCode: CURRENCY_CONFIG[Currency.EGP].code,
      balanceLabel: Strings.budgetPlansLeftStatus,
      progressColor: budgetBandColor(1750, 2000),
      tag: { label: Strings.budgetPlansStatusWatch, icon: 'trending-up' },
      ...resolveCategoryTileColors('#0099FF'),
    });
    expect(travel.accessibilityLabel).toBe(
      Strings.budgetPlansDetailCategoryA11y(
        'Travel',
        caption,
        Strings.budgetPlansDetailBalance(formatAmount(250), Strings.budgetPlansLeftStatus),
        Strings.budgetPlansStatusWatch,
      ),
    );

    const food = limitRow(row, 'cat_food');
    expect(food.progressColor).toBe(budgetBandColor(650, 1000));
    expect(food).not.toHaveProperty('tag');
  });

  it('tags a limit Watch at exactly 80% while the plan is active', () => {
    const row = build({ limits: { cat_food: 1000 }, spend: { cat_food: 800 } });

    expect(limitRow(row, 'cat_food').tag?.label).toBe(Strings.budgetPlansStatusWatch);
  });

  it('gives a plan with no category limits no limitsCard key, and the same plan with one limit a card', () => {
    const spend = { cat_food: 300, cat_travel: 100 };
    const unlimited = build({ limits: { cat_food: null, cat_travel: null }, spend });
    const limited = build({ limits: { cat_food: 1000, cat_travel: null }, spend });

    expect(unlimited.detail).not.toHaveProperty('limitsCard');
    expect(unlimited.detail.flexibleCard?.rows).toHaveLength(2);
    expect(limitRows(limited).map((item) => item.categoryId)).toEqual(['cat_food']);
  });

  it('orders equal limits by spending, largest first, then by name', () => {
    const row = build({
      limits: { cat_aaa: 1000, cat_food: 1000, cat_home: 1000, cat_travel: 1000 },
      spend: { cat_aaa: 300, cat_food: 300, cat_home: 300, cat_travel: 500 },
    });

    expect(limitRows(row).map((item) => item.categoryName)).toEqual([
      'Travel',
      'Food',
      'Home',
      'Utilities',
    ]);
  });

  it('tags a limit one cent over Over and reads it over', () => {
    const row = build({ limits: { cat_food: 1000 }, spend: { cat_food: 1000.01 } });

    expect(limitRow(row, 'cat_food')).toMatchObject({
      balanceLabel: Strings.budgetPlansOverStatus,
      balanceColor: Colors.dark.negative,
      progressColor: Colors.dark.budgetOver,
      tag: { label: Strings.budgetPlansStatusOver, icon: 'alert-circle' },
    });
  });

  it('tags a limit of 0 with spending Over in the over band colour', () => {
    const row = build({ limits: { cat_food: 0 }, spend: { cat_food: 50 } });

    expect(limitRow(row, 'cat_food')).toMatchObject({
      progressColor: Colors.dark.budgetOver,
      tag: { label: Strings.budgetPlansStatusOver },
    });
  });

  it('draws an ended plan with no tick, its 85% row untagged and its over row Over', () => {
    const row = build({
      startDate: '2026-07-01',
      endDate: '2026-07-12',
      limits: { cat_food: 1000, cat_travel: 1000 },
      spend: { cat_food: 850, cat_travel: 1200 },
    });

    expect(row.timing.lifecycle).toBe('completed');
    expect(limitsCardOf(row)).not.toHaveProperty('tickPercentage');
    expect(limitRow(row, 'cat_food')).not.toHaveProperty('tag');
    expect(limitRow(row, 'cat_travel').tag?.label).toBe(Strings.budgetPlansStatusOver);
  });

  it('draws an upcoming plan with no tick and no Watch tag', () => {
    const row = build({
      startDate: '2026-07-18',
      endDate: '2026-07-21',
      limits: { cat_food: 1000 },
      spend: { cat_food: 850 },
    });

    expect(row.timing.lifecycle).toBe('upcoming');
    expect(limitsCardOf(row)).not.toHaveProperty('tickPercentage');
    expect(limitRow(row, 'cat_food')).not.toHaveProperty('tag');
  });

  it("moves an active plan's today tick with the day, each day's at its elapsed marker", () => {
    const onDay = (today: string) =>
      build({ today, limits: { cat_food: 1000 }, spend: { cat_food: 300 } });
    const first = onDay('2026-07-13');
    const second = onDay('2026-07-14');

    expect(first.detail.limitsCard?.tickPercentage).toBeDefined();
    expect(first.detail.limitsCard?.tickPercentage).toBe(first.card.elapsedMarkerPercentage);
    expect(second.detail.limitsCard?.tickPercentage).toBe(second.card.elapsedMarkerPercentage);
    expect(second.detail.limitsCard?.tickPercentage).not.toBe(
      first.detail.limitsCard?.tickPercentage,
    );
  });
});

describe('resolveCategoryTileColors (MA-326)', () => {
  it.each(['#FF9900', '#0099FF', '#00FF00', '#2A3A4F'])(
    'tints %s over the surface and gives a glyph that clears 3:1 on it',
    (color) => {
      const { tileFill, glyphColor } = resolveCategoryTileColors(color);

      expect(tileFill).toBe(mixHex(color, CoreTokens.surface, 0x26 / 255));
      expect(contrastRatio(glyphColor, tileFill)).toBeGreaterThanOrEqual(
        NON_TEXT_MIN_CONTRAST_RATIO,
      );
    },
  );

  it.each(['#FF9900', '#0099FF', '#00FF00'])(
    'keeps %s, which already clears, unchanged',
    (color) => {
      expect(resolveCategoryTileColors(color).glyphColor).toBe(color);
    },
  );
});

describe('an active plan draws the D2 hero (MA-331)', () => {
  const heroCategories: Category[] = [
    ...categories,
    { ...categories[0], id: 'cat_home', name: 'Home', icon: 'home', sort_order: 3 },
  ];

  const build = ({
    startDate = '2026-11-12',
    endDate = '2026-11-15',
    today = '2026-11-14',
    totalAmount = 5000,
    limits = { cat_travel: 2000, cat_food: 1000, cat_home: null },
    spend = { cat_travel: 1750, cat_food: 650, cat_home: 1500 },
  }: {
    startDate?: string;
    endDate?: string;
    today?: string;
    totalAmount?: number;
    limits?: Record<string, number | null>;
    spend?: Record<string, number>;
  } = {}) =>
    buildSpendingPlanRows({
      plans: [
        planFixture({
          startDate,
          endDate,
          totalAmount,
          categoryRows: Object.entries(limits).map(([categoryId, allocated]) => ({
            plan_id: 'plan_trip',
            category_id: categoryId,
            allocated_amount: allocated,
          })),
        }),
      ],
      categories: heroCategories,
      spendByPlanId: { plan_trip: spend },
      selectedMonth: startDate.slice(0, 7),
      today,
    })[0];

  function heroOf(row: PlanRow) {
    const hero = row.detail.hero;
    if (hero === undefined) throw new Error('Expected the D2 hero on an active plan');
    return hero;
  }

  const egp = CURRENCY_CONFIG[Currency.EGP].code;

  it('frame D2: tile, title, badge, Watch tag, Left of, figures, bar, used line and pace line', () => {
    const hero = heroOf(build());

    expect(hero.title).toBe('Plan plan_trip');
    expect(hero.tileDate).toEqual({ month: 'NOV', day: '12', ink: Colors.shared.midnightBlue });
    expect(hero.tileColor).toBe(Colors.dark.gold);
    expect(hero.badgeLabel).toBe('Thu 12 – Sun 15 Nov');
    expect(hero.badgeIcon).toBe('calendar-outline');
    expect(hero.badgeFill).toBe(DETAIL_HERO_BADGE_COLORS.fill);
    expect(hero.badgeForeground).toBe(DETAIL_HERO_BADGE_COLORS.foreground);
    // The 87.5% Travel limit makes the plan Watch (2026-11-24 ruling); D2 draws On track.
    expect(hero.tag).toEqual(
      heroStatusTag(Strings.budgetPlansStatusWatch, 'trending-up', Colors.dark.gold),
    );
    expect(hero.overline).toBe(Strings.budgetPlansHeroLeftOf(formatAmount(5000)));
    expect(hero.amountValue).toBe('1,100');
    expect(hero.amountCode).toBe(egp);
    expect(hero.amountColor).toBe(CoreTokens.text1);
    expect(hero.amountAccessibilityLabel).toBe(`1,100 ${egp}`);
    expect(hero.figures).toEqual([
      { label: Strings.budgetPlansDetailAssigned, value: formatAmount(3000) },
      { label: Strings.budgetPlansDetailFlexible, value: formatAmount(2000) },
      { label: Strings.budgetPlansSummarySpent, value: formatAmount(3900) },
    ]);
    expect(hero.bar).toEqual({ share: 0.78, color: Colors.dark.budgetSteady, tickShare: 0.75 });
    expect(hero.caption).toEqual(Strings.budgetPlansHeroUsedLine(78, 3, 4));
    expect(hero.captionEnd).toEqual(
      Strings.budgetPlansHeroPaceAhead(3, Strings.budgetPlansEndsTomorrow),
    );
  });

  it('a plan over its total reads Over by, the overage in negative, a full budgetOver bar and the Over tag', () => {
    const hero = heroOf(build({ spend: { cat_travel: 1750, cat_food: 650, cat_home: 2860 } }));

    expect(hero.overline).toBe(Strings.budgetPlansHeroOverBy);
    expect(hero.amountValue).toBe('260');
    expect(hero.amountCode).toBe(egp);
    expect(hero.amountColor).toBe(Colors.dark.negative);
    expect(hero.amountAccessibilityLabel).toBe(
      Strings.budgetCategoryDetailHeroOverA11y(`260 ${egp}`),
    );
    expect(hero.bar?.share).toBe(1);
    expect(hero.bar?.color).toBe(Colors.dark.budgetOver);
    expect(hero.tag).toEqual(
      heroStatusTag(Strings.budgetPlansStatusOver, 'alert-circle', Colors.dark.negative),
    );
  });

  it.each([
    [7400, 'under'],
    [7600, 'ahead'],
    [7500, 'even'],
  ] as const)('a day-3-of-4 plan at %d of 10,000 spent reads its pace %s', (spent, pace) => {
    const hero = heroOf(
      build({ totalAmount: 10000, limits: { cat_home: null }, spend: { cat_home: spent } }),
    );
    const timing = Strings.budgetPlansEndsTomorrow;
    const expected = {
      under: Strings.budgetPlansHeroPaceUnder(1, timing),
      ahead: Strings.budgetPlansHeroPaceAhead(1, timing),
      even: Strings.budgetPlansHeroOnPace(timing),
    }[pace];

    expect(hero.captionEnd).toEqual(expected);
    expect(hero.tag?.badgeLabel).toBe(Strings.budgetPlansStatusOnTrack);
  });

  it('a one-day plan reads day 1 of 1, ends today, with its tick at the end', () => {
    const hero = heroOf(
      build({
        startDate: '2026-11-12',
        endDate: '2026-11-12',
        today: '2026-11-12',
        totalAmount: 1000,
        limits: { cat_home: null },
        spend: { cat_home: 400 },
      }),
    );

    expect(hero.caption).toEqual(Strings.budgetPlansHeroUsedLine(40, 1, 1));
    expect(hero.captionEnd).toEqual(
      Strings.budgetPlansHeroPaceUnder(60, Strings.budgetPlansEndsToday),
    );
    expect(hero.bar?.tickShare).toBe(1);
  });

  it('the D2 plan rebuilt the next day reads day 4 of 4, its tick at 1 and ends today', () => {
    const hero = heroOf(build({ today: '2026-11-15' }));

    expect(hero.caption).toEqual(Strings.budgetPlansHeroUsedLine(78, 4, 4));
    expect(hero.bar?.tickShare).toBe(1);
    expect(hero.captionEnd).toEqual(
      Strings.budgetPlansHeroPaceUnder(22, Strings.budgetPlansEndsToday),
    );
  });

  it('open across midnight: the 3-day seed moves from Watch, 13 pts ahead to On track, 20 pts under', () => {
    const onDay = (today: string) =>
      heroOf(
        build({
          startDate: '2026-11-12',
          endDate: '2026-11-14',
          today,
          totalAmount: 3000,
          limits: { cat_home: null },
          spend: { cat_home: 2400 },
        }),
      );
    const dayTwo = onDay('2026-11-13');
    const dayThree = onDay('2026-11-14');

    expect(dayTwo.tag?.badgeLabel).toBe(Strings.budgetPlansStatusWatch);
    expect(dayTwo.caption).toEqual(Strings.budgetPlansHeroUsedLine(80, 2, 3));
    expect(dayTwo.captionEnd).toEqual(
      Strings.budgetPlansHeroPaceAhead(13, Strings.budgetPlansEndsTomorrow),
    );
    expect(dayThree.tag?.badgeLabel).toBe(Strings.budgetPlansStatusOnTrack);
    expect(dayThree.caption).toEqual(Strings.budgetPlansHeroUsedLine(80, 3, 3));
    expect(dayThree.captionEnd).toEqual(
      Strings.budgetPlansHeroPaceUnder(20, Strings.budgetPlansEndsToday),
    );
    expect(dayThree.bar?.tickShare).toBe(1);
    expect(dayTwo.bar?.tickShare).toBeCloseTo(2 / 3);
  });

  it('a float tie at the total is not over: Left of, a full bar in the band colour, 100% used', () => {
    const spent = 0.1 + 0.2;
    const hero = heroOf(
      build({ totalAmount: 0.3, limits: { cat_home: null }, spend: { cat_home: spent } }),
    );

    expect(hero.overline).toBe(
      Strings.budgetPlansHeroLeftOf(formatDisplayAmountParts(0.3, Currency.EGP).text),
    );
    expect(hero.amountColor).toBe(CoreTokens.text1);
    expect(hero.bar?.share).toBe(1);
    expect(hero.bar?.color).toBe(budgetBandColor(spent, 0.3));
    expect(hero.caption).toEqual(Strings.budgetPlansHeroUsedLine(100, 3, 4));
  });

  it('every lifecycle carries the hero', () => {
    const heroDrawn = (today: string) => build({ today }).detail.hero !== undefined;

    expect({
      upcoming: heroDrawn('2026-11-10'),
      active: heroDrawn('2026-11-14'),
      ended: heroDrawn('2026-11-20'),
    }).toEqual({ upcoming: true, active: true, ended: true });
  });
});

const ma327Categories: Category[] = [
  ...categories,
  { ...categories[0], id: 'cat_home', name: 'Home', icon: 'home', sort_order: 3 },
  {
    ...categories[0],
    id: 'cat_groceries',
    name: 'Groceries',
    icon: 'cart',
    color: '#33AA55',
    sort_order: 4,
  },
  {
    ...categories[0],
    id: 'cat_shopping',
    name: 'Shopping',
    icon: 'shopping',
    color: '#AA55FF',
    sort_order: 5,
  },
  {
    ...categories[0],
    id: 'cat_utilities',
    name: 'Utilities',
    icon: 'flash',
    color: '#FFCC00',
    sort_order: 6,
  },
  { ...categories[0], id: 'cat_dusk', name: 'Dusk', icon: 'weather-night', color: '#2A3A4F' },
];

function buildMa327Row({
  startDate = '2026-07-08',
  endDate = '2026-07-18',
  today = '2026-07-13',
  totalAmount = 5000,
  limits,
  spend,
}: {
  startDate?: string;
  endDate?: string;
  today?: string;
  totalAmount?: number;
  limits: Record<string, number | null>;
  spend: Record<string, number>;
}): PlanRow {
  return buildSpendingPlanRows({
    plans: [
      planFixture({
        startDate,
        endDate,
        totalAmount,
        categoryRows: Object.entries(limits).map(([categoryId, allocated]) => ({
          plan_id: 'plan_trip',
          category_id: categoryId,
          allocated_amount: allocated,
        })),
      }),
    ],
    categories: ma327Categories,
    spendByPlanId: { plan_trip: spend },
    selectedMonth: startDate.slice(0, 7),
    today,
  })[0];
}

describe('upcoming and ended plans draw their heroes (MA-327)', () => {
  function heroOf(row: PlanRow) {
    const hero = row.detail.hero;
    if (hero === undefined) throw new Error('Expected the hero');
    return hero;
  }

  const s18 = (today = '2026-11-14') =>
    heroOf(
      buildMa327Row({
        startDate: '2026-11-16',
        endDate: '2026-11-22',
        today,
        totalAmount: 3500,
        limits: { cat_home: null },
        spend: {},
      }),
    );

  const ended = (spent: number, today = '2026-11-14') =>
    heroOf(
      buildMa327Row({
        startDate: '2026-11-01',
        endDate: '2026-11-05',
        today,
        totalAmount: 2000,
        limits: { cat_home: null },
        spend: { cat_home: spent },
      }),
    );

  it('frame S18: Planned over the total, the grey track at 0, the day count, the start and the per-day amount', () => {
    const hero = s18();

    expect(hero.tag).toEqual(
      heroStatusTag(Strings.budgetPlansStatusUpcoming, 'calendar-outline', Colors.dark.text2),
    );
    expect(hero.tag?.badgeLabel).toBe(Strings.budgetPlansStatusUpcoming);
    expect(hero.overline).toBe(Strings.budgetPlansHeroPlanned);
    expect(hero.amountValue).toBe('3,500');
    expect(hero.amountColor).toBe(CoreTokens.text1);
    expect(hero.figures).toEqual([
      { label: Strings.budgetPlansDetailAssigned, value: formatAmount(0) },
      { label: Strings.budgetPlansDetailFlexible, value: formatAmount(3500) },
      { label: Strings.budgetPlansSummarySpent, value: formatAmount(0) },
    ]);
    expect(hero.bar).toEqual({ share: 0, color: Colors.dark.text2 });
    expect(hero.bar).not.toHaveProperty('tickShare');
    expect(hero.caption).toEqual(
      Strings.budgetPlansHeroUpcomingLine(7, Strings.budgetPlansStartsInDays(2)),
    );
    expect(hero.captionEnd).toEqual(Strings.budgetPlansHeroPerDay('500'));
  });

  it('the S18 plan seen the day before it starts reads starts tomorrow', () => {
    expect(s18('2026-11-15').caption).toEqual(
      Strings.budgetPlansHeroUpcomingLine(7, Strings.budgetPlansStartsTomorrow),
    );
  });

  it('a one-day upcoming plan seen the day before reads 1 day · starts tomorrow', () => {
    const hero = heroOf(
      buildMa327Row({
        startDate: '2026-11-16',
        endDate: '2026-11-16',
        today: '2026-11-15',
        totalAmount: 500,
        limits: { cat_home: null },
        spend: {},
      }),
    );

    expect(hero.caption).toEqual([{ strong: '1 day' }, ' · starts tomorrow']);
  });

  it('a one-day ended plan reads its percent used over 1 day', () => {
    const hero = heroOf(
      buildMa327Row({
        startDate: '2026-11-10',
        endDate: '2026-11-10',
        today: '2026-11-14',
        totalAmount: 1000,
        limits: { cat_home: null },
        spend: { cat_home: 500 },
      }),
    );

    expect(hero.caption).toEqual([{ strong: '50%' }, ' used · 1 day']);
  });

  it.each([
    ['across the leap day', '2028-03-01', '2028-03-03', '2028-02-28', 'starts in 2 days'],
    ['across a 30-day month end', '2026-12-01', '2026-12-03', '2026-11-30', 'starts tomorrow'],
    ['across a 31-day month end', '2026-11-01', '2026-11-03', '2026-10-31', 'starts tomorrow'],
  ])('counts the start %s', (_case, startDate, endDate, today, expected) => {
    const hero = heroOf(
      buildMa327Row({
        startDate,
        endDate,
        today,
        totalAmount: 900,
        limits: { cat_home: null },
        spend: {},
      }),
    );
    const timing =
      expected === 'starts tomorrow'
        ? Strings.budgetPlansStartsTomorrow
        : Strings.budgetPlansStartsInDays(2);

    expect(hero.caption).toEqual(Strings.budgetPlansHeroUpcomingLine(3, timing));
  });

  it('frame S19: an ended plan over its total reads Over by, a full over bar with no tick, 113% over 5 days, ended 9 days ago and Over', () => {
    const hero = ended(2260);

    expect(hero.overline).toBe(Strings.budgetPlansHeroOverBy);
    expect(hero.amountColor).toBe(Colors.dark.negative);
    expect(hero.bar).toEqual({ share: 1, color: Colors.dark.budgetOver });
    expect(hero.bar).not.toHaveProperty('tickShare');
    expect(hero.caption).toEqual(Strings.budgetPlansHeroEndedUsedLine(113, 5));
    expect(hero.captionEnd).toEqual(Strings.budgetPlansHeroEndedDaysAgo(9));
    expect(hero.tag).toEqual(
      heroStatusTag(Strings.budgetPlansStatusOver, 'alert-circle', Colors.dark.negative),
    );
  });

  it('frame S29: an ended plan within its total keeps Left of, its band colour and the Within limit tag', () => {
    const hero = ended(1480);

    expect(hero.overline).toBe(Strings.budgetPlansHeroLeftOf(formatAmount(2000)));
    expect(hero.amountColor).toBe(CoreTokens.text1);
    expect(hero.tag).toEqual(
      heroStatusTag(Strings.budgetPlansHeroWithinLimit, 'check-circle', Colors.dark.positive),
    );
    expect(hero.tag?.badgeLabel).toBe(Strings.budgetPlansHeroWithinLimit);
    expect(hero.bar?.share).toBeCloseTo(0.74);
    expect(hero.bar?.color).toBe(budgetBandColor(1480, 2000));
    expect(hero.bar).not.toHaveProperty('tickShare');
    expect(hero.caption).toEqual(Strings.budgetPlansHeroEndedUsedLine(74, 5));
  });

  it('an ended plan seen the day after its end reads Ended yesterday', () => {
    expect(ended(1480, '2026-11-06').captionEnd).toBe(Strings.budgetPlansHeroEndedYesterday);
  });

  it('open across midnight: the S18 start count and the S19 days since recompute for the new day', () => {
    expect(s18('2026-11-14').caption).toEqual(
      Strings.budgetPlansHeroUpcomingLine(7, Strings.budgetPlansStartsInDays(2)),
    );
    expect(s18('2026-11-15').caption).toEqual(
      Strings.budgetPlansHeroUpcomingLine(7, Strings.budgetPlansStartsTomorrow),
    );
    expect(ended(2260, '2026-11-14').captionEnd).toEqual(Strings.budgetPlansHeroEndedDaysAgo(9));
    expect(ended(2260, '2026-11-15').captionEnd).toEqual(Strings.budgetPlansHeroEndedDaysAgo(10));
  });
});

describe('plan detail draws the Flexible card (MA-327)', () => {
  function flexibleCardOf(row: PlanRow) {
    const card = row.detail.flexibleCard;
    if (card === undefined) throw new Error('Expected a Flexible card');
    return card;
  }

  const upcomingDates = { startDate: '2026-07-18', endDate: '2026-07-21', today: '2026-07-13' };

  it('frame D2: the flexible amount, the category with no limit and its spending, and what is left', () => {
    const card = flexibleCardOf(
      buildMa327Row({
        limits: { cat_travel: 2000, cat_food: 1000, cat_shopping: null },
        spend: { cat_travel: 1750, cat_food: 650, cat_shopping: 1500 },
      }),
    );

    expect(card.amountLabel).toBe(formatCurrencyAmount(2000, Currency.EGP));
    expect(card.rows).toHaveLength(1);
    expect(card.rows[0]).toMatchObject({
      kind: 'unallocated',
      categoryId: 'cat_shopping',
      categoryName: 'Shopping',
      amountLabel: formatAmount(1500),
      amountCode: CURRENCY_CONFIG[Currency.EGP].code,
      supportingLabel: Strings.budgetPlansDetailNoCategoryLimit,
      balanceLabel: Strings.budgetPlansSpentStatus,
      balanceColor: Colors.dark.text2,
      ...resolveCategoryTileColors('#AA55FF'),
    });
    expect(card.footer).toEqual({
      label: Strings.budgetPlansDetailFlexibleLeft,
      amountLabel: formatAmount(500),
      amountColor: CoreTokens.text1,
    });
  });

  it('frame S19: rows run by spending, largest first, and spending past the flexible amount reads Over in flexible', () => {
    const card = flexibleCardOf(
      buildMa327Row({
        startDate: '2026-11-01',
        endDate: '2026-11-05',
        today: '2026-11-14',
        totalAmount: 2000,
        limits: { cat_utilities: null, cat_food: 1200, cat_shopping: null, cat_groceries: null },
        spend: { cat_food: 1280, cat_groceries: 420, cat_shopping: 360, cat_utilities: 200 },
      }),
    );

    expect(card.rows.map((row) => row.categoryName)).toEqual([
      'Groceries',
      'Shopping',
      'Utilities',
    ]);
    expect(card.footer).toEqual({
      label: Strings.budgetPlansDetailFlexibleOver,
      amountLabel: formatAmount(180),
      amountColor: Colors.dark.negative,
    });
  });

  it('orders equal spending by name', () => {
    const card = flexibleCardOf(
      buildMa327Row({
        limits: { cat_utilities: null, cat_shopping: null, cat_groceries: null, cat_food: null },
        spend: { cat_utilities: 300, cat_shopping: 300, cat_groceries: 300, cat_food: 500 },
      }),
    );

    expect(card.rows.map((row) => row.categoryName)).toEqual([
      'Food',
      'Groceries',
      'Shopping',
      'Utilities',
    ]);
  });

  it('frame S30: a flexible amount of 0 with spending in a category with no limit reads Over in flexible', () => {
    const card = flexibleCardOf(
      buildMa327Row({
        totalAmount: 3000,
        limits: { cat_food: 2000, cat_travel: 1000, cat_shopping: null },
        spend: { cat_shopping: 300 },
      }),
    );

    expect(card.amountLabel).toBe(formatCurrencyAmount(0, Currency.EGP));
    expect(card.footer).toEqual({
      label: Strings.budgetPlansDetailFlexibleOver,
      amountLabel: formatAmount(300),
      amountColor: Colors.dark.negative,
    });
  });

  it('a plan with a flexible amount of 0 and every category limited has no flexibleCard key, and with one category with no limit a card', () => {
    const limited = buildMa327Row({
      totalAmount: 3000,
      limits: { cat_food: 2000, cat_travel: 1000 },
      spend: { cat_food: 500 },
    });
    const withUnlimited = buildMa327Row({
      totalAmount: 3000,
      limits: { cat_food: 2000, cat_travel: 1000, cat_shopping: null },
      spend: { cat_food: 500 },
    });

    expect(limited.detail).not.toHaveProperty('flexibleCard');
    expect(withUnlimited.detail).toHaveProperty('flexibleCard');
  });

  it('with every category limited and 2,000 flexible the card has no rows and the Left in flexible line', () => {
    const card = flexibleCardOf(
      buildMa327Row({
        limits: { cat_food: 2000, cat_travel: 1000 },
        spend: { cat_food: 500 },
      }),
    );

    expect(card.rows).toEqual([]);
    expect(card.footer).toEqual({
      label: Strings.budgetPlansDetailFlexibleLeft,
      amountLabel: formatAmount(2000),
      amountColor: CoreTokens.text1,
    });
  });

  it('an upcoming plan with a category with no limit lists its rows with no footer key', () => {
    const card = flexibleCardOf(
      buildMa327Row({
        ...upcomingDates,
        limits: { cat_food: 1000, cat_shopping: null },
        spend: {},
      }),
    );

    expect(card.rows.map((row) => row.categoryId)).toEqual(['cat_shopping']);
    expect(card).not.toHaveProperty('footer');
  });

  it('an upcoming plan with every category limited shows Left in flexible at the whole flexible amount', () => {
    const card = flexibleCardOf(
      buildMa327Row({
        ...upcomingDates,
        limits: { cat_food: 2000, cat_travel: 1000 },
        spend: {},
      }),
    );

    expect(card.amountLabel).toBe(formatCurrencyAmount(2000, Currency.EGP));
    expect(card.rows).toEqual([]);
    expect(card.footer).toEqual({
      label: Strings.budgetPlansDetailFlexibleLeft,
      amountLabel: formatAmount(2000),
      amountColor: CoreTokens.text1,
    });
  });

  it('decides over to the cent: 1,000.01 against 1,000 is Over, 0.1 + 0.2 against 0.3 is Left', () => {
    const overByACent = flexibleCardOf(
      buildMa327Row({
        totalAmount: 3000,
        limits: { cat_food: 2000, cat_shopping: null },
        spend: { cat_shopping: 1000.01 },
      }),
    );
    const floatTie = flexibleCardOf(
      buildMa327Row({
        totalAmount: 0.3,
        limits: { cat_shopping: null },
        spend: { cat_shopping: 0.1 + 0.2 },
      }),
    );

    expect(overByACent.footer).toMatchObject({
      label: Strings.budgetPlansDetailFlexibleOver,
      amountColor: Colors.dark.negative,
    });
    expect(floatTie.footer).toMatchObject({
      label: Strings.budgetPlansDetailFlexibleLeft,
      amountColor: CoreTokens.text1,
    });
  });

  it('clamps a negative buffer to a 0 header', () => {
    const card = flexibleCardOf(
      buildMa327Row({
        totalAmount: 1000,
        limits: { cat_food: 1500, cat_shopping: null },
        spend: { cat_shopping: 100 },
      }),
    );

    expect(card.amountLabel).toBe(formatCurrencyAmount(0, Currency.EGP));
    expect(card.footer).toEqual({
      label: Strings.budgetPlansDetailFlexibleOver,
      amountLabel: formatAmount(100),
      amountColor: Colors.dark.negative,
    });
  });

  it('gives a category coloured near the surface a glyph that clears 3:1 on its tile', () => {
    const [row] = flexibleCardOf(
      buildMa327Row({ limits: { cat_dusk: null }, spend: { cat_dusk: 50 } }),
    ).rows;

    expect(row.tileFill).toBe(resolveCategoryTileColors('#2A3A4F').tileFill);
    expect(contrastRatio(row.glyphColor, row.tileFill)).toBeGreaterThanOrEqual(
      NON_TEXT_MIN_CONTRAST_RATIO,
    );
  });
});
