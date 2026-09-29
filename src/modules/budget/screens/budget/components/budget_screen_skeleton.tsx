import { Card, SkeletonGroup } from 'heroui-native';
import { View, useWindowDimensions } from 'react-native';

import { resolveSkeletonBarHeight } from '@/components/ui/skeleton_bar.geometry';
import { BudgetGroup } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Size, Spacing, Type } from '@/constants/theme';
import type { BudgetRuleLensVM } from '@/modules/budget/screens/budget/budget_buckets.helpers';
import type { CategoryBudgetRowVM } from '@/modules/budget/screens/budget/budget_categories.types';

interface BudgetScreenSkeletonProps {
  variant?: 'categories' | 'plans' | 'fiftythirty';
  preserveLayout?: boolean;
  categorySummaryHasPlan?: boolean;
  categoryRows?: CategoryBudgetRowVM[];
  expandedCategoryId?: string;
  planRowCount?: number;
  ruleLens?: BudgetRuleLensVM;
  expandedBudgetGroup?: BudgetGroup;
}

/** A bar standing for text, a button, a chip or a pill; `height` is the raw px its `h-*` class carried. */
function ScaledBar({
  height,
  className,
}: {
  height: number;
  className: string;
}): React.ReactElement {
  const { fontScale } = useWindowDimensions();
  return (
    <SkeletonGroup.Item
      className={className}
      style={{ height: resolveSkeletonBarHeight(height, fontScale) }}
    />
  );
}

export function BudgetScreenSkeleton({
  variant = 'categories',
  preserveLayout = false,
  categorySummaryHasPlan = true,
  categoryRows = [],
  expandedCategoryId,
  planRowCount = 0,
  ruleLens,
  expandedBudgetGroup,
}: BudgetScreenSkeletonProps): React.ReactElement {
  if (variant === 'plans') {
    return (
      <PlansSkeleton rowCount={preserveLayout || planRowCount > 0 ? planRowCount : undefined} />
    );
  }
  if (variant === 'fiftythirty') {
    return (
      <RuleLensSkeleton
        vm={preserveLayout ? ruleLens : undefined}
        expandedBudgetGroup={preserveLayout ? expandedBudgetGroup : undefined}
      />
    );
  }

  const hasKnownLayout = preserveLayout || categoryRows.length > 0;
  const renderedRows = hasKnownLayout ? categoryRows : [];
  const hasPlan = hasKnownLayout ? categorySummaryHasPlan : true;

  return (
    <View testID="budget-screen-skeleton" accessibilityLabel={Strings.loadingBudgetA11y}>
      <SkeletonGroup isLoading isSkeletonOnly>
        <Card
          testID="categories-summary-skeleton"
          className="bg-surface border-border mx-4 mt-3 rounded-2xl border p-0"
          style={{ boxShadow: 'none' }}
        >
          <Card.Body className="px-2 py-1.5">
            <ScaledBar height={13} className="w-[38%] rounded-lg" />
            <View className="mt-0.5 flex-row items-center justify-between gap-3">
              <ScaledBar height={hasPlan ? 31 : 18} className="w-[45%] rounded-lg" />
              <ScaledBar height={13} className="w-[22%] rounded-lg" />
            </View>
            {hasPlan ? (
              <View testID="categories-summary-plan-skeleton">
                <View className="mt-0.5 flex-row items-center justify-between gap-3">
                  <ScaledBar height={15} className="w-1/2 rounded-lg" />
                  <ScaledBar height={15} className="w-[18%] rounded-lg" />
                </View>
                <SkeletonGroup.Item className="mt-1 h-1 w-full rounded-full" />
              </View>
            ) : null}
            <View className="border-border mt-1.5 flex-row items-stretch border-t pt-1">
              {[0, 1, 2].map((metric) => (
                <View key={metric} className="flex-1 items-center justify-center gap-0.5 px-1">
                  <ScaledBar height={11.5} className="w-[45%] rounded-lg" />
                  <ScaledBar height={15} className="w-[68%] rounded-lg" />
                </View>
              ))}
            </View>
            {hasPlan ? (
              <View
                testID="categories-summary-status-skeleton"
                className="mt-1.5 flex-row items-center"
              >
                {[0, 1, 2].map((status) => (
                  <View
                    key={status}
                    className="min-h-8 flex-1 flex-row items-center justify-center gap-0.5"
                  >
                    <SkeletonGroup.Item className="h-4 w-4 rounded-full" />
                    <ScaledBar height={13} className="w-10 rounded-lg" />
                  </View>
                ))}
              </View>
            ) : null}
          </Card.Body>
        </Card>

        <View className="mx-4 mt-2 flex-row gap-2">
          <ScaledBar height={36} className="flex-1 rounded-lg" />
          <ScaledBar height={36} className="flex-1 rounded-lg" />
        </View>

        <ScaledBar height={11} className="mx-4 mt-4 mb-1 w-28 rounded-md" />
        {!hasKnownLayout ? (
          <ColdContentSkeleton />
        ) : renderedRows.length === 0 ? (
          <View testID="budget-empty-state-skeleton" className="min-h-80 items-center pt-16">
            <SkeletonGroup.Item className="h-16 w-16 rounded-full" />
            <ScaledBar height={18} className="mt-4 w-40 rounded-lg" />
            <ScaledBar height={14} className="mt-2 w-56 rounded-lg" />
          </View>
        ) : (
          renderedRows.map((row, index) => {
            const categoryRow = typeof row === 'number' ? undefined : row;
            const isExpanded = categoryRow?.categoryId === expandedCategoryId;
            return (
              <View key={categoryRow?.categoryId ?? index}>
                <CategoryRowSkeleton index={index} />
                {categoryRow && isExpanded
                  ? categoryRow.budgets.map((budget) => <NamedBudgetRowSkeleton key={budget.id} />)
                  : null}
                {categoryRow && isExpanded && categoryRow.unassignedSpend > 0 ? (
                  <NamedBudgetRowSkeleton />
                ) : null}
                {isExpanded ? (
                  <View
                    testID="category-details-row-skeleton"
                    className="min-h-11 flex-row items-center gap-2 px-4"
                  >
                    <View className="items-center" style={{ width: Size.budgetCategoryColumn }}>
                      <SkeletonGroup.Item className="h-8 w-8 rounded-full" />
                    </View>
                    <ScaledBar height={11} className="w-36 rounded-md" />
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </SkeletonGroup>
    </View>
  );
}

function RuleLensSkeleton({
  vm,
  expandedBudgetGroup,
}: {
  vm: BudgetRuleLensVM | undefined;
  expandedBudgetGroup: BudgetGroup | undefined;
}): React.ReactElement {
  const expandedBucket = vm?.buckets.find((bucket) => bucket.group === expandedBudgetGroup);

  return (
    <View testID="budget-screen-skeleton" accessibilityLabel={Strings.loadingBudgetA11y}>
      <SkeletonGroup isLoading isSkeletonOnly>
        <Card
          className="bg-surface border-border mx-4 mt-3 rounded-2xl border p-0"
          style={{ boxShadow: 'none' }}
        >
          <Card.Body className="px-2 py-1.5">
            <View className="flex-row items-center justify-between gap-2">
              <ScaledBar height={13} className="w-[38%] rounded-lg" />
              <ScaledBar height={13} className="w-[18%] rounded-lg" />
            </View>
            <View className="mt-0.5 flex-row items-center justify-between gap-3">
              <ScaledBar height={31} className="w-[48%] rounded-lg" />
              <ScaledBar height={28} className="w-[32%] rounded-lg" />
            </View>
            <View className="mt-0.5 flex-row items-center justify-between gap-3">
              <ScaledBar
                height={vm?.summary.hasIncome && vm.summary.totalPlanned > 0 ? 15 : 30}
                className={
                  vm?.summary.hasIncome && vm.summary.totalPlanned > 0
                    ? 'w-1/2 rounded-lg'
                    : 'w-[68%] rounded-lg'
                }
              />
              <ScaledBar height={15} className="w-[18%] rounded-lg" />
            </View>
            <SkeletonGroup.Item className="mt-1 h-1 w-full rounded-full" />
            <View className="border-border mt-1.5 flex-row items-stretch border-t pt-1">
              {[0, 1, 2].map((metric) => (
                <View key={metric} className="flex-1 items-center gap-0.5 px-1">
                  <ScaledBar height={11.5} className="w-[45%] rounded-lg" />
                  <ScaledBar height={15} className="w-[68%] rounded-lg" />
                </View>
              ))}
            </View>
            <View className="mt-1.5 flex-row items-center">
              {[0, 1, 2].map((status) => (
                <View key={status} className="min-h-8 flex-1 flex-row justify-center gap-0.5">
                  <SkeletonGroup.Item className="h-4 w-4 rounded-full" />
                  <ScaledBar height={13} className="w-12 rounded-lg" />
                </View>
              ))}
            </View>
          </Card.Body>
        </Card>
        <View className="mx-4 mt-4 mb-1 flex-row justify-between">
          <ScaledBar height={11} className="w-24 rounded-md" />
          <ScaledBar height={11} className="w-28 rounded-md" />
        </View>
        <Card
          className="bg-surface border-border mx-4 rounded-2xl border p-0"
          style={{ boxShadow: 'none' }}
        >
          <Card.Body className="p-0">
            {Object.values(BudgetGroup).map((group) => (
              <View key={group}>
                <View
                  className="border-separator flex-row items-center gap-2 border-b px-3 py-1.5"
                  style={{ minHeight: Size.budgetRuleRowMinHeight }}
                >
                  <SkeletonGroup.Item className="h-[42px] w-[42px] rounded-full" />
                  <View className="flex-1 gap-1.5">
                    <ScaledBar height={15} className="w-32 rounded-md" />
                    <ScaledBar height={11} className="w-48 rounded-md" />
                  </View>
                  <View className="items-end gap-1" style={{ width: Size.budgetRuleValueColumn }}>
                    <ScaledBar height={15} className="w-12 rounded-md" />
                    <ScaledBar height={10} className="w-10 rounded-md" />
                  </View>
                  <View style={{ width: Size.budgetRuleChevronColumn }} className="items-end">
                    <SkeletonGroup.Item className="h-4 w-4 rounded-md" />
                  </View>
                </View>
                {expandedBudgetGroup === group ? (
                  <View testID="rule-bucket-expanded-skeleton">
                    <ScaledBar height={36} className="w-full rounded-none" />
                    <ScaledBar height={32} className="mx-3 my-2 rounded-lg" />
                    {expandedBucket?.contributors.map((contributor) => (
                      <View
                        key={contributor.categoryId}
                        testID="rule-contributor-skeleton"
                        className="border-separator min-h-12 flex-row items-center gap-2 border-b px-3 py-1.5"
                      >
                        <View className="items-center" style={{ width: Size.budgetCategoryColumn }}>
                          <SkeletonGroup.Item
                            className="rounded-full"
                            style={{ width: Size.budgetNamedRing, height: Size.budgetNamedRing }}
                          />
                        </View>
                        <View className="flex-1 gap-1">
                          <ScaledBar height={12} className="w-28 rounded-md" />
                          <ScaledBar height={10} className="w-32 rounded-md" />
                        </View>
                        <View className="items-end gap-1">
                          <ScaledBar height={12} className="w-20 rounded-md" />
                          <ScaledBar height={10} className="w-16 rounded-md" />
                        </View>
                      </View>
                    ))}
                    <ScaledBar height={40} className="w-full rounded-none" />
                  </View>
                ) : null}
              </View>
            ))}
          </Card.Body>
        </Card>
        {vm?.notGrouped ? (
          <View className="border-border bg-surface mx-4 mt-2 min-h-12 flex-row items-center gap-2 rounded-xl border px-3 py-2">
            <SkeletonGroup.Item className="h-8 w-8 rounded-full" />
            <View className="flex-1 gap-1">
              <ScaledBar height={12} className="w-24 rounded-md" />
              <ScaledBar height={10} className="w-40 rounded-md" />
            </View>
            <View className="items-end gap-1">
              <ScaledBar height={12} className="w-24 rounded-md" />
              <ScaledBar height={10} className="w-20 rounded-md" />
            </View>
          </View>
        ) : null}
      </SkeletonGroup>
    </View>
  );
}

function CategoryRowSkeleton({ index }: { index: number }): React.ReactElement {
  return (
    <View
      testID="budget-row-skeleton"
      className="border-separator flex-row items-center gap-2.5 border-b px-4 py-2"
      // Runtime token: an arbitrary Tailwind value cannot carry `ms()` scaling.
      style={{ minHeight: Size.listRowHeight }}
    >
      <View className="items-center" style={{ width: Size.budgetCategoryColumn }}>
        <SkeletonGroup.Item className="h-[42px] w-[42px] rounded-full" />
      </View>
      <View className="flex-1 gap-1.5">
        <ScaledBar
          height={15}
          className={index % 2 === 0 ? 'w-36 rounded-md' : 'w-28 rounded-md'}
        />
        <ScaledBar height={11} className="w-40 rounded-md" />
      </View>
      <View className="items-end gap-1">
        <ScaledBar height={16} className="w-14 rounded-md" />
        <ScaledBar height={10} className="w-10 rounded-md" />
      </View>
      <SkeletonGroup.Item className="h-4 w-4 rounded-md" />
    </View>
  );
}

function NamedBudgetRowSkeleton(): React.ReactElement {
  return (
    <View
      testID="named-budget-row-skeleton"
      className="border-separator min-h-13 flex-row items-center gap-2.5 border-b px-4 py-1.5"
    >
      <View className="items-center" style={{ width: Size.budgetCategoryColumn }}>
        <SkeletonGroup.Item className="h-[34px] w-[34px] rounded-full" />
      </View>
      <View className="flex-1 gap-1">
        <ScaledBar height={12} className="w-28 rounded-md" />
        <ScaledBar height={10} className="w-36 rounded-md" />
      </View>
      <ScaledBar height={13} className="w-12 rounded-md" />
      <SkeletonGroup.Item className="h-11 w-11 rounded-md" />
    </View>
  );
}

function PlansSkeleton({ rowCount }: { rowCount: number | undefined }): React.ReactElement {
  const rows = Array.from({ length: rowCount ?? 0 }, (_, index) => index);
  return (
    <View testID="budget-screen-skeleton" accessibilityLabel={Strings.loadingBudgetA11y}>
      <SkeletonGroup isLoading isSkeletonOnly>
        <Card
          testID="plans-summary-skeleton"
          className="bg-surface border-border mx-4 mt-3 rounded-2xl border p-0"
          style={{ boxShadow: 'none' }}
        >
          <Card.Body className="px-2 py-1.5">
            <ScaledBar height={13} className="w-[38%] rounded-lg" />
            <View className="mt-0.5 flex-row items-center justify-between gap-3">
              <ScaledBar height={31} className="w-[45%] rounded-lg" />
              <ScaledBar height={28} className="w-[30%] rounded-full" />
            </View>
            <View className="mt-0.5 flex-row items-center justify-between gap-3">
              <ScaledBar height={15} className="w-1/2 rounded-lg" />
              <ScaledBar height={15} className="w-[18%] rounded-lg" />
            </View>
            <SkeletonGroup.Item className="mt-1 h-1 w-full rounded-full" />
            <View className="border-border mt-1.5 flex-row items-stretch border-t pt-1">
              {[0, 1, 2].map((metric) => (
                <View key={metric} className="flex-1 items-center justify-center gap-0.5 px-1">
                  <ScaledBar height={11.5} className="w-[45%] rounded-lg" />
                  <ScaledBar height={15} className="w-[68%] rounded-lg" />
                </View>
              ))}
            </View>
            <View className="mt-1.5 flex-row items-center">
              {[0, 1, 2, 3].map((status) => (
                <View
                  key={status}
                  className="min-h-8 flex-1 flex-row items-center justify-center gap-0.5"
                >
                  <SkeletonGroup.Item className="h-4 w-4 rounded-full" />
                  <ScaledBar height={13} className="w-10 rounded-lg" />
                </View>
              ))}
            </View>
          </Card.Body>
        </Card>

        <View className="mx-4 mt-3">
          <ScaledBar height={38} className="w-full rounded-lg" />
        </View>

        {rowCount === undefined ? (
          <ColdContentSkeleton />
        ) : rows.length === 0 ? (
          <View testID="plans-empty-state-skeleton" className="min-h-[300px] items-center pt-16">
            <SkeletonGroup.Item className="h-16 w-16 rounded-full" />
            <ScaledBar height={18} className="mt-4 w-40 rounded-lg" />
            <ScaledBar height={14} className="mt-2 w-56 rounded-lg" />
          </View>
        ) : null}
        {rows.map((row) => (
          <Card
            key={row}
            testID="plan-card-skeleton"
            variant="default"
            className="bg-surface border-border mx-4 mt-3 overflow-hidden rounded-lg border px-2 py-1.5"
          >
            <Card.Header className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <ScaledBar
                    height={19}
                    className={row === 0 ? 'w-[52%] rounded-lg' : 'w-[40%] rounded-lg'}
                  />
                  <ScaledBar height={24} className="w-14 rounded-full" />
                </View>
                <ScaledBar height={13} className="mt-0.5 w-[72%] rounded-lg" />
              </View>
              <View className="items-end gap-0.5">
                <ScaledBar height={20} className="w-16 rounded-lg" />
                <ScaledBar height={11.5} className="w-12 rounded-lg" />
              </View>
            </Card.Header>
            <Card.Body className="mt-1">
              <View className="flex-row items-center justify-between gap-3">
                <ScaledBar height={14} className="w-[45%] rounded-lg" />
                <ScaledBar height={13} className="w-14 rounded-lg" />
              </View>
              <SkeletonGroup.Item className="mt-1 h-1 w-full rounded-full" />
              <ScaledBar height={13} className="mt-0.5 w-[32%] rounded-lg" />
              <View className="mt-1 flex-row gap-1">
                {[0, 1, 2].map((chip) => (
                  <ScaledBar key={chip} height={30} className="w-[84px] rounded-full" />
                ))}
              </View>
            </Card.Body>
            <Card.Footer className="border-border mt-1 flex-row items-center justify-between gap-3 border-t pt-0.5">
              <ScaledBar height={11.5} className="w-[45%] rounded-lg" />
              <SkeletonGroup.Item
                testID="plan-card-action-skeleton"
                className="h-6 w-6 rounded-lg"
              />
            </Card.Footer>
          </Card>
        ))}
      </SkeletonGroup>
    </View>
  );
}

function ColdContentSkeleton(): React.ReactElement {
  return (
    <View
      testID="budget-cold-content-skeleton"
      style={{
        minHeight: Size.budgetColdContentHeight,
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.sm,
      }}
    >
      {[0, 1, 2].map((row) => (
        <View
          key={row}
          className="border-separator border-b"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.sm,
            paddingVertical: Spacing.sm,
          }}
        >
          <SkeletonGroup.Item
            className="rounded-full"
            style={{ height: Size.budgetCategoryRing, width: Size.budgetCategoryRing }}
          />
          <View style={{ flex: 1, gap: Spacing.xxs }}>
            <ScaledBar height={Type.body} className="w-[45%] rounded-md" />
            <ScaledBar height={Type.caption} className="w-[65%] rounded-md" />
          </View>
          <ScaledBar height={Type.body} className="w-[18%] rounded-md" />
        </View>
      ))}
    </View>
  );
}
