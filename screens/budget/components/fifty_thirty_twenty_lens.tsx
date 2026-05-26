import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Spacing, Type } from '@/constants/theme';
import type { BucketsVM } from '@/screens/budget/budget_buckets.helpers';
import { BucketCard } from '@/screens/budget/components/bucket_card';
import { IncomeSheet } from '@/screens/budget/components/income_sheet';
import { useIncomeSheetState } from '@/screens/budget/components/income_sheet.state';

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
  const { openIncomeSheet } = useIncomeSheetState(useShallow((s) => ({ openIncomeSheet: s.open })));

  const handleEditIncome = () => {
    openIncomeSheet(suggestion, vm.hasIncome ? vm.income : null);
  };

  return (
    <>
      {/* Income header */}
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

          {/* Reconciliation footer */}
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
                  <Text style={[styles.footerLabel, { color: Colors.dark.warning }]}>
                    {Strings.budget5030OverAllocated}
                  </Text>
                  <Text style={[styles.footerAmount, { color: Colors.dark.warning }]}>
                    {formatAmount(vm.unallocated, currency)}
                  </Text>
                </>
              )}
            </View>
          </View>
        </>
      )}

      <IncomeSheet />
    </>
  );
}

const styles = StyleSheet.create({
  incomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  incomeCaption: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.text2,
    marginBottom: 2,
  },
  incomeAmount: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.headline,
    color: Colors.dark.text1,
  },
  editLink: { fontFamily: FontFamily.interMedium, fontSize: Type.body, color: Colors.dark.gold },
  ctaCard: {
    flex: 1,
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  ctaTitle: { fontFamily: FontFamily.soraBold, fontSize: Type.body, color: Colors.dark.text1 },
  ctaBody: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.caption,
    color: Colors.dark.text2,
  },
  ctaAction: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.body,
    color: Colors.dark.gold,
    marginTop: Spacing.xs,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.dark.border,
    paddingTop: Spacing.sm,
    gap: Spacing.xs,
  },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  footerLabel: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.caption,
    color: Colors.dark.text2,
  },
  footerAmount: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.caption,
    color: Colors.dark.text1,
  },
});
