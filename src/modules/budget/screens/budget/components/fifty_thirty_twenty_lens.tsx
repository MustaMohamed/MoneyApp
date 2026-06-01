import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import type { BucketsVM } from '@/modules/budget/screens/budget/budget_buckets.helpers';
import { BucketCard } from '@/modules/budget/screens/budget/components/bucket_card';
import { IncomeSheet } from '@/modules/budget/screens/budget/components/income_sheet';
import { useIncomeSheetState } from '@/modules/budget/screens/budget/components/income_sheet.state';
import { ms } from '@/utils/responsive';

interface FiftyThirtyTwentyLensProps {
  vm: BucketsVM;
  suggestion: number | null;
  currency?: string;
}

function formatAmount(amount: number, currency: string): string {
  return `${currency} ${new Intl.NumberFormat('en-US', { style: 'decimal' }).format(Math.round(Math.abs(amount)))}`;
}

export function FiftyThirtyTwentyLens({
  vm,
  suggestion,
  currency = 'EGP',
}: FiftyThirtyTwentyLensProps) {
  const incomeSheetState = useIncomeSheetState();
  const { open: openIncomeSheet } = incomeSheetState;

  const handleEditIncome = () => {
    openIncomeSheet(suggestion, vm.hasIncome ? vm.income : null);
  };

  return (
    <>
      <View style={styles.incomeHeader}>
        {vm.hasIncome ? (
          <>
            <View>
              <Text style={styles.incomeCaption}>{Strings.budget5030MonthlyIncome}</Text>
              <Text style={styles.incomeAmount}>{formatAmount(vm.income, currency)}</Text>
            </View>
            <Text style={styles.editLink} onPress={handleEditIncome} accessibilityRole="button">
              {Strings.budget5030EditIncome}
            </Text>
          </>
        ) : (
          <View style={styles.ctaCard}>
            <Text style={styles.ctaTitle}>{Strings.budget5030SetIncomeCta}</Text>
            <Text style={styles.ctaBody}>{Strings.budget5030SetIncomeCtaBody}</Text>
            <Text style={styles.ctaAction} onPress={handleEditIncome} accessibilityRole="button">
              {Strings.budget5030SetIncomeCta}
            </Text>
          </View>
        )}
      </View>

      {vm.hasIncome && (
        <>
          {vm.buckets.map((bucket) => (
            <BucketCard key={bucket.group} vm={bucket} currency={currency} />
          ))}

          <View style={styles.footer}>
            {vm.ungrouped > 0 && (
              <View style={styles.footerRow}>
                <Text style={styles.footerLabel}>{Strings.budget5030Ungrouped}</Text>
                <Text style={styles.footerAmount}>{formatAmount(vm.ungrouped, currency)}</Text>
              </View>
            )}
            <View style={styles.footerRow}>
              {vm.unallocated >= 0 ? (
                <>
                  <Text style={styles.footerLabel}>{Strings.budget5030Unallocated}</Text>
                  <Text style={styles.footerAmount}>{formatAmount(vm.unallocated, currency)}</Text>
                </>
              ) : (
                <>
                  <Text style={[styles.footerLabel, { color: Colors.dark.negative }]}>
                    {Strings.budget5030OverAllocated}
                  </Text>
                  <Text style={[styles.footerAmount, { color: Colors.dark.negative }]}>
                    {formatAmount(Math.abs(vm.unallocated), currency)}
                  </Text>
                </>
              )}
            </View>
          </View>
        </>
      )}

      <IncomeSheet incomeSheetState={incomeSheetState} />
    </>
  );
}

const styles = StyleSheet.create({
  incomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  incomeCaption: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.text2,
    marginBottom: ms(2),
  },
  incomeAmount: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.title,
    color: Colors.dark.text1,
  },
  editLink: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.body,
    color: Colors.dark.gold,
  },
  ctaCard: {
    flex: 1,
    backgroundColor: Colors.dark.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  ctaTitle: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  ctaBody: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.text2,
  },
  ctaAction: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.body,
    color: Colors.dark.gold,
    marginTop: Spacing.xs,
  },
  footer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    gap: Spacing.xs,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLabel: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.text2,
  },
  footerAmount: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.micro,
    color: Colors.dark.text1,
  },
});
