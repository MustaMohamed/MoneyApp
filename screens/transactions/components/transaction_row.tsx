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

/**
 * Type-color mapping — aligned with §7's four-type colour system so the
 * transactions list visually mirrors the Add Transaction tabs / AmountHero:
 *   Expense     → danger   (red)
 *   Income      → success  (green)
 *   Transfer    → info     (blue)
 *   CC Payment  → accent-cc (purple)
 * The previous mapping fell back to `text-foreground` for Expense and
 * lumped Transfer + CC Payment together under the gold `accent` token —
 * leaving the list rows visually inconsistent with the form.
 */
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
  return (category?.icon as IconName) ?? FALLBACK_ICON;
}

export function TransactionRow({
  tx,
  account,
  toAccount,
  category,
  onPress,
}: Props): React.ReactElement {
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
      <Animated.View style={[animStyle]} className="px-4 py-3 border-b border-separator">
        {/*
          Top: 3-column flex row (icon · title+ctx · amount-block).
          The middle column carries the title and account context. The note
          used to live here too, sharing the column's narrow width and
          getting truncated to one line by ellipsis — long notes were
          essentially invisible. It is now lifted out into its own
          full-width row below this one (see `note` block).
        */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }} className="gap-3">
          <View
            className={`w-9 h-9 rounded-lg items-center justify-center mt-0.5 ${iconBgClass(tx.type)}`}
          >
            <MaterialCommunityIcons
              name={pickIcon(tx, category)}
              size={18}
              color={category?.color ?? '#D4AF37'}
            />
          </View>
          <View className="flex-1 min-w-0">
            <View className="flex-row items-center gap-2 flex-wrap">
              <Text className="font-sora font-bold text-[13px] text-foreground">{title}</Text>
              {tx.commitment_payment_id != null ? <TypeBadge type="commitment" /> : null}
            </View>
            <Text
              className="font-inter font-medium text-[10.5px] text-foreground/55 mt-1"
              numberOfLines={1}
            >
              {ctx}
            </Text>
          </View>
          <View className="items-end">
            <Text className={`font-sora font-bold text-[14px] ${amountColorClass(tx.type)}`}>
              {nativeText}
            </Text>
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
        </View>

        {/*
          Note row — full-width, lives BELOW the 3-column header so a long
          note has the entire row width to breathe in (up to 2 lines, then
          ellipsis). pl-12 lines the note up with the title column (icon
          width 36 + gap 12 = 48px ≈ pl-12). Only rendered when a note
          exists; no empty spacer otherwise.
        */}
        {note != null ? (
          <Text
            className="font-inter italic text-[11.5px] text-muted mt-1.5 pl-12"
            numberOfLines={2}
          >
            {note}
          </Text>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}
