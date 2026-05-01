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

function availableCreditColor(available: number, limit: number): string {
  if (limit <= 0) return Colors.dark.text2;
  const pct = available / limit;
  if (pct > 0.5) return Colors.dark.positive;
  if (pct >= 0.2) return '#D4830A';
  return Colors.dark.negative;
}

interface InfoRow {
  label: string;
  value: string;
  valueColor?: string;
}

function buildInfoRows(account: Account, rate: number): InfoRow[] {
  const toEgp = (n: number) => (account.currency === Currency.USD ? n * rate : n);

  if (account.type === AccountType.CreditCard) {
    const limit = account.credit_limit ?? 0;
    const balance = account.current_balance;
    const available = Math.max(0, limit - balance);
    const isOverLimit = balance > limit && limit > 0;
    const availColor = availableCreditColor(available, limit);
    const minPay = account.minimum_payment;

    return [
      {
        label: Strings.cardLimitLabel,
        value: `${formatAmount(toEgp(limit))} EGP`,
      },
      {
        label: Strings.cardAvailableLabel,
        value: isOverLimit ? Strings.cardOverLimit : `${formatAmount(toEgp(available))} EGP`,
        valueColor: availColor,
      },
      {
        label: Strings.cardMinPayLabel,
        value: minPay != null && minPay > 0 ? `${formatAmount(toEgp(minPay))} EGP` : '—',
      },
    ];
  }

  return [
    { label: Strings.cardTypeLabel, value: TYPE_LABELS[account.type] },
    { label: Strings.cardCurrencyLabel, value: account.currency },
    {
      label: Strings.cardOpeningLabel,
      value: `${formatAmount(account.opening_balance)} ${account.currency}`,
    },
  ];
}

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
  const infoRows = buildInfoRows(account, rate);

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={[styles.accentBar, { backgroundColor: color }]} />
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>
            {account.name}
          </Text>
          <View style={[styles.currencyPill, { borderColor: color + '55' }]}>
            <Text style={styles.currencyPillText}>{account.currency}</Text>
          </View>
        </View>

        <View style={styles.balanceRow}>
          <View style={[styles.iconBox, { backgroundColor: color + '22' }]}>
            <MaterialCommunityIcons name={icon} size={14} color={color} />
          </View>
          <Text style={[styles.balance, { color: balanceColor }]} numberOfLines={1}>
            {formatAmount(balanceEgp)}
          </Text>
        </View>

        <View style={styles.divider} />

        {infoRows.map((row, i) => (
          <View key={i} style={styles.infoRow}>
            <Text style={styles.infoLabel}>{row.label}</Text>
            <Text
              style={[styles.infoValue, row.valueColor ? { color: row.valueColor } : undefined]}
              numberOfLines={1}
            >
              {row.value}
            </Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

export const CARD_HEIGHT = Size.typeIconBox * 4 + Spacing.xxl + 6;

const styles = StyleSheet.create({
  card: {
    width: 190,
    minHeight: CARD_HEIGHT,
    backgroundColor: Colors.dark.surfaceEl,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    overflow: 'hidden',
    marginLeft: Spacing.xs,
  },
  accentBar: { height: 3, width: '100%' },
  body: {
    flex: 1,
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xxs,
  },
  name: {
    flex: 1,
    fontFamily: FontFamily.soraBold,
    fontSize: Type.caption,
    color: Colors.dark.text1,
  },
  currencyPill: {
    borderWidth: 1,
    borderRadius: 3,
    paddingHorizontal: Spacing.xxs + 2,
    paddingVertical: 2,
  },
  currencyPillText: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.micro,
    color: Colors.dark.text2,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  balance: {
    flex: 1,
    fontFamily: FontFamily.soraBold,
    fontSize: Type.subhead,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.dark.border,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  infoLabel: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.text2,
    flexShrink: 0,
  },
  infoValue: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.micro,
    color: Colors.dark.text1,
    textAlign: 'right',
    flex: 1,
  },
});
