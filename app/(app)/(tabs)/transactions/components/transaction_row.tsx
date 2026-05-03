import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { TransactionType } from '@/constants/enums';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import type { Account } from '@/database/entities/account.entity';
import type { Category } from '@/database/entities/category.entity';
import type { Transaction } from '@/database/entities/transaction.entity';
import { formatTime12h } from '@/utils/format_time_12h';
import { formatTransactionTitle } from '@/utils/format_transaction_title';
import { ms, msFont } from '@/utils/responsive';
import { useRowPressScale } from '../transactions.anim';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface Props {
  tx: Transaction;
  account?: Account;
  toAccount?: Account;
  category?: Category;
  onPress: () => void;
}

const FALLBACK_ICON: IconName = 'shape-outline';

const numberFmt = new Intl.NumberFormat('en-US', { style: 'decimal' });

interface TypeStyle {
  color: string;
  icon: IconName;
  prefix: string;
}

function styleForType(tx: Transaction, category?: Category): TypeStyle {
  switch (tx.type) {
    case TransactionType.Expense:
      return {
        color: Colors.dark.negative,
        icon: (category?.icon as IconName) ?? FALLBACK_ICON,
        prefix: '−',
      };
    case TransactionType.Income:
      return {
        color: Colors.dark.positive,
        icon: (category?.icon as IconName) ?? FALLBACK_ICON,
        prefix: '+',
      };
    case TransactionType.Transfer:
      return {
        color: Colors.shared.transferBlue,
        icon: 'swap-horizontal',
        prefix: '',
      };
    case TransactionType.CCPayment:
      return {
        color: Colors.shared.ccPlum,
        icon: 'credit-card-refund',
        prefix: '',
      };
  }
}

function bgFor(typeColor: string, categoryColor?: string): string {
  // Category color takes precedence for expense / income; type accent for the others.
  const base = categoryColor ?? typeColor;
  // 18% opacity tint via 8-digit hex (0x2E ≈ 18%).
  return base.length === 7 ? `${base}2E` : base;
}

export function TransactionRow({ tx, account, toAccount, category, onPress }: Props) {
  const { scale, onPressIn, onPressOut } = useRowPressScale();
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const { title, subtitle } = formatTransactionTitle({ tx, account, toAccount, category });
  const t = styleForType(tx, category);
  const iconBg = bgFor(t.color, category?.color);
  const amountText = `${t.prefix}${numberFmt.format(tx.egp_amount)} EGP`;
  const time = formatTime12h(tx.transaction_time);
  const currencyLine =
    tx.exchange_rate !== null
      ? `${tx.currency} · ${numberFmt.format(tx.exchange_rate)}`
      : tx.currency;

  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[styles.row, animStyle]}>
        <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
          <MaterialCommunityIcons name={t.icon} size={ms(18)} color={t.color} />
        </View>
        <View style={styles.center}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle} · {currencyLine}
          </Text>
        </View>
        <View style={styles.right}>
          <Text style={[styles.amount, { color: t.color }]}>{amountText}</Text>
          <Text style={styles.time}>{time}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: ms(48),
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
    backgroundColor: Colors.dark.bg,
  },
  iconBox: {
    width: ms(36),
    height: ms(36),
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { flex: 1 },
  title: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  subtitle: {
    fontFamily: FontFamily.interRegular,
    fontSize: msFont(11),
    color: Colors.dark.text2,
    marginTop: 2,
  },
  right: { alignItems: 'flex-end' },
  amount: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.bodyStrong,
  },
  time: {
    fontFamily: FontFamily.interRegular,
    fontSize: msFont(10),
    color: Colors.dark.text2,
    marginTop: 2,
  },
});
