import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PressableFeedback } from 'heroui-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { BackButton } from '@/components/ui/back_button';
import { Button } from '@/components/ui/button';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Size, Spacing, TouchSize, Type } from '@/constants/theme';
import { SpendingPlanDetailCategoryRow } from '@/modules/budget/screens/budget/components/spending_plan_detail_category_row';
import { SpendingPlanDetailSummary } from '@/modules/budget/screens/budget/components/spending_plan_detail_summary';
import { SpendingPlanSheet } from '@/modules/budget/screens/budget/components/spending_plan_sheet';
import { SpendingPlanDetailSkeleton } from '@/modules/budget/screens/budget/spending_plan_detail/components/spending_plan_detail_skeleton';
import { useSpendingPlanDetail } from '@/modules/budget/screens/budget/spending_plan_detail/spending_plan_detail.hook';
import { formatAmount } from '@/utils/format_amount';

export default function SpendingPlanDetailScreen() {
  const { state, goBack, editPlan } = useSpendingPlanDetail();
  const plan = state.plan;

  return (
    <Screen>
      <View style={styles.header}>
        <BackButton onPress={goBack} />
        <Text style={styles.title} numberOfLines={1}>
          {plan?.name ?? Strings.budgetPlansDetailTitle}
        </Text>
        {state.viewState === 'ready' && plan ? (
          <PressableFeedback
            accessibilityRole="button"
            accessibilityLabel={`${Strings.budgetPlanEditTitle} ${plan.name}`}
            onPress={editPlan}
            style={styles.headerAction}
          >
            <MaterialCommunityIcons
              name="pencil-outline"
              size={Size.iconSm}
              color={Colors.dark.gold}
            />
          </PressableFeedback>
        ) : (
          <View style={styles.headerAction} />
        )}
      </View>

      {state.viewState === 'loading' ? (
        <ScreenScroll contentContainerStyle={styles.content}>
          <SpendingPlanDetailSkeleton />
        </ScreenScroll>
      ) : null}

      {state.viewState === 'notFound' ? (
        <View style={styles.notFound}>
          <Text style={styles.notFoundTitle}>{Strings.budgetPlansDetailNotFound}</Text>
          <Button
            variant="secondary"
            size="sm"
            label={Strings.budgetPlansDetailBack}
            accessibilityLabel={Strings.budgetPlansDetailBack}
            onPress={goBack}
          />
        </View>
      ) : null}

      {state.viewState === 'ready' && plan ? (
        <>
          <ScreenScroll contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <SpendingPlanDetailSummary detail={plan.detail} />

            <View style={styles.sectionRow}>
              <Text style={styles.section}>{Strings.budgetPlansDetailCategories}</Text>
              <Text style={styles.sectionAmount}>
                {Strings.budgetPlansDetailTotalSpent(formatAmount(plan.spent))}
              </Text>
            </View>
            <View style={styles.categoryRows}>
              {plan.detail.categoryRows.map((row) => (
                <SpendingPlanDetailCategoryRow key={row.categoryId} row={row} />
              ))}
              {plan.detail.flexibleRow ? (
                <View style={styles.flexibleRow}>
                  <MaterialCommunityIcons
                    accessible={false}
                    name="wallet-outline"
                    size={Size.iconXs}
                    color={Colors.dark.gold}
                  />
                  <Text style={styles.flexibleLabel}>{plan.detail.flexibleRow.label}</Text>
                  <Text style={styles.flexibleAmount}>{plan.detail.flexibleRow.amountLabel}</Text>
                </View>
              ) : null}
            </View>
          </ScreenScroll>
          <View style={styles.footer}>
            <Button
              variant="primary"
              label={Strings.budgetPlanEditTitle}
              accessibilityLabel={`${Strings.budgetPlanEditTitle} ${plan.name}`}
              onPress={editPlan}
            />
          </View>
          <SpendingPlanSheet budgetableCategories={state.budgetableCategories} editingPlan={plan} />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: Size.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  title: {
    flex: 1,
    fontFamily: FontFamily.soraBold,
    fontSize: Type.title,
    color: Colors.dark.text1,
  },
  headerAction: {
    width: TouchSize.min,
    height: TouchSize.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { paddingBottom: Spacing.xl },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  section: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.micro,
    color: Colors.dark.text2,
    textTransform: 'uppercase',
  },
  sectionAmount: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.micro,
    color: Colors.dark.text2,
  },
  categoryRows: { marginTop: Spacing.xxs, paddingHorizontal: Spacing.md },
  flexibleRow: {
    minHeight: Size.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderTopWidth: Size.hairline,
    borderTopColor: Colors.dark.border,
  },
  flexibleLabel: {
    flex: 1,
    fontFamily: FontFamily.interMedium,
    fontSize: Type.caption,
    color: Colors.dark.text2,
  },
  flexibleAmount: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.caption,
    color: Colors.dark.text1,
  },
  footer: {
    borderTopWidth: Size.hairline,
    borderTopColor: Colors.dark.border,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  notFoundTitle: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.body,
    color: Colors.dark.text2,
    textAlign: 'center',
  },
});
