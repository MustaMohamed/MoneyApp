import { StyleSheet, Text, View } from 'react-native';

import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import { formatAmount } from '@/utils/format_amount';
import type { Account } from '@/store/account.store';

interface MiniChartProps {
  account: Account;
}

export function MiniChart({ account }: MiniChartProps) {
  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        <View style={[styles.fill, { backgroundColor: account.color ?? Colors.dark.surfaceEl }]} />
      </View>
      <Text style={styles.label}>
        {formatAmount(account.current_balance, 2)} {account.currency}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.sm,
    marginTop: Spacing.sm,
    backgroundColor: Colors.dark.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  bar: {
    height: ms(4),
    backgroundColor: Colors.dark.surfaceEl,
    borderRadius: ms(2),
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  fill: { width: '100%', height: '100%', borderRadius: ms(2) },
  label: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.headline,
    color: Colors.dark.text1,
    textAlign: 'center',
  },
});
