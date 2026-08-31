import { useFocusEffect } from 'expo-router';
import { Separator, Surface, Typography } from 'heroui-native';
import React, { useCallback } from 'react';
import { RefreshControl, View } from 'react-native';

import { EmptyState } from '@/components/ui/empty_state';
import { LoadErrorAlert } from '@/components/ui/load_error_alert';
import { MonthFilter } from '@/components/ui/month_filter';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { closeAllRows } from '@/components/ui/swipeable_row';
import { SegmentedTabs } from '@/components/ui/tabs';
import { Strings } from '@/constants/strings';
import { Colors, Size } from '@/constants/theme';
import { useBudget } from '@/modules/budget/screens/budget/budget.hook';
import { BudgetCopySheet } from '@/modules/budget/screens/budget/components/budget_copy_sheet';
import { BudgetDeleteConfirmSheet } from '@/modules/budget/screens/budget/components/budget_delete_confirm_sheet';
import { BudgetScreenSkeleton } from '@/modules/budget/screens/budget/components/budget_screen_skeleton';
import { BudgetToolRail } from '@/modules/budget/screens/budget/components/budget_tool_rail';
import { CategoryBudgetRow } from '@/modules/budget/screens/budget/components/category_budget_row';
import { FiftyThirtyTwentyLens } from '@/modules/budget/screens/budget/components/fifty_thirty_twenty';
import { IncomeSheet } from '@/modules/budget/screens/budget/components/income_sheet';
import { SetBudgetSheet } from '@/modules/budget/screens/budget/components/set_budget_sheet';
import { SpendingPlanDeleteConfirmSheet } from '@/modules/budget/screens/budget/components/spending_plan_delete_confirm_sheet';
import { SpendingPlansLens } from '@/modules/budget/screens/budget/components/spending_plans_lens';
import { SummaryCard } from '@/modules/budget/screens/budget/components/summary_card';
import { SpendingPlanSheet } from '@/modules/budget/screens/budget/spending_plan_sheet';
import { formatMonthYear } from '@/utils/format_date';
import { ms } from '@/utils/responsive';
import { useConfirmAction } from '@/utils/use_confirm_action.hook';

const LENS_SEGMENTS = [
  { value: 'categories' as const, label: Strings.budget5030TabCategories },
  { value: 'plans' as const, label: Strings.budgetPlansTab },
  { value: 'fiftythirty' as const, label: Strings.budget5030TabLens },
];

export default function BudgetScreen() {
  const {
    state,
    openAdd,
    openEdit,
    openAddPlan,
    openPlanTool,
    setLensTab,
    setSelectedMonth,
    openCopy,
    closeCopy,
    toggleCopyBudgetId,
    selectAllCopyBudgets,
    clearCopySelection,
    setCopySourceMonth,
    retryCopyPreview,
    copySelectedBudgets,
    removeBudgetForMonth,
    removeSpendingPlanForMonth,
    openPlanDetails,
    openIncomeSheet,
    setExpandedCategoryId,
    setExpandedBudgetGroup,
    manageRuleGroup,
    refresh,
    goToCategory,
  } = useBudget();

  const refreshControl = (
    <RefreshControl
      refreshing={state.refreshing}
      onRefresh={() => {
        void refresh();
      }}
      tintColor={Colors.dark.gold}
      colors={[Colors.dark.gold]}
      progressBackgroundColor={Colors.dark.surface}
    />
  );

  const {
    pendingPayload: pendingDelete,
    busy: deleteBusy,
    error: deleteError,
    request: requestDelete,
    confirm: confirmDelete,
    cancel: cancelDelete,
  } = useConfirmAction<{ id: string; name: string }>(removeBudgetForMonth);
  const {
    pendingPayload: pendingPlanDelete,
    busy: planDeleteBusy,
    error: planDeleteError,
    request: requestPlanDelete,
    confirm: confirmPlanDelete,
    cancel: cancelPlanDelete,
  } = useConfirmAction<{ id: string; name: string }>(removeSpendingPlanForMonth);

  useFocusEffect(
    useCallback(() => {
      return () => closeAllRows();
    }, []),
  );

  return (
    <Screen>
      <Surface variant="transparent" className="rounded-none px-4 py-0 shadow-none">
        <View
          className="flex-row items-center justify-between gap-2"
          style={{ minHeight: Size.headerHeight }}
        >
          <Typography.Heading type="h3" weight="bold" truncate className="font-sora">
            {Strings.budgetTitle}
          </Typography.Heading>
        </View>
      </Surface>
      <Separator />

      <View className="px-4 pt-2">
        <MonthFilter selectedMonth={state.month} onSelectedMonthChange={setSelectedMonth} />
      </View>

      <SegmentedTabs
        segments={LENS_SEGMENTS}
        value={state.lensTab}
        onValueChange={setLensTab}
        listClassName="mx-4 mt-2 mb-2 self-stretch"
      />

      {state.presentation === 'contentWithError' ? (
        <LoadErrorAlert
          mode="floating"
          floatingOffset="tabBar"
          minHeight={Size.statusRailMinHeight}
          title={Strings.budgetLoadError}
          retryLabel={Strings.budgetLoadRetry}
          onRetry={() => void refresh()}
          testID="budget-load-error"
        />
      ) : null}

      {state.presentation === 'coldError' ? (
        <LoadErrorAlert
          mode="fill"
          fillPadding="wide"
          title={Strings.budgetLoadError}
          retryLabel={Strings.budgetLoadRetry}
          onRetry={() => void refresh()}
          testID="budget-load-error"
        />
      ) : state.presentation === 'coldLoading' ? (
        <ScreenScroll
          contentContainerStyle={{ paddingBottom: ms(96) }}
          refreshControl={refreshControl}
        >
          <BudgetScreenSkeleton
            variant={state.lensTab}
            preserveLayout={false}
            categorySummaryHasPlan={state.categoriesSummary.hasPlan}
            categoryRows={state.rows}
            expandedCategoryId={state.expandedCategoryId}
            planRowCount={state.spendingPlanRows.length}
            ruleLens={state.ruleLens}
            expandedBudgetGroup={state.expandedBudgetGroup}
          />
        </ScreenScroll>
      ) : state.lensTab === 'categories' ? (
        <ScreenScroll
          contentContainerStyle={{ paddingBottom: ms(96) }}
          refreshControl={refreshControl}
        >
          <SummaryCard summary={state.categoriesSummary} onSetIncome={openIncomeSheet} />
          <View className="mx-4 mt-2">
            <BudgetToolRail
              variant="categories"
              onCopy={openCopy}
              onAddCategory={openAdd}
              onPlan={openPlanTool}
              copyDisabled={false}
              addCategoryDisabled={state.budgetableCategories.length === 0}
              planDisabled={false}
            />
          </View>

          {state.hasBudgets ? (
            <>
              <Typography className="font-inter-medium text-muted mx-4 mt-4 mb-1 text-[11px] uppercase">
                {state.categoriesSummary.categoryCountLabel}
              </Typography>
              {state.rows.map((row) => (
                <CategoryBudgetRow
                  key={row.categoryId}
                  row={row}
                  isExpanded={state.expandedCategoryId === row.categoryId}
                  onExpandedChange={setExpandedCategoryId}
                  onViewDetails={goToCategory}
                  onEdit={openEdit}
                  onDelete={requestDelete}
                />
              ))}
            </>
          ) : (
            <View className="min-h-80">
              <EmptyState variant="budget" onAction={openAdd} />
            </View>
          )}
        </ScreenScroll>
      ) : state.lensTab === 'plans' ? (
        <ScreenScroll
          contentContainerStyle={{ paddingBottom: ms(96) }}
          refreshControl={refreshControl}
        >
          <SpendingPlansLens
            rows={state.spendingPlanRows}
            summary={state.spendingPlansSummary}
            summaryFooter={
              <BudgetToolRail
                variant="plans"
                onCopy={openCopy}
                onAddCategory={openAdd}
                onPlan={openPlanTool}
                copyDisabled={false}
                addCategoryDisabled={state.budgetableCategories.length === 0}
                planDisabled={false}
              />
            }
            onCreate={openAddPlan}
            onOpenDetails={openPlanDetails}
            onDelete={requestPlanDelete}
          />
        </ScreenScroll>
      ) : (
        <ScreenScroll
          contentContainerStyle={{ paddingBottom: ms(96) }}
          refreshControl={refreshControl}
        >
          <FiftyThirtyTwentyLens
            vm={state.ruleLens}
            selectedMonth={state.month}
            expandedGroup={state.expandedBudgetGroup}
            onExpandedGroupChange={setExpandedBudgetGroup}
            onEditIncome={openIncomeSheet}
            onManageGroup={manageRuleGroup}
          />
        </ScreenScroll>
      )}

      <BudgetCopySheet
        isOpen={state.copySheetVisible}
        sourceMonth={state.copySourceMonth}
        targetMonthLabel={formatMonthYear(state.month)}
        rows={state.copyRows}
        selectedBudgetIds={state.copySelectedBudgetIds}
        previewLoading={state.copyPreviewLoading}
        previewError={state.copyPreviewError}
        copyBusy={state.copyBusy}
        copyError={state.copyError}
        onSourceMonthChange={setCopySourceMonth}
        onOpenChange={(open) => {
          if (!open && !state.copyBusy) closeCopy();
        }}
        onToggleBudget={toggleCopyBudgetId}
        onSelectAll={selectAllCopyBudgets}
        onClearSelection={clearCopySelection}
        onRetryPreview={retryCopyPreview}
        onApply={() => {
          void copySelectedBudgets();
        }}
      />

      <SetBudgetSheet
        budgetableCategories={state.budgetableCategories}
        editingRow={state.editingRow}
      />
      <SpendingPlanSheet
        budgetableCategories={state.budgetableCategories}
        editingPlan={state.editingPlan}
      />
      <BudgetDeleteConfirmSheet
        isOpen={pendingDelete !== null}
        categoryName={pendingDelete?.name ?? ''}
        busy={deleteBusy}
        errorMessage={deleteError ? Strings.budgetDeleteError : undefined}
        onCancel={cancelDelete}
        onConfirm={() => {
          void confirmDelete();
        }}
      />
      <SpendingPlanDeleteConfirmSheet
        isOpen={pendingPlanDelete !== null}
        planName={pendingPlanDelete?.name ?? ''}
        busy={planDeleteBusy}
        errorMessage={planDeleteError ? Strings.budgetPlanDeleteError : undefined}
        onCancel={cancelPlanDelete}
        onConfirm={() => {
          void confirmPlanDelete();
        }}
      />
      <IncomeSheet />
    </Screen>
  );
}
