import { useFocusEffect } from 'expo-router';
import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { EmptyState } from '@/components/ui/empty_state';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { closeAllRows } from '@/components/ui/swipeable_row';
import { SegmentedTabs } from '@/components/ui/tabs';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Spacing, Type } from '@/constants/theme';
import { useBudget } from '@/screens/budget/budget.hook';
import { useBudgetState } from '@/screens/budget/budget.state';
import { BudgetDeleteConfirmSheet } from '@/screens/budget/components/budget_delete_confirm_sheet';
import { CategoryBudgetRow } from '@/screens/budget/components/category_budget_row';
import { FiftyThirtyTwentyLens } from '@/screens/budget/components/fifty_thirty_twenty_lens';
import { SetBudgetSheet } from '@/screens/budget/components/set_budget_sheet';
import { SummaryCard } from '@/screens/budget/components/summary_card';
import { useBudgetStore } from '@/store/budget.store';
import { ms } from '@/utils/responsive';
import { useConfirmAction } from '@/utils/use_confirm_action.hook';

const LENS_SEGMENTS = [
  { value: 'categories' as const, label: Strings.budget5030TabCategories },
  { value: 'fiftythirty' as const, label: Strings.budget5030TabLens },
];

export default function BudgetScreen() {
  const { state, openAdd, openEdit, setLensTab, goToCategory } = useBudget();
  const editingTargetId = useBudgetState((s) => s.state.targetCategoryId);
  const editingRow = state.rows.find((r) => r.categoryId === editingTargetId);

  const { removeBudget } = useBudgetStore(useShallow((s) => ({ removeBudget: s.removeBudget })));

  // Payload carries both id and name so the confirm sheet can display the category name
  const {
    pendingPayload: pendingDelete,
    busy: deleteBusy,
    request: requestDelete,
    confirm: confirmDelete,
    cancel: cancelDelete,
  } = useConfirmAction<{ id: string; name: string }>(({ id }) => removeBudget(id));

  // Close any open swipe row when the user navigates away from this screen
  useFocusEffect(
    useCallback(() => {
      return () => closeAllRows();
    }, []),
  );

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>{Strings.budgetTitle}</Text>
        {state.lensTab === 'categories' &&
          state.hasBudgets &&
          state.budgetableCategories.length > 0 && (
            <Text style={styles.addBtn} onPress={openAdd} accessibilityRole="button">
              {`+ ${Strings.budgetAddCategory}`}
            </Text>
          )}
      </View>

      <SegmentedTabs
        segments={LENS_SEGMENTS}
        value={state.lensTab}
        onValueChange={setLensTab}
        listClassName="mx-4 mt-2 mb-2 self-stretch"
      />

      {state.lensTab === 'categories' ? (
        state.hasBudgets ? (
          <ScreenScroll contentContainerStyle={styles.content}>
            <View style={styles.inset}>
              <SummaryCard overall={state.overall} daysLeft={state.daysLeft} />
            </View>
            <Text style={styles.section}>{Strings.budgetDetailCategories}</Text>
            {state.rows.map((row) => (
              <CategoryBudgetRow
                key={row.categoryId}
                row={row}
                onPress={() => goToCategory(row.categoryId)}
                onEdit={() => openEdit(row.categoryId)}
                onDelete={() => requestDelete({ id: row.categoryId, name: row.name })}
              />
            ))}
          </ScreenScroll>
        ) : (
          <EmptyState variant="budget" onAction={openAdd} />
        )
      ) : (
        <ScreenScroll contentContainerStyle={styles.content}>
          <FiftyThirtyTwentyLens vm={state.buckets} suggestion={state.suggestion} />
        </ScreenScroll>
      )}

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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  title: { fontFamily: FontFamily.soraBold, fontSize: Type.title, color: Colors.dark.text1 },
  addBtn: { fontFamily: FontFamily.interMedium, fontSize: Type.body, color: Colors.dark.gold },
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
});
