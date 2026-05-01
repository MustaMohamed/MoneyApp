import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Currency } from '@/constants/enums';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import type { Account } from '@/store/account.store';
import { formatAmount } from '../dashboard.helpers';

interface AccountCardProps {
  account: Account;
  rate: number;
  onPress: () => void;
}

export function AccountCard({ account, rate, onPress }: AccountCardProps) {
  const balanceEgp =
    account.currency === Currency.USD ? account.current_balance * rate : account.current_balance;

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View
        style={[styles.colorBar, { backgroundColor: account.color ?? Colors.dark.surfaceEl }]}
      />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {account.name}
        </Text>
        <Text style={styles.balance}>{formatAmount(balanceEgp)} EGP</Text>
        {account.currency === Currency.USD && (
          <Text style={styles.sub}>{formatAmount(account.current_balance, 2)} USD</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 170,
    backgroundColor: Colors.dark.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    overflow: 'hidden',
    marginLeft: Spacing.xs,
  },
  colorBar: { height: 4, width: '100%' },
  body: { padding: Spacing.sm },
  name: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.caption,
    color: Colors.dark.text1,
    marginBottom: Spacing.xxs,
  },
  balance: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.subhead,
    color: Colors.dark.text1,
  },
  sub: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.text2,
    marginTop: Spacing.xxs,
  },
});
