import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';

const TABS: { type: TransactionType; label: string; color: string }[] = [
  { type: TransactionType.Expense, label: Strings.addTxTypeExpense, color: Colors.dark.negative },
  { type: TransactionType.Income, label: Strings.addTxTypeIncome, color: Colors.dark.positive },
  { type: TransactionType.Transfer, label: Strings.addTxTypeTransfer, color: '#4A9EE0' },
  { type: TransactionType.CCPayment, label: Strings.addTxTypeCCPayment, color: '#9B73D4' },
];

interface Props {
  active: TransactionType;
  onSelect: (type: TransactionType) => void;
}

export function TypeTabs({ active, onSelect }: Props) {
  return (
    <View style={styles.row}>
      {TABS.map(({ type, label, color }) => {
        const isActive = type === active;
        return (
          <Pressable
            key={type}
            style={[styles.tab, isActive && { borderBottomColor: color, borderBottomWidth: 2 }]}
            onPress={() => onSelect(type)}
            hitSlop={4}
          >
            <Text style={[styles.label, isActive && { color }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
    marginHorizontal: -Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  label: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.caption,
    color: Colors.dark.text2,
  },
});
