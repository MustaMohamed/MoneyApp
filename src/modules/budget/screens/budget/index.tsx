import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
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
  { value: 'plans' as const, label: Strings.budgetPlansTab },
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
    toggleCopyBudgetId,
    selectAllCopyBudgets,
    clearCopySelection,
    setCopySourceMonth,
    copySelectedBudgets,
    removeBudgetForMonth,
    goToCategory,
  } = useBudget();
  const editingTargetId = useBudgetState.useState.targetBudgetId();
  const editingRow = state.rows
    .flatMap((row) =>
      row.budgets.map((budget) => ({
        ...budget,
        limit: budget.amount,
        categoryId: row.categoryId,
        categoryName: row.name,
        icon: row.icon,
        color: row.color,
      })),
    )
    .find((budget) => budget.id === editingTargetId);
  const openPlans = useCallback(() => setLensTab('plans'), [setLensTab]);

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
              onPlan={openPlans}
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
        <ScreenScroll contentContainerStyle={styles.content}>
          <View style={styles.inset}>
            <BudgetToolRail
              onCopy={openCopy}
              onAddCategory={openAdd}
              onPlan={openPlans}
              copyDisabled={false}
              addCategoryDisabled={state.budgetableCategories.length === 0}
              planDisabled={false}
            />
          </View>
          <View style={styles.plansPlaceholder}>
            <View style={styles.plansIcon}>
              <MaterialCommunityIcons
                name="calendar-star"
                size={ms(34)}
                color={Colors.dark.text2}
              />
            </View>
            <HeroText style={styles.plansTitle}>{Strings.budgetPlansTitle}</HeroText>
            <HeroText style={styles.plansBody}>{Strings.budgetPlansBody}</HeroText>
          </View>
        </ScreenScroll>
      ) : (
        <ScreenScroll contentContainerStyle={styles.content}>
          <View style={styles.inset}>
            <BudgetToolRail
              onCopy={openCopy}
              onAddCategory={openAdd}
              onPlan={openPlans}
              copyDisabled={false}
              addCategoryDisabled={state.budgetableCategories.length === 0}
              planDisabled={false}
            />
          </View>
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
  plansPlaceholder: {
    minHeight: ms(320),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  plansIcon: {
    width: ms(72),
    height: ms(72),
    borderRadius: ms(36),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.surface,
  },
  plansTitle: {
    marginTop: Spacing.md,
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.title,
    color: Colors.dark.text1,
    textAlign: 'center',
  },
  plansBody: {
    marginTop: Spacing.xs,
    maxWidth: ms(280),
    fontFamily: FontFamily.interMedium,
    fontSize: Type.body,
    lineHeight: ms(20),
    color: Colors.dark.text2,
    textAlign: 'center',
  },
});
