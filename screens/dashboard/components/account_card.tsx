import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AccountType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { AccountColors, Colors, FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';
import type { AccountStats } from '@/database/account_stats';
import type { Account } from '@/store/account.store';
import { formatAmount } from '@/utils/format_amount';
import { ms } from '@/utils/responsive';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const TYPE_ICONS: Record<AccountType, IconName> = {
  [AccountType.Bank]: 'bank',
  [AccountType.SmartWallet]: 'cellphone-nfc',
  [AccountType.PhysicalWallet]: 'wallet',
  [AccountType.PhysicalSavings]: 'piggy-bank',
  [AccountType.CreditCard]: 'credit-card',
};

function availableCreditColor(available: number, limit: number): string {
  if (limit <= 0) return Colors.dark.text2;
  const pct = available / limit;
  if (pct > 0.5) return Colors.dark.positive;
  if (pct >= 0.2) return '#D4830A';
  return Colors.dark.negative;
}

function nextDueDate(dueDay: number): string {
  const today = new Date();
  const thisMonthDue = new Date(today.getFullYear(), today.getMonth(), dueDay);
  const target =
    thisMonthDue.getDate() < today.getDate() || thisMonthDue.getMonth() < today.getMonth()
      ? new Date(today.getFullYear(), today.getMonth() + 1, dueDay)
      : thisMonthDue;
  return target.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface InfoRow {
  label: string;
  value: string;
  valueColor?: string;
  icon?: 'up' | 'down';
}

function buildInfoRows(account: Account, rate: number, stats: AccountStats | undefined): InfoRow[] {
  const s = stats ?? { month_in: 0, month_out: 0, week_in: 0, week_out: 0 };
  const cur = account.currency;
  const isUSD = cur === Currency.USD;

  // ─── Credit Card ────────────────────────────────────────────────────────────
  if (account.type === AccountType.CreditCard) {
    const limit = account.credit_limit ?? 0;
    const balance = account.current_balance;
    const available = Math.max(0, limit - balance);
    const isOverLimit = balance > limit && limit > 0;
    const availColor = availableCreditColor(available, limit);
    const dueDay = account.statement_due_day;

    return [
      {
        label: Strings.cardLimitLabel,
        value: `${formatAmount(limit)} EGP`,
      },
      {
        label: Strings.cardAvailableLabel,
        value: isOverLimit ? Strings.cardOverLimit : `${formatAmount(available)} EGP`,
        valueColor: availColor,
      },
      {
        label: Strings.cardDueDateLabel,
        value: dueDay != null && dueDay > 0 ? nextDueDate(dueDay) : '—',
      },
    ];
  }

  // ─── Physical Wallet (spending) ──────────────────────────────────────────────
  if (account.type === AccountType.PhysicalWallet) {
    const daysElapsed = Math.max(1, new Date().getDate());
    const avgDay = s.month_out / daysElapsed;
    return [
      {
        label: Strings.cardMonthSpendLabel,
        value: `${formatAmount(s.month_out)} ${cur}`,
        valueColor: s.month_out > 0 ? Colors.dark.negative : Colors.dark.text1,
      },
      {
        label: Strings.cardAvgDayLabel,
        value: `${formatAmount(avgDay, 1)} ${cur}`,
      },
      {
        label: Strings.cardWeekSpendLabel,
        value: `${formatAmount(s.week_out)} ${cur}`,
        valueColor: s.week_out > 0 ? Colors.dark.negative : Colors.dark.text1,
      },
    ];
  }

  // ─── Physical Savings ────────────────────────────────────────────────────────
  if (account.type === AccountType.PhysicalSavings) {
    const change = s.month_in - s.month_out;
    const monthStart = account.current_balance - change;
    const changeColor = change >= 0 ? Colors.dark.positive : Colors.dark.negative;
    return [
      {
        label: Strings.cardMonthStartLabel,
        value: `${formatAmount(Math.max(0, monthStart))} ${cur}`,
      },
      {
        label: Strings.cardChangeLabel,
        value: `${change >= 0 ? '+' : ''}${formatAmount(change)} ${cur}`,
        valueColor: changeColor,
        icon: change >= 0 ? 'up' : 'down',
      },
    ];
  }

  // ─── Bank / SmartWallet ──────────────────────────────────────────────────────
  const weekNet = s.week_in - s.week_out;
  const weekNetColor = weekNet >= 0 ? Colors.dark.positive : Colors.dark.negative;

  if (isUSD) {
    return [
      {
        label: Strings.cardMonthInLabel,
        value: `${formatAmount(s.month_in)} ${cur}`,
        valueColor: s.month_in > 0 ? Colors.dark.positive : Colors.dark.text1,
      },
      {
        label: Strings.cardMonthOutLabel,
        value: `${formatAmount(s.month_out)} ${cur}`,
        valueColor: s.month_out > 0 ? Colors.dark.negative : Colors.dark.text1,
      },
      {
        label: Strings.cardInEgpLabel,
        value: `${formatAmount(account.current_balance * rate)} EGP`,
        valueColor: Colors.dark.gold,
      },
    ];
  }

  return [
    {
      label: Strings.cardMonthInLabel,
      value: `${formatAmount(s.month_in)} ${cur}`,
      valueColor: s.month_in > 0 ? Colors.dark.positive : Colors.dark.text1,
    },
    {
      label: Strings.cardMonthOutLabel,
      value: `${formatAmount(s.month_out)} ${cur}`,
      valueColor: s.month_out > 0 ? Colors.dark.negative : Colors.dark.text1,
    },
    {
      label: Strings.cardThisWeekLabel,
      value: `${weekNet >= 0 ? '+' : ''}${formatAmount(weekNet)} ${cur}`,
      valueColor: weekNetColor,
    },
  ];
}

interface AccountCardProps {
  account: Account;
  rate: number;
  stats: AccountStats | undefined;
  onPress: () => void;
}

export function AccountCard({ account, rate, stats, onPress }: AccountCardProps) {
  const color = account.color ?? AccountColors[0];
  const isCreditCard = account.type === AccountType.CreditCard;
  const balanceColor = isCreditCard ? Colors.dark.negative : Colors.dark.gold;
  const icon = TYPE_ICONS[account.type];
  const infoRows = buildInfoRows(account, rate, stats);

  const showProgress = isCreditCard && (account.credit_limit ?? 0) > 0;
  const limit = account.credit_limit ?? 0;
  const available = Math.max(0, limit - account.current_balance);
  const progressPct = showProgress ? Math.min(1, account.current_balance / limit) : 0;
  const progressColor = availableCreditColor(available, limit);

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={[styles.accentBar, { backgroundColor: color }]} />
      <View style={styles.body}>
        <View style={styles.cardTop}>
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
              <MaterialCommunityIcons name={icon} size={ms(12)} color={color} />
            </View>
            <Text style={[styles.balance, { color: balanceColor }]} numberOfLines={1}>
              {formatAmount(account.current_balance)} {account.currency}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoSection}>
          {infoRows.map((row, i) => (
            <View key={i} style={styles.infoRow}>
              <Text style={styles.infoLabel}>{row.label}</Text>
              <View style={styles.infoValueRow}>
                {row.icon && (
                  <MaterialCommunityIcons
                    name={row.icon === 'up' ? 'trending-up' : 'trending-down'}
                    size={ms(10)}
                    color={row.valueColor ?? Colors.dark.text1}
                  />
                )}
                <Text
                  style={[styles.infoValue, row.valueColor ? { color: row.valueColor } : undefined]}
                  numberOfLines={1}
                >
                  {row.value}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {showProgress && (
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${progressPct * 100}%`, backgroundColor: progressColor },
              ]}
            />
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: ms(180),
    backgroundColor: Colors.dark.surfaceEl,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    overflow: 'hidden',
    marginLeft: Spacing.xs,
  },
  accentBar: { height: ms(3), width: '100%' },
  body: {
    padding: Spacing.xs,
    gap: Spacing.xs,
  },
  cardTop: {
    gap: ms(4),
  },
  infoSection: {
    gap: ms(2),
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
    borderRadius: ms(3),
    paddingHorizontal: Spacing.xxs + ms(2),
    paddingVertical: ms(2),
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
    width: ms(24),
    height: ms(24),
    borderRadius: ms(5),
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  balance: {
    flex: 1,
    fontFamily: FontFamily.soraBold,
    fontSize: Type.body,
  },
  divider: {
    height: Size.hairline,
    backgroundColor: Colors.dark.border,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  infoValueRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: ms(2),
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
  },
  progressTrack: {
    height: ms(3),
    borderRadius: ms(2),
    backgroundColor: Colors.dark.border,
    overflow: 'hidden',
    marginTop: -Spacing.xxs,
  },
  progressFill: {
    height: '100%',
    borderRadius: ms(2),
  },
});
