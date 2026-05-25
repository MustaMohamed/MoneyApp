import React from 'react';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/ui/empty_state';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Spacing, Type } from '@/constants/theme';
import { useBudget } from '@/screens/budget/budget.hook';
import { useBudgetState } from '@/screens/budget/budget.state';
import { CategoryBudgetRow } from '@/screens/budget/components/category_budget_row';
import { SetBudgetSheet } from '@/screens/budget/components/set_budget_sheet';
import { SummaryCard } from '@/screens/budget/components/summary_card';
import { ms } from '@/utils/responsive';

export default function BudgetScreen() {
  const { state, openAdd, goToCategory } = useBudget();
  const editingTargetId = useBudgetState((s) => s.state.targetCategoryId);
  const editingRow = state.rows.find((r) => r.categoryId === editingTargetId);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>{Strings.budgetTitle}</Text>
        {state.hasBudgets && state.budgetableCategories.length > 0 && (
          <Text style={styles.addBtn} onPress={openAdd} accessibilityRole="button">
            {`+ ${Strings.budgetAddCategory}`}
          </Text>
        )}
      </View>

      {state.hasBudgets ? (
        <ScreenScroll contentContainerStyle={styles.content}>
          <SummaryCard overall={state.overall} daysLeft={state.daysLeft} />
          <Text style={styles.section}>{Strings.budgetDetailCategories}</Text>
          {state.rows.map((row) => (
            <CategoryBudgetRow
              key={row.categoryId}
              row={row}
              onPress={() => goToCategory(row.categoryId)}
            />
          ))}
        </ScreenScroll>
      ) : (
        <EmptyState variant="budget" onAction={openAdd} />
      )}

      <SetBudgetSheet
        budgetableCategories={state.budgetableCategories.map((c) => ({
          id: c.id,
          name: c.name,
          icon: c.icon,
          color: c.color,
        }))}
        editingRow={editingRow}
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
  content: { paddingHorizontal: Spacing.md, paddingBottom: ms(96) },
  section: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.micro,
    color: Colors.dark.text2,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
});
