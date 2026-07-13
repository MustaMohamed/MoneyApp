import { useFocusEffect } from 'expo-router';
import { Separator, Surface, Text as HeroText } from 'heroui-native';
import React, { useCallback } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/ui/empty_state';
import { MonthFilter } from '@/components/ui/month_filter';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { closeAllRows } from '@/components/ui/swipeable_row';
import { SegmentedTabs } from '@/components/ui/tabs';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Size, Spacing, Type } from '@/constants/theme';
import { useBudget } from '@/modules/budget/screens/budget/budget.hook';
import { BudgetCopySheet } from '@/modules/budget/screens/budget/components/budget_copy_sheet';
import { BudgetDeleteConfirmSheet } from '@/modules/budget/screens/budget/components/budget_delete_confirm_sheet';
import { BudgetScreenSkeleton } from '@/modules/budget/screens/budget/components/budget_screen_skeleton';
import { BudgetToolRail } from '@/modules/budget/screens/budget/components/budget_tool_rail';
import { CategoryBudgetRow } from '@/modules/budget/screens/budget/components/category_budget_row';
import { FiftyThirtyTwentyLens } from '@/modules/budget/screens/budget/components/fifty_thirty_twenty_lens';
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
    openEditPlan,
    openPlanTool,
    setLensTab,
    setSelectedMonth,
    openCopy,
    closeCopy,
    toggleCopyBudgetId,
    selectAllCopyBudgets,
    clearCopySelection,
    setCopySourceMonth,
    copySelectedBudgets,
    removeBudgetForMonth,
    removeSpendingPlanForMonth,
    openPlanDetails,
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

  // Payload carries both id and name so the confirm sheet can display the category name
  const {
    pendingPayload: pendingDelete,
    busy: deleteBusy,
    request: requestDelete,
    confirm: confirmDelete,
    cancel: cancelDelete,
  } = useConfirmAction<{ id: string; name: string }>(removeBudgetForMonth);
  const {
    pendingPayload: pendingPlanDelete,
    busy: planDeleteBusy,
    request: requestPlanDelete,
    confirm: confirmPlanDelete,
    cancel: cancelPlanDelete,
  } = useConfirmAction<{ id: string; name: string }>(removeSpendingPlanForMonth);

  // Close any open swipe row when the user navigates away from this screen
  useFocusEffect(
    useCallback(() => {
      return () => closeAllRows();
    }, []),
  );

  return (
    <Screen>
      <Surface variant="transparent" className="rounded-none px-4 py-0 shadow-none">
        <View style={styles.header}>
          <HeroText.Heading type="h3" weight="bold" truncate className="font-sora">
            {Strings.budgetTitle}
          </HeroText.Heading>
        </View>
      </Surface>
      <Separator />

      <View style={styles.monthFilter}>
        <MonthFilter selectedMonth={state.month} onSelectedMonthChange={setSelectedMonth} />
      </View>

      <SegmentedTabs
        segments={LENS_SEGMENTS}
        value={state.lensTab}
        onValueChange={setLensTab}
        listClassName="mx-4 mt-2 mb-2 self-stretch"
      />

      {!state.hasLoaded || state.refreshing ? (
        <ScreenScroll contentContainerStyle={styles.content} refreshControl={refreshControl}>
          <BudgetScreenSkeleton variant={state.lensTab === 'plans' ? 'plans' : 'categories'} />
        </ScreenScroll>
      ) : state.lensTab === 'categories' ? (
        <ScreenScroll contentContainerStyle={styles.content} refreshControl={refreshControl}>
          <View style={styles.inset}>
            <SummaryCard overall={state.overall} daysLeft={state.daysLeft} />
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
              <HeroText style={styles.section}>{Strings.budgetDetailCategories}</HeroText>
              {state.rows.map((row) => (
                <CategoryBudgetRow
                  key={row.categoryId}
                  row={row}
                  onPress={goToCategory}
                  onEdit={openEdit}
                  onDelete={requestDelete}
                />
              ))}
            </>
          ) : (
            <View style={styles.emptyWrap}>
              <EmptyState variant="budget" onAction={openAdd} />
            </View>
          )}
        </ScreenScroll>
      ) : state.lensTab === 'plans' ? (
        <ScreenScroll contentContainerStyle={styles.content} refreshControl={refreshControl}>
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
            onEdit={openEditPlan}
            onDelete={requestPlanDelete}
          />
        </ScreenScroll>
      ) : (
        <ScreenScroll contentContainerStyle={styles.content} refreshControl={refreshControl}>
          <FiftyThirtyTwentyLens vm={state.buckets} suggestion={state.suggestion} />
        </ScreenScroll>
      )}

      <BudgetCopySheet
        isOpen={state.copySheetVisible}
        sourceMonth={state.copySourceMonth}
        targetMonthLabel={formatMonthYear(state.month)}
        rows={state.copyRows}
        selectedBudgetIds={state.copySelectedBudgetIds}
        onSourceMonthChange={setCopySourceMonth}
        onOpenChange={(open) => {
          if (!open) closeCopy();
        }}
        onToggleBudget={toggleCopyBudgetId}
        onSelectAll={selectAllCopyBudgets}
        onClearSelection={clearCopySelection}
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
        onCancel={cancelDelete}
        onConfirm={() => {
          void confirmDelete();
        }}
      />
      <SpendingPlanDeleteConfirmSheet
        isOpen={pendingPlanDelete !== null}
        planName={pendingPlanDelete?.name ?? ''}
        busy={planDeleteBusy}
        onCancel={cancelPlanDelete}
        onConfirm={() => {
          void confirmPlanDelete();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: Size.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  monthFilter: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  content: { paddingBottom: ms(96) },
  // Non-row children (summary card, section label) re-inset; rows stay full-bleed
  // so their hairline dividers span the full width (spec D7).
  inset: { paddingHorizontal: Spacing.md },
  section: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.micro,
    color: Colors.dark.text2,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  emptyWrap: {
    minHeight: ms(320),
  },
});
