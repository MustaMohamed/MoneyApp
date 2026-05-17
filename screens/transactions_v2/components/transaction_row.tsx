import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Text } from '@/components/ui/text';
import { TypeBadge } from '@/components/ui/type_badge';
import type { Account } from '@/database/entities/account.entity';
import type { Category } from '@/database/entities/category.entity';
import type { Transaction } from '@/database/entities/transaction.entity';
import { formatTime12h } from '@/utils/format_time_12h';
import { useRowPressScale } from './transaction_row.anim';

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

function categoryTitle(tx: Transaction, category?: Category): string {
  switch (tx.type) {
    case TransactionType.Expense:
    case TransactionType.Income:
      return category?.name ?? Strings.uncategorized;
    case TransactionType.Transfer:
      return Strings.transferTitle;
    case TransactionType.CCPayment:
      return Strings.addTxTypeCCPayment;
  }
}

function accountContext(tx: Transaction, account?: Account, toAccount?: Account): string {
  const fromName = account?.name ?? Strings.unknownAccount;
  switch (tx.type) {
    case TransactionType.Expense:
    case TransactionType.Income:
      return fromName;
    case TransactionType.Transfer:
    case TransactionType.CCPayment:
      return `${fromName} → ${toAccount?.name ?? Strings.unknownAccount}`;
  }
}

function signPrefix(type: TransactionType): string {
  if (type === TransactionType.Income) return '+';
  if (type === TransactionType.Expense) return '−';
  return '';
}

function amountColorClass(type: TransactionType): string {
  switch (type) {
    case TransactionType.Income:
      return 'text-success';
    case TransactionType.Transfer:
      return 'text-accent';
    case TransactionType.CCPayment:
      return 'text-accent';
    default:
      return 'text-foreground';
  }
}

function iconBgClass(type: TransactionType): string {
  switch (type) {
    case TransactionType.Transfer:
      return 'bg-accent/15';
    case TransactionType.CCPayment:
      return 'bg-accent/15';
    case TransactionType.Income:
      return 'bg-success/15';
    default:
      return 'bg-default/15';
  }
}

function pickIcon(tx: Transaction, category?: Category): IconName {
  if (tx.type === TransactionType.Transfer) return 'swap-horizontal';
  if (tx.type === TransactionType.CCPayment) return 'credit-card-refund';
  return (category?.icon as IconName) ?? FALLBACK_ICON;
}

export function TransactionRow({ tx, account, toAccount, category, onPress }: Props): React.ReactElement {
  const { scale, onPressIn, onPressOut } = useRowPressScale();
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const title = useMemo(() => categoryTitle(tx, category), [tx, category]);
  const note = tx.note?.trim() || null;
  const ctx = useMemo(() => accountContext(tx, account, toAccount), [tx, account, toAccount]);

  const showEquiv = tx.currency !== 'EGP';
  const equivPrefix =
    tx.type === TransactionType.Transfer || tx.type === TransactionType.CCPayment ? '→ ' : '≈ ';
  const nativeText = `${signPrefix(tx.type)}${numberFmt.format(tx.amount)} ${tx.currency}`;
  const egpText = `${equivPrefix}${numberFmt.format(tx.egp_amount)} EGP`;
  const rateText = tx.exchange_rate != null ? `@ ${tx.exchange_rate}` : '';

  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View
        style={[{ flexDirection: 'row', alignItems: 'flex-start' }, animStyle]}
        className="px-4 py-3 gap-3 border-b border-separator"
      >
        <View className={`w-9 h-9 rounded-lg items-center justify-center mt-0.5 ${iconBgClass(tx.type)}`}>
          <MaterialCommunityIcons name={pickIcon(tx, category)} size={18} color={category?.color ?? '#D4AF37'} />
        </View>
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-2 flex-wrap">
            <Text className="font-sora font-bold text-[13px] text-foreground">{title}</Text>
            {tx.commitment_payment_id != null ? <TypeBadge type="commitment" /> : null}
          </View>
          {note != null ? (
            <Text className="font-inter italic text-[11.5px] text-muted mt-1" numberOfLines={1}>
              {note}
            </Text>
          ) : null}
          <Text className="font-inter font-medium text-[10.5px] text-foreground/55 mt-1" numberOfLines={1}>
            {ctx}
          </Text>
        </View>
        <View className="items-end">
          <Text className={`font-sora font-bold text-[14px] ${amountColorClass(tx.type)}`}>{nativeText}</Text>
          {showEquiv ? (
            <Text className="font-inter font-medium text-[10px] text-foreground/60 mt-0.5">
              {egpText}
              {rateText ? <Text className="opacity-70"> {rateText}</Text> : null}
            </Text>
          ) : null}
          <Text className="font-inter text-[10px] text-foreground/40 mt-0.5">
            {formatTime12h(tx.transaction_time)}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}
