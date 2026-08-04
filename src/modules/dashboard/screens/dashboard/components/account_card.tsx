import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Card, PressableFeedback } from 'heroui-native';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { AccountType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { AccountColors, Colors, Size } from '@/constants/theme';
import type { AccountStats } from '@/modules/accounts/database/account_stats';
import type { Account } from '@/modules/accounts/store/account.store';
import { formatAmount } from '@/utils/format_amount';
import { ms, msFont } from '@/utils/responsive';

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
  if (pct >= 0.2) return Colors.dark.warning;
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
  width: number;
  onPress: () => void;
}

export function AccountCard({ account, rate, stats, width, onPress }: AccountCardProps) {
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
    <PressableFeedback
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={account.name}
      style={{ width, marginLeft: ms(4) }}
    >
      <Card
        className="border-border overflow-hidden rounded-2xl border p-0"
        style={{ elevation: 0, shadowOpacity: 0 }}
      >
        {/* Accent bar — dynamic color stays inline */}
        <View style={{ height: ms(3), width: '100%', backgroundColor: color }} />

        <View style={{ paddingHorizontal: ms(12), paddingVertical: ms(9), gap: ms(6) }}>
          {/* Card top */}
          <View style={{ gap: ms(5) }}>
            {/* Name row */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: ms(5),
              }}
            >
              <Text
                variant="title"
                className="font-sora-bold text-foreground"
                numberOfLines={1}
                style={{ flex: 1, fontSize: msFont(17) }}
              >
                {account.name}
              </Text>
              {/* Currency pill — border color is dynamic */}
              <View
                className="rounded"
                style={{
                  borderWidth: 1,
                  borderColor: color + '55',
                  paddingHorizontal: ms(6),
                  paddingVertical: ms(2),
                }}
              >
                <Text variant="caption" className="font-inter-semibold text-muted">
                  {account.currency}
                </Text>
              </View>
            </View>

            {/* Balance row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: ms(6) }}>
              {/* Icon box — dynamic background color stays inline */}
              <View
                className="rounded"
                style={{
                  width: ms(30),
                  height: ms(30),
                  borderRadius: ms(7),
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  backgroundColor: color + '22',
                }}
              >
                <MaterialCommunityIcons name={icon} size={ms(15)} color={color} />
              </View>
              <Text
                variant="numMd"
                numberOfLines={1}
                style={{ flex: 1, color: balanceColor, fontSize: msFont(17) }}
              >
                {formatAmount(account.current_balance)} {account.currency}
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View className="border-border border-t" style={{ height: Size.hairline }} />

          {/* Info rows */}
          <View style={{ gap: ms(4) }}>
            {infoRows.map((row, i) => (
              <View
                key={i}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: ms(5),
                }}
              >
                <Text variant="caption" className="text-muted" style={{ flexShrink: 0 }}>
                  {row.label}
                </Text>
                <View
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: ms(3),
                  }}
                >
                  {row.icon && (
                    <MaterialCommunityIcons
                      name={row.icon === 'up' ? 'trending-up' : 'trending-down'}
                      size={ms(12)}
                      color={row.valueColor ?? Colors.dark.text1}
                    />
                  )}
                  <Text
                    variant="caption"
                    numberOfLines={1}
                    style={[
                      { textAlign: 'right' },
                      row.valueColor ? { color: row.valueColor } : undefined,
                    ]}
                  >
                    {row.value}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Credit progress bar */}
          {showProgress && (
            <View
              className="border-border overflow-hidden"
              style={{ height: ms(3), borderRadius: ms(2), backgroundColor: Colors.dark.border }}
            >
              <View
                style={{
                  height: '100%',
                  borderRadius: ms(2),
                  width: `${progressPct * 100}%`,
                  backgroundColor: progressColor,
                }}
              />
            </View>
          )}
        </View>
      </Card>
    </PressableFeedback>
  );
}
