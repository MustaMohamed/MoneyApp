import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Card, PressableFeedback } from 'heroui-native';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { ACCOUNT_TYPE_ICONS } from '@/constants/account_type_icons';
import { AccountType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { AccountColors, Colors, Size } from '@/constants/theme';
import { resolveAccountBalanceColorClass } from '@/modules/accounts/constants/account_balance_color';
import { availableCreditColor } from '@/modules/accounts/constants/available_credit_color';
import type { AccountStats } from '@/modules/accounts/database/account_stats';
import type { Account } from '@/modules/accounts/store/account.store';
import { formatCurrencyAmount } from '@/utils/format_amount';
import { roundMoney } from '@/utils/money';
import { ms, msFont } from '@/utils/responsive';

// 1dp, finer than EGP's 0dp default, so a small daily average does not round to "0".
const ACCOUNT_CARD_AVG_DAY_DECIMALS = 1;

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

/** Never re-derive `isRateUsable` as `rate > 0`; the store's placeholder rate is 50. */
export function buildInfoRows(
  account: Account,
  rate: number,
  stats: AccountStats | undefined,
  isRateUsable: boolean,
  baseCurrency: Currency,
): InfoRow[] {
  const s = stats ?? { month_in: 0, month_out: 0, week_in: 0, week_out: 0 };
  const cur = account.currency;
  const isUSD = cur === Currency.USD;

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
        value: formatCurrencyAmount(limit, cur),
      },
      {
        label: Strings.cardAvailableLabel,
        value: isOverLimit ? Strings.cardOverLimit : formatCurrencyAmount(available, cur),
        valueColor: availColor,
      },
      {
        label: Strings.cardDueDateLabel,
        value: dueDay != null && dueDay > 0 ? nextDueDate(dueDay) : '—',
      },
    ];
  }

  if (account.type === AccountType.PhysicalWallet) {
    const daysElapsed = Math.max(1, new Date().getDate());
    const avgDay = s.month_out / daysElapsed;
    return [
      {
        label: Strings.cardMonthSpendLabel,
        value: formatCurrencyAmount(s.month_out, cur),
        valueColor: s.month_out > 0 ? Colors.dark.negative : Colors.dark.text1,
      },
      {
        label: Strings.cardAvgDayLabel,
        value: formatCurrencyAmount(avgDay, cur, ACCOUNT_CARD_AVG_DAY_DECIMALS),
      },
      {
        label: Strings.cardWeekSpendLabel,
        value: formatCurrencyAmount(s.week_out, cur),
        valueColor: s.week_out > 0 ? Colors.dark.negative : Colors.dark.text1,
      },
    ];
  }

  if (account.type === AccountType.PhysicalSavings) {
    const change = s.month_in - s.month_out;
    const monthStart = account.current_balance - change;
    const changeColor = change >= 0 ? Colors.dark.positive : Colors.dark.negative;
    return [
      {
        label: Strings.cardMonthStartLabel,
        value: formatCurrencyAmount(Math.max(0, monthStart), cur),
      },
      {
        label: Strings.cardChangeLabel,
        value: `${change >= 0 ? '+' : ''}${formatCurrencyAmount(change, cur)}`,
        valueColor: changeColor,
        icon: change >= 0 ? 'up' : 'down',
      },
    ];
  }

  const weekNet = s.week_in - s.week_out;
  const weekNetColor = weekNet >= 0 ? Colors.dark.positive : Colors.dark.negative;

  if (isUSD) {
    return [
      {
        label: Strings.cardMonthInLabel,
        value: formatCurrencyAmount(s.month_in, cur),
        valueColor: s.month_in > 0 ? Colors.dark.positive : Colors.dark.text1,
      },
      {
        label: Strings.cardMonthOutLabel,
        value: formatCurrencyAmount(s.month_out, cur),
        valueColor: s.month_out > 0 ? Colors.dark.negative : Colors.dark.text1,
      },
      // Hardcoded to EGP; an EGP card under a USD base gets no equivalent row.
      ...(isRateUsable && account.currency !== baseCurrency
        ? [
            {
              label: Strings.cardInEgpLabel,
              value: formatCurrencyAmount(roundMoney(account.current_balance * rate), Currency.EGP),
              valueColor: Colors.dark.gold,
            },
          ]
        : []),
    ];
  }

  return [
    {
      label: Strings.cardMonthInLabel,
      value: formatCurrencyAmount(s.month_in, cur),
      valueColor: s.month_in > 0 ? Colors.dark.positive : Colors.dark.text1,
    },
    {
      label: Strings.cardMonthOutLabel,
      value: formatCurrencyAmount(s.month_out, cur),
      valueColor: s.month_out > 0 ? Colors.dark.negative : Colors.dark.text1,
    },
    {
      label: Strings.cardThisWeekLabel,
      value: `${weekNet >= 0 ? '+' : ''}${formatCurrencyAmount(weekNet, cur)}`,
      valueColor: weekNetColor,
    },
  ];
}

interface AccountCardProps {
  account: Account;
  /** Read once in `dashboard.hook.ts` and passed down; never from a store here. */
  baseCurrency: Currency;
  rate: number;
  /** Decided by the domain gate in `dashboard.hook.ts`, never re-derived here. */
  isRateUsable: boolean;
  stats: AccountStats | undefined;
  width: number;
  onPress: () => void;
}

export function AccountCard({
  account,
  baseCurrency,
  rate,
  isRateUsable,
  stats,
  width,
  onPress,
}: AccountCardProps) {
  const color = account.color ?? AccountColors[0];
  const isCreditCard = account.type === AccountType.CreditCard;
  const icon = ACCOUNT_TYPE_ICONS[account.type];
  const infoRows = buildInfoRows(account, rate, stats, isRateUsable, baseCurrency);

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
        style={{ boxShadow: 'none' }}
      >
        <View style={{ height: ms(3), width: '100%', backgroundColor: color }} />

        <View style={{ paddingHorizontal: ms(12), paddingVertical: ms(9), gap: ms(6) }}>
          <View style={{ gap: ms(5) }}>
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

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: ms(6) }}>
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
                className={resolveAccountBalanceColorClass(account.type)}
                style={{ flex: 1, fontSize: msFont(17) }}
              >
                {formatCurrencyAmount(account.current_balance, account.currency)}
              </Text>
            </View>
          </View>

          <View className="border-border border-t" style={{ height: Size.hairline }} />

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
