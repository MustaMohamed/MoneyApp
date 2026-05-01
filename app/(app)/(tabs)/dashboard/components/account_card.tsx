import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AccountType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { AccountColors, Colors, FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';
import type { Account } from '@/store/account.store';
import { formatAmount } from '@/utils/format_amount';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const TYPE_ICONS: Record<AccountType, IconName> = {
  [AccountType.Bank]: 'bank',
  [AccountType.SmartWallet]: 'cellphone-nfc',
  [AccountType.PhysicalWallet]: 'wallet',
  [AccountType.PhysicalSavings]: 'piggy-bank',
  [AccountType.CreditCard]: 'credit-card',
};

const TYPE_LABELS: Record<AccountType, string> = {
  [AccountType.Bank]: Strings.typeBank,
  [AccountType.SmartWallet]: Strings.typeSmartWallet,
  [AccountType.PhysicalWallet]: Strings.typePhysicalWallet,
  [AccountType.PhysicalSavings]: Strings.typePhysicalSavings,
  [AccountType.CreditCard]: Strings.typeCreditCard,
};

interface AccountCardProps {
  account: Account;
  rate: number;
  onPress: () => void;
}

export function AccountCard({ account, rate, onPress }: AccountCardProps) {
  const balanceEgp =
    account.currency === Currency.USD ? account.current_balance * rate : account.current_balance;

  const color = account.color ?? AccountColors[0];
  const isCreditCard = account.type === AccountType.CreditCard;
  const balanceColor = isCreditCard ? Colors.dark.negative : Colors.dark.gold;
  const icon = TYPE_ICONS[account.type];
  const typeLabel = TYPE_LABELS[account.type];

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={[styles.colorBar, { backgroundColor: color }]} />
      <View style={styles.body}>
        <View
          style={[styles.iconBox, { backgroundColor: color + '22', borderColor: color + '55' }]}
        >
          <MaterialCommunityIcons name={icon} size={Size.iconSm} color={color} />
        </View>
        <Text style={styles.name} numberOfLines={1}>
          {account.name}
        </Text>
        <Text style={styles.typeLabel}>{typeLabel}</Text>
        <View style={styles.balanceRow}>
          <Text style={[styles.balance, { color: balanceColor }]}>{formatAmount(balanceEgp)}</Text>
          <Text style={styles.currency}> EGP</Text>
        </View>
        {account.currency === Currency.USD && (
          <Text style={styles.sub}>{formatAmount(account.current_balance, 2)} USD</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 160,
    backgroundColor: Colors.dark.surfaceEl,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    overflow: 'hidden',
    marginLeft: Spacing.xs,
  },
  colorBar: { height: 4, width: '100%' },
  body: { padding: Spacing.sm },
  iconBox: {
    width: Size.typeIconBox,
    height: Size.typeIconBox,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  name: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  typeLabel: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.caption,
    color: Colors.dark.text2,
    marginTop: Spacing.xxs,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: Spacing.xs,
  },
  balance: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.subhead,
  },
  currency: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.micro,
    color: Colors.dark.text2,
  },
  sub: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.text2,
    marginTop: Spacing.xxs,
  },
});
