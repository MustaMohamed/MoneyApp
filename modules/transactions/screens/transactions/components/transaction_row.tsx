// modules/transactions/screens/transactions/components/transaction_row.tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PressableFeedback } from 'heroui-native';
import React, { useMemo } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { SwipeableRow, type SwipeAction } from '@/components/ui/swipeable_row';
import { Text } from '@/components/ui/text';
import { TypeBadge } from '@/components/ui/type_badge';
import { Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { GoldTokens } from '@/constants/theme_tokens';
import type { Account } from '@/database/entities/account.entity';
import type { Category } from '@/database/entities/category.entity';
import { formatTime12h } from '@/utils/format_time_12h';
import { toIconName } from '@/utils/icon_name_guard';

import type { Transaction } from '../../../entities/transaction.entity';
import { useRowPressScale } from './transaction_row.anim';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface Props {
  tx: Transaction;
  account?: Account;
  toAccount?: Account;
  category?: Category;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
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
    case TransactionType.Expense:
      return 'text-danger';
    case TransactionType.Transfer:
      return 'text-info';
    case TransactionType.CCPayment:
      return 'text-accent-cc';
  }
}

function iconBgClass(type: TransactionType): string {
  switch (type) {
    case TransactionType.Income:
      return 'bg-success/15';
    case TransactionType.Expense:
      return 'bg-danger/15';
    case TransactionType.Transfer:
      return 'bg-info/15';
    case TransactionType.CCPayment:
      return 'bg-accent-cc/15';
  }
}

function pickIcon(tx: Transaction, category?: Category): IconName {
  if (tx.type === TransactionType.Transfer) return 'swap-horizontal';
  if (tx.type === TransactionType.CCPayment) return 'credit-card-refund';
  // oxlint-disable-next-line typescript/no-unnecessary-condition -- category can be undefined at runtime
  return toIconName(category?.icon, FALLBACK_ICON);
}

export function TransactionRow({
  tx,
  account,
  toAccount,
  category,
  onPress,
  onEdit,
  onDelete,
}: Props): React.ReactElement {
  const { scale, onPressIn, onPressOut } = useRowPressScale();
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const title = useMemo(() => categoryTitle(tx, category), [tx, category]);
  // oxlint-disable-next-line typescript/prefer-nullish-coalescing -- || is intentional: empty string maps to null (blank note → no note row rendered)
  const note = tx.note?.trim() || null;
  const ctx = useMemo(() => accountContext(tx, account, toAccount), [tx, account, toAccount]);

  const showEquiv = tx.currency !== Currency.EGP;
  const equivPrefix =
    tx.type === TransactionType.Transfer || tx.type === TransactionType.CCPayment ? '→ ' : '≈ ';
  const nativeText = `${signPrefix(tx.type)}${numberFmt.format(tx.amount)} ${tx.currency}`;
  const egpText = `${equivPrefix}${numberFmt.format(tx.egp_amount)} EGP`;
  const rateText = tx.exchange_rate != null ? `@ ${tx.exchange_rate}` : '';

  const actions: SwipeAction[] = [
    {
      key: 'edit',
      label: Strings.swipeEdit,
      icon: 'pencil-outline',
      variant: 'neutral',
      onPress: onEdit,
    },
    {
      key: 'delete',
      label: Strings.swipeDelete,
      icon: 'trash-can-outline',
      variant: 'destructive',
      onPress: onDelete,
    },
  ];

  return (
    <SwipeableRow rowId={tx.id} actions={actions} accessibilityLabel={`${title}, ${nativeText}`}>
      {/*
        animation={false} disables PressableFeedback's built-in scale so it
        does not conflict with the manual Reanimated scale from useRowPressScale.
        onPressIn/onPressOut are forwarded by PressableFeedback to our callbacks.
      */}
      <PressableFeedback
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        animation={false}
      >
        <Animated.View style={[animStyle]} className="border-separator border-b px-4 py-3">
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }} className="gap-3">
            <View
              className={`mt-0.5 h-9 w-9 items-center justify-center rounded-lg ${iconBgClass(tx.type)}`}
            >
              <MaterialCommunityIcons
                name={pickIcon(tx, category)}
                size={18}
                color={category?.color ?? GoldTokens[500]}
              />
            </View>
            <View className="min-w-0 flex-1">
              <View className="flex-row flex-wrap items-center gap-2">
                <Text className="font-sora text-foreground text-[13px] font-bold">{title}</Text>
                {tx.commitment_payment_id != null ? <TypeBadge type="commitment" /> : null}
              </View>
              <Text
                className="font-inter text-foreground/55 mt-1 text-[10.5px] font-medium"
                numberOfLines={1}
              >
                {ctx}
              </Text>
            </View>
            <View className="items-end">
              <Text className={`font-sora text-[14px] font-bold ${amountColorClass(tx.type)}`}>
                {nativeText}
              </Text>
              {showEquiv ? (
                <Text className="font-inter text-foreground/60 mt-0.5 text-[10px] font-medium">
                  {egpText}
                  {rateText ? <Text className="opacity-70"> {rateText}</Text> : null}
                </Text>
              ) : null}
              <Text className="font-inter text-foreground/40 mt-0.5 text-[10px]">
                {formatTime12h(tx.transaction_time)}
              </Text>
            </View>
          </View>

          {note != null ? (
            <Text
              className="font-inter text-muted mt-1.5 pl-12 text-[11.5px] italic"
              numberOfLines={2}
            >
              {note}
            </Text>
          ) : null}
        </Animated.View>
      </PressableFeedback>
    </SwipeableRow>
  );
}
