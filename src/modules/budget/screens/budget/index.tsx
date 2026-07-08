import { useFocusEffect } from 'expo-router';
import { Separator, Surface, Text as HeroText } from 'heroui-native';
import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/ui/empty_state';
import { MonthFilter } from '@/components/ui/month_filter';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { closeAllRows } from '@/components/ui/swipeable_row';
import { SegmentedTabs } from '@/components/ui/tabs';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Size, Spacing, Type } from '@/constants/theme';
import { useBudget } from '@/modules/budget/screens/budget/budget.hook';
import { useBudgetState } from '@/modules/budget/screens/budget/budget.state';
import { BudgetCopySheet } from '@/modules/budget/screens/budget/components/budget_copy_sheet';
import { BudgetDeleteConfirmSheet } from '@/modules/budget/screens/budget/components/budget_delete_confirm_sheet';
import { BudgetScreenSkeleton } from '@/modules/budget/screens/budget/components/budget_screen_skeleton';
import { BudgetToolRail } from '@/modules/budget/screens/budget/components/budget_tool_rail';
import { CategoryBudgetRow } from '@/modules/budget/screens/budget/components/category_budget_row';
import { FiftyThirtyTwentyLens } from '@/modules/budget/screens/budget/components/fifty_thirty_twenty_lens';
import { SetBudgetSheet } from '@/modules/budget/screens/budget/components/set_budget_sheet';
import { SummaryCard } from '@/modules/budget/screens/budget/components/summary_card';
import { formatMonthYear } from '@/utils/format_date';
import { ms } from '@/utils/responsive';
import { useConfirmAction } from '@/utils/use_confirm_action.hook';

const LENS_SEGMENTS = [
  { value: 'categories' as const, label: Strings.budget5030TabCategories },
  { value: 'fiftythirty' as const, label: Strings.budget5030TabLens },
];

export default function BudgetScreen() {
  const {
    state,
    openAdd,
    openEdit,
    setLensTab,
    setSelectedMonth,
    openCopy,
    closeCopy,
    toggleCopyCategoryId,
    selectAllCopyCategories,
    clearCopySelection,
    goToPreviousCopySourceMonth,
    goToNextCopySourceMonth,
    copySelectedBudgets,
    removeBudgetForMonth,
    goToCategory,
  } = useBudget();
  const editingTargetId = useBudgetState.useState.targetCategoryId();
  const editingRow = state.rows.find((r) => r.categoryId === editingTargetId);

  // Payload carries both id and name so the confirm sheet can display the category name
  const {
    pendingPayload: pendingDelete,
    busy: deleteBusy,
    request: requestDelete,
    confirm: confirmDelete,
    cancel: cancelDelete,
  } = useConfirmAction<{ id: string; name: string }>(removeBudgetForMonth);

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

      {!state.hasLoaded ? (
        <ScreenScroll contentContainerStyle={styles.content}>
          <BudgetScreenSkeleton />
        </ScreenScroll>
      ) : state.lensTab === 'categories' ? (
        <ScreenScroll contentContainerStyle={styles.content}>
          <View style={styles.inset}>
            <SummaryCard overall={state.overall} daysLeft={state.daysLeft} />
            <BudgetToolRail
              onCopy={openCopy}
              onAddCategory={openAdd}
              onPlan={() => undefined}
              copyDisabled={state.copyRows.length === 0}
              addCategoryDisabled={state.budgetableCategories.length === 0}
              planDisabled
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
      ) : (
        <ScreenScroll contentContainerStyle={styles.content}>
          <View style={styles.inset}>
            <BudgetToolRail
              onCopy={openCopy}
              onAddCategory={openAdd}
              onPlan={() => undefined}
              copyDisabled={state.copyRows.length === 0}
              addCategoryDisabled={state.budgetableCategories.length === 0}
              planDisabled
            />
          </View>
          <FiftyThirtyTwentyLens vm={state.buckets} suggestion={state.suggestion} />
        </ScreenScroll>
      )}

      <BudgetCopySheet
        isOpen={state.copySheetVisible}
        sourceMonthLabel={formatMonthYear(state.copySourceMonth)}
        targetMonthLabel={formatMonthYear(state.month)}
        rows={state.copyRows}
        selectedCategoryIds={state.copySelectedCategoryIds}
        sourceMonthNextDisabled={!state.canGoNextCopySourceMonth}
        onPreviousSourceMonth={goToPreviousCopySourceMonth}
        onNextSourceMonth={goToNextCopySourceMonth}
        onOpenChange={(open) => {
          if (!open) closeCopy();
        }}
        onToggleCategory={toggleCopyCategoryId}
        onSelectAll={selectAllCopyCategories}
        onClearSelection={clearCopySelection}
        onApply={() => {
          void copySelectedBudgets();
        }}
      />

      <SetBudgetSheet budgetableCategories={state.budgetableCategories} editingRow={editingRow} />

      <BudgetDeleteConfirmSheet
        isOpen={pendingDelete !== null}
        categoryName={pendingDelete?.name ?? ''}
        busy={deleteBusy}
        onCancel={cancelDelete}
        onConfirm={() => {
          void confirmDelete();
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
