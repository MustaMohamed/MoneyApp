import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Sheet, SHEET_FOOTER_CLEARANCE } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';
import { SpendingPlanDetailCategoryRow } from '@/modules/budget/screens/budget/components/spending_plan_detail_category_row';
import { SpendingPlanDetailSummary } from '@/modules/budget/screens/budget/components/spending_plan_detail_summary';
import type { SpendingPlanRowVM } from '@/modules/budget/screens/budget/spending_plans.helpers';

interface SpendingPlanDetailSheetProps {
  isOpen: boolean;
  plan?: SpendingPlanRowVM;
  onOpenChange: (open: boolean) => void;
  onEdit: (id: string) => void;
}

export function SpendingPlanDetailSheet({
  isOpen,
  plan,
  onOpenChange,
  onEdit,
}: SpendingPlanDetailSheetProps) {
  return (
    <Sheet
      isOpen={isOpen && plan !== undefined}
      onOpenChange={onOpenChange}
      title={plan?.name ?? Strings.budgetPlansTitle}
      size="lg"
      scrollable
      footer={
        plan ? (
          <Button
            variant="primary"
            label={Strings.budgetPlanEditTitle}
            accessibilityLabel={`${Strings.budgetPlanEditTitle} ${plan.name}`}
            onPress={() => onEdit(plan.id)}
          />
        ) : undefined
      }
    >
      {plan ? (
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.bodyContent}
        >
          <SpendingPlanDetailSummary detail={plan.detail} />

          <Text style={styles.section}>{Strings.budgetPlansDetailCategories}</Text>
          <View style={styles.categoryRows}>
            {plan.detail.categoryRows.map((row) => (
              <SpendingPlanDetailCategoryRow key={row.categoryId} row={row} />
            ))}
            {plan.detail.flexibleRow ? (
              <View style={styles.flexibleRow}>
                <View style={styles.flexibleIcon}>
                  <MaterialCommunityIcons
                    accessible={false}
                    name="wallet-outline"
                    size={Size.iconXs}
                    color={Colors.dark.gold}
                  />
                </View>
                <View style={styles.flexibleCopy}>
                  <Text style={styles.flexibleLabel}>{plan.detail.flexibleRow.label}</Text>
                  <Text style={styles.flexibleSupporting}>
                    {plan.detail.flexibleRow.supportingLabel}
                  </Text>
                </View>
                <Text style={styles.flexibleAmount}>{plan.detail.flexibleRow.amountLabel}</Text>
              </View>
            ) : null}
          </View>
        </BottomSheetScrollView>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  bodyContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: SHEET_FOOTER_CLEARANCE,
  },
  section: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xxs,
    fontFamily: FontFamily.interMedium,
    fontSize: Type.micro,
    color: Colors.dark.text2,
    textTransform: 'uppercase',
  },
  categoryRows: {
    borderRadius: Radius.lg,
    borderWidth: Size.hairline,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.surface,
    paddingHorizontal: Spacing.sm,
    overflow: 'hidden',
  },
  flexibleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: Size.headerHeight,
    paddingVertical: Spacing.xs,
  },
  flexibleIcon: {
    width: Size.typeIconBox,
    height: Size.typeIconBox,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.surfaceEl,
  },
  flexibleCopy: { flex: 1 },
  flexibleLabel: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  flexibleSupporting: {
    marginTop: Spacing.xxxs,
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.text2,
  },
  flexibleAmount: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.caption,
    color: Colors.dark.text1,
  },
});
