import { Card, SkeletonGroup } from 'heroui-native';
import { View } from 'react-native';

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
          className="bg-surface border-border mx-4 mt-3 rounded-2xl border p-0 shadow-none"
        >
          <Card.Body className="px-2 py-1.5">
            <SkeletonGroup.Item className="h-[13px] w-[38%] rounded-lg" />
            <View className="mt-0.5 flex-row items-center justify-between gap-3">
              <SkeletonGroup.Item
                className={hasPlan ? 'h-[31px] w-[45%] rounded-lg' : 'h-[18px] w-[45%] rounded-lg'}
              />
              <SkeletonGroup.Item className="h-[13px] w-[22%] rounded-lg" />
            </View>
            {hasPlan ? (
              <View testID="categories-summary-plan-skeleton">
                <View className="mt-0.5 flex-row items-center justify-between gap-3">
                  <SkeletonGroup.Item className="h-[15px] w-1/2 rounded-lg" />
                  <SkeletonGroup.Item className="h-[15px] w-[18%] rounded-lg" />
                </View>
                <SkeletonGroup.Item className="mt-1 h-1 w-full rounded-full" />
              </View>
            ) : null}
            <View className="border-border mt-1.5 flex-row items-stretch border-t pt-1">
              {[0, 1, 2].map((metric) => (
                <View key={metric} className="flex-1 items-center justify-center gap-0.5 px-1">
                  <SkeletonGroup.Item className="h-[11.5px] w-[45%] rounded-lg" />
                  <SkeletonGroup.Item className="h-[15px] w-[68%] rounded-lg" />
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
                    <SkeletonGroup.Item className="h-[13px] w-10 rounded-lg" />
                  </View>
                ))}
              </View>
            ) : null}
          </Card.Body>
        </Card>

        <View className="mx-4 mt-2 flex-row gap-2">
          <SkeletonGroup.Item className="h-9 flex-1 rounded-lg" />
          <SkeletonGroup.Item className="h-9 flex-1 rounded-lg" />
        </View>

        <SkeletonGroup.Item className="mx-4 mt-4 mb-1 h-[11px] w-28 rounded-md" />
        {!hasKnownLayout ? (
          <ColdContentSkeleton />
        ) : renderedRows.length === 0 ? (
          <View testID="budget-empty-state-skeleton" className="min-h-80 items-center pt-16">
            <SkeletonGroup.Item className="h-16 w-16 rounded-full" />
            <SkeletonGroup.Item className="mt-4 h-[18px] w-40 rounded-lg" />
            <SkeletonGroup.Item className="mt-2 h-[14px] w-56 rounded-lg" />
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
                    <SkeletonGroup.Item className="h-[11px] w-36 rounded-md" />
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
        <Card className="bg-surface border-border mx-4 mt-3 rounded-2xl border p-0 shadow-none">
          <Card.Body className="px-2 py-1.5">
            <View className="flex-row items-center justify-between gap-2">
              <SkeletonGroup.Item className="h-[13px] w-[38%] rounded-lg" />
              <SkeletonGroup.Item className="h-[13px] w-[18%] rounded-lg" />
            </View>
            <View className="mt-0.5 flex-row items-center justify-between gap-3">
              <SkeletonGroup.Item className="h-[31px] w-[48%] rounded-lg" />
              <SkeletonGroup.Item className="h-7 w-[32%] rounded-lg" />
            </View>
            <View className="mt-0.5 flex-row items-center justify-between gap-3">
              <SkeletonGroup.Item
                className={
                  vm?.summary.hasIncome && vm.summary.totalPlanned > 0
                    ? 'h-[15px] w-1/2 rounded-lg'
                    : 'h-[30px] w-[68%] rounded-lg'
                }
              />
              <SkeletonGroup.Item className="h-[15px] w-[18%] rounded-lg" />
            </View>
            <SkeletonGroup.Item className="mt-1 h-1 w-full rounded-full" />
            <View className="border-border mt-1.5 flex-row items-stretch border-t pt-1">
              {[0, 1, 2].map((metric) => (
                <View key={metric} className="flex-1 items-center gap-0.5 px-1">
                  <SkeletonGroup.Item className="h-[11.5px] w-[45%] rounded-lg" />
                  <SkeletonGroup.Item className="h-[15px] w-[68%] rounded-lg" />
                </View>
              ))}
            </View>
            <View className="mt-1.5 flex-row items-center">
              {[0, 1, 2].map((status) => (
                <View key={status} className="min-h-8 flex-1 flex-row justify-center gap-0.5">
                  <SkeletonGroup.Item className="h-4 w-4 rounded-full" />
                  <SkeletonGroup.Item className="h-[13px] w-12 rounded-lg" />
                </View>
              ))}
            </View>
          </Card.Body>
        </Card>
        <View className="mx-4 mt-4 mb-1 flex-row justify-between">
          <SkeletonGroup.Item className="h-[11px] w-24 rounded-md" />
          <SkeletonGroup.Item className="h-[11px] w-28 rounded-md" />
        </View>
        <Card className="bg-surface border-border mx-4 rounded-2xl border p-0 shadow-none">
          <Card.Body className="p-0">
            {Object.values(BudgetGroup).map((group) => (
              <View key={group}>
                <View
                  className="border-separator flex-row items-center gap-2 border-b px-3 py-1.5"
                  style={{ minHeight: Size.budgetRuleRowMinHeight }}
                >
                  <SkeletonGroup.Item className="h-[42px] w-[42px] rounded-full" />
                  <View className="flex-1 gap-1.5">
                    <SkeletonGroup.Item className="h-[15px] w-32 rounded-md" />
                    <SkeletonGroup.Item className="h-[11px] w-48 rounded-md" />
                  </View>
                  <View className="items-end gap-1" style={{ width: Size.budgetRuleValueColumn }}>
                    <SkeletonGroup.Item className="h-[15px] w-12 rounded-md" />
                    <SkeletonGroup.Item className="h-[10px] w-10 rounded-md" />
                  </View>
                  <View style={{ width: Size.budgetRuleChevronColumn }} className="items-end">
                    <SkeletonGroup.Item className="h-4 w-4 rounded-md" />
                  </View>
                </View>
                {expandedBudgetGroup === group ? (
                  <View testID="rule-bucket-expanded-skeleton">
                    <SkeletonGroup.Item className="h-9 w-full rounded-none" />
                    <SkeletonGroup.Item className="mx-3 my-2 h-8 rounded-lg" />
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
                          <SkeletonGroup.Item className="h-[12px] w-28 rounded-md" />
                          <SkeletonGroup.Item className="h-[10px] w-32 rounded-md" />
                        </View>
                        <View className="items-end gap-1">
                          <SkeletonGroup.Item className="h-[12px] w-20 rounded-md" />
                          <SkeletonGroup.Item className="h-[10px] w-16 rounded-md" />
                        </View>
                      </View>
                    ))}
                    <SkeletonGroup.Item className="h-10 w-full rounded-none" />
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
              <SkeletonGroup.Item className="h-[12px] w-24 rounded-md" />
              <SkeletonGroup.Item className="h-[10px] w-40 rounded-md" />
            </View>
            <View className="items-end gap-1">
              <SkeletonGroup.Item className="h-[12px] w-24 rounded-md" />
              <SkeletonGroup.Item className="h-[10px] w-20 rounded-md" />
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
      className="border-separator min-h-[58px] flex-row items-center gap-2.5 border-b px-4 py-2"
    >
      <View className="items-center" style={{ width: Size.budgetCategoryColumn }}>
        <SkeletonGroup.Item className="h-[42px] w-[42px] rounded-full" />
      </View>
      <View className="flex-1 gap-1.5">
        <SkeletonGroup.Item
          className={index % 2 === 0 ? 'h-[15px] w-36 rounded-md' : 'h-[15px] w-28 rounded-md'}
        />
        <SkeletonGroup.Item className="h-[11px] w-40 rounded-md" />
      </View>
      <View className="items-end gap-1">
        <SkeletonGroup.Item className="h-4 w-14 rounded-md" />
        <SkeletonGroup.Item className="h-[10px] w-10 rounded-md" />
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
        <SkeletonGroup.Item className="h-[12px] w-28 rounded-md" />
        <SkeletonGroup.Item className="h-[10px] w-36 rounded-md" />
      </View>
      <SkeletonGroup.Item className="h-[13px] w-12 rounded-md" />
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
          className="bg-surface border-border mx-4 mt-3 rounded-2xl border p-0 shadow-none"
        >
          <Card.Body className="px-2 py-1.5">
            <SkeletonGroup.Item className="h-[13px] w-[38%] rounded-lg" />
            <View className="mt-0.5 flex-row items-center justify-between gap-3">
              <SkeletonGroup.Item className="h-[31px] w-[45%] rounded-lg" />
              <SkeletonGroup.Item className="h-7 w-[30%] rounded-full" />
            </View>
            <View className="mt-0.5 flex-row items-center justify-between gap-3">
              <SkeletonGroup.Item className="h-[15px] w-1/2 rounded-lg" />
              <SkeletonGroup.Item className="h-[15px] w-[18%] rounded-lg" />
            </View>
            <SkeletonGroup.Item className="mt-1 h-1 w-full rounded-full" />
            <View className="border-border mt-1.5 flex-row items-stretch border-t pt-1">
              {[0, 1, 2].map((metric) => (
                <View key={metric} className="flex-1 items-center justify-center gap-0.5 px-1">
                  <SkeletonGroup.Item className="h-[11.5px] w-[45%] rounded-lg" />
                  <SkeletonGroup.Item className="h-[15px] w-[68%] rounded-lg" />
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
                  <SkeletonGroup.Item className="h-[13px] w-10 rounded-lg" />
                </View>
              ))}
            </View>
          </Card.Body>
        </Card>

        <View className="mx-4 mt-3">
          <SkeletonGroup.Item className="h-[38px] w-full rounded-lg" />
        </View>

        {rowCount === undefined ? (
          <ColdContentSkeleton />
        ) : rows.length === 0 ? (
          <View testID="plans-empty-state-skeleton" className="min-h-[300px] items-center pt-16">
            <SkeletonGroup.Item className="h-16 w-16 rounded-full" />
            <SkeletonGroup.Item className="mt-4 h-[18px] w-40 rounded-lg" />
            <SkeletonGroup.Item className="mt-2 h-[14px] w-56 rounded-lg" />
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
                  <SkeletonGroup.Item
                    className={
                      row === 0 ? 'h-[19px] w-[52%] rounded-lg' : 'h-[19px] w-[40%] rounded-lg'
                    }
                  />
                  <SkeletonGroup.Item className="h-6 w-14 rounded-full" />
                </View>
                <SkeletonGroup.Item className="mt-0.5 h-[13px] w-[72%] rounded-lg" />
              </View>
              <View className="items-end gap-0.5">
                <SkeletonGroup.Item className="h-5 w-16 rounded-lg" />
                <SkeletonGroup.Item className="h-[11.5px] w-12 rounded-lg" />
              </View>
            </Card.Header>
            <Card.Body className="mt-1">
              <View className="flex-row items-center justify-between gap-3">
                <SkeletonGroup.Item className="h-[14px] w-[45%] rounded-lg" />
                <SkeletonGroup.Item className="h-[13px] w-14 rounded-lg" />
              </View>
              <SkeletonGroup.Item className="mt-1 h-1 w-full rounded-full" />
              <SkeletonGroup.Item className="mt-0.5 h-[13px] w-[32%] rounded-lg" />
              <View className="mt-1 flex-row gap-1">
                {[0, 1, 2].map((chip) => (
                  <SkeletonGroup.Item key={chip} className="h-[30px] w-[84px] rounded-full" />
                ))}
              </View>
            </Card.Body>
            <Card.Footer className="border-border mt-1 flex-row items-center justify-between gap-3 border-t pt-0.5">
              <SkeletonGroup.Item className="h-[11.5px] w-[45%] rounded-lg" />
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
            <SkeletonGroup.Item
              className="rounded-md"
              style={{ height: Type.body, width: '45%' }}
            />
            <SkeletonGroup.Item
              className="rounded-md"
              style={{ height: Type.caption, width: '65%' }}
            />
          </View>
          <SkeletonGroup.Item className="rounded-md" style={{ height: Type.body, width: '18%' }} />
        </View>
      ))}
    </View>
  );
}
