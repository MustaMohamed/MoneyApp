import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import type { CategoryBudgetRowVM } from '@/screens/budget/budget.hook';
import { BudgetBar } from '@/screens/budget/components/budget_bar';
import { formatAmount } from '@/utils/format_amount';
import { toIconName } from '@/utils/icon_name_guard';
import { ms } from '@/utils/responsive';

export interface CategoryBudgetRowProps {
  row: CategoryBudgetRowVM;
  onPress: () => void;
}

export function CategoryBudgetRow({ row, onPress }: CategoryBudgetRowProps) {
  const pill =
    row.status === 'over'
      ? Strings.budgetOverPill
      : row.status === 'warning'
        ? `${Math.round(row.pct * 100)}%`
        : null;
  return (
    <Pressable
      onPress={onPress}
      style={styles.row}
      accessibilityRole="button"
      accessibilityLabel={`${row.name} budget`}
    >
      <View style={[styles.icon, { backgroundColor: `${row.color}22` }]}>
        <MaterialCommunityIcons
          name={toIconName(row.icon, 'tag-outline')}
          size={ms(15)}
          color={row.color}
        />
      </View>
      <View style={styles.body}>
        <View style={styles.top}>
          <View style={styles.nameWrap}>
            <Text style={styles.name}>{row.name}</Text>
            {pill !== null && (
              <View
                style={[styles.pill, row.status === 'over' ? styles.pillOver : styles.pillWarn]}
              >
                <Text
                  style={[
                    styles.pillText,
                    row.status === 'over' ? styles.pillTextOver : styles.pillTextWarn,
                  ]}
                >
                  {pill}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.amt}>
            <Text style={[styles.amtSpent, row.status === 'over' && styles.amtOver]}>
              {formatAmount(row.spent)}
            </Text>
            {` / ${formatAmount(row.limit)}`}
          </Text>
        </View>
        <BudgetBar pct={row.pct} status={row.status} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(10),
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.dark.border,
  },
  icon: {
    width: ms(32),
    height: ms(32),
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: { flex: 1 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  nameWrap: { flexDirection: 'row', alignItems: 'center', gap: ms(6) },
  name: { fontFamily: FontFamily.interSemi, fontSize: Type.body, color: Colors.dark.text1 },
  pill: { paddingHorizontal: ms(6), paddingVertical: ms(1), borderRadius: Radius.sm },
  pillWarn: { backgroundColor: 'rgba(212,131,10,0.18)' },
  pillOver: { backgroundColor: 'rgba(224,90,66,0.15)' },
  pillText: { fontFamily: FontFamily.interMedium, fontSize: ms(9) },
  pillTextWarn: { color: Colors.dark.warning },
  pillTextOver: { color: Colors.dark.negative },
  amt: { fontFamily: FontFamily.interRegular, fontSize: Type.micro, color: Colors.dark.text2 },
  amtSpent: { fontFamily: FontFamily.interSemi, color: Colors.dark.text1 },
  amtOver: { color: Colors.dark.negative },
});
