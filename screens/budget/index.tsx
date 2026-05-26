import { Tabs } from 'heroui-native';
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
import { FiftyThirtyTwentyLens } from '@/screens/budget/components/fifty_thirty_twenty_lens';
import { SetBudgetSheet } from '@/screens/budget/components/set_budget_sheet';
import { SummaryCard } from '@/screens/budget/components/summary_card';
import { ms } from '@/utils/responsive';

export default function BudgetScreen() {
  const { state, openAdd, setLensTab, goToCategory } = useBudget();
  const editingTargetId = useBudgetState((s) => s.state.targetCategoryId);
  const editingRow = state.rows.find((r) => r.categoryId === editingTargetId);

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

      <Tabs
        value={state.lensTab}
        onValueChange={(key) => setLensTab(key as 'categories' | 'fiftythirty')}
        style={styles.tabs}
      >
        <Tabs.List>
          <Tabs.Indicator />
          <Tabs.Trigger value="categories">
            <Tabs.Label>{Strings.budget5030TabCategories}</Tabs.Label>
          </Tabs.Trigger>
          <Tabs.Trigger value="fiftythirty">
            <Tabs.Label>{Strings.budget5030TabLens}</Tabs.Label>
          </Tabs.Trigger>
        </Tabs.List>
      </Tabs>

      {state.lensTab === 'categories' ? (
        state.hasBudgets ? (
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
        )
      ) : (
        <ScreenScroll contentContainerStyle={styles.content}>
          <FiftyThirtyTwentyLens vm={state.buckets} suggestion={state.suggestion} />
        </ScreenScroll>
      )}

      <SetBudgetSheet budgetableCategories={state.budgetableCategories} editingRow={editingRow} />
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
  tabs: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
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
