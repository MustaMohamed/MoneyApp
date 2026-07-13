import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Chip } from 'heroui-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Colors, FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';
import { BudgetRing } from '@/modules/budget/screens/budget/components/budget_ring';
import type { SpendingPlanDetailCategoryRowVM } from '@/modules/budget/screens/budget/spending_plans.helpers';
import { toIconName } from '@/utils/icon_name_guard';

interface SpendingPlanDetailCategoryRowProps {
  row: SpendingPlanDetailCategoryRowVM;
}

export function SpendingPlanDetailCategoryRow({ row }: SpendingPlanDetailCategoryRowProps) {
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={row.accessibilityLabel}
      style={styles.row}
    >
      {row.kind === 'allocated' ? (
        <BudgetRing
          pct={row.pct}
          color={row.progressColor}
          size={Size.typeIconBox}
          stroke={Spacing.xxxs}
        >
          <MaterialCommunityIcons
            accessible={false}
            name={toIconName(row.icon, 'tag-outline')}
            size={Size.iconXs}
            color={row.color}
          />
        </BudgetRing>
      ) : (
        <View style={styles.iconBox}>
          <MaterialCommunityIcons
            accessible={false}
            name={toIconName(row.icon, 'tag-outline')}
            size={Size.iconXs}
            color={row.color}
          />
        </View>
      )}

      <View style={styles.copy}>
        <Text style={styles.name} numberOfLines={1}>
          {row.categoryName}
        </Text>
        <Text
          style={[
            styles.supporting,
            row.kind === 'allocated' ? { color: row.balanceColor } : undefined,
          ]}
          numberOfLines={1}
        >
          {row.kind === 'allocated' ? row.balanceLabel : row.supportingLabel}
        </Text>
      </View>

      <View style={styles.amountWrap}>
        <Text style={styles.amount}>{row.amountLabel}</Text>
        {row.kind === 'allocated' ? (
          <View style={styles.statusRow}>
            <Text style={styles.percentage}>{row.percentageLabel}</Text>
            <Chip
              size="sm"
              variant="soft"
              color={row.statusTone}
              animation="disable-all"
              style={styles.statusChip}
            >
              <Chip.Label style={styles.statusLabel}>{row.statusLabel}</Chip.Label>
            </Chip>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: Size.headerHeight,
    paddingVertical: Spacing.xs,
    borderBottomWidth: Size.hairline,
    borderBottomColor: Colors.dark.border,
  },
  iconBox: {
    width: Size.typeIconBox,
    height: Size.typeIconBox,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.surfaceEl,
  },
  copy: { flex: 1, minWidth: 0 },
  name: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  supporting: {
    marginTop: Spacing.xxxs,
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.text2,
  },
  amountWrap: { alignItems: 'flex-end' },
  amount: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.caption,
    color: Colors.dark.text1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    marginTop: Spacing.xxxs,
  },
  percentage: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.micro,
    color: Colors.dark.text2,
  },
  statusChip: {
    minHeight: Size.checkCircle,
    paddingHorizontal: Spacing.xxs,
    paddingVertical: 0,
  },
  statusLabel: { fontFamily: FontFamily.interSemi, fontSize: Type.micro },
});
