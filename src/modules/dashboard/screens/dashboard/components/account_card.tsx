import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Card, PressableFeedback } from 'heroui-native';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { ACCOUNT_TYPE_ICONS } from '@/constants/account_type_icons';
import { AccountType, type Currency } from '@/constants/enums';
import { AccountColors, Colors, Size, lineHeightFor, withAlpha } from '@/constants/theme';
import { resolveAccountBalanceColorClass } from '@/modules/accounts/constants/account_balance_color';
import { availableCreditColor } from '@/modules/accounts/constants/available_credit_color';
import type { AccountStats } from '@/modules/accounts/database/account_stats';
import type { Account } from '@/modules/accounts/store/account.store';
import { ms, msFont } from '@/utils/responsive';

import { buildInfoRows } from './account_card.helpers';
import { formatOwnedAmountParts } from './net_worth_breakdown_sheet.helpers';

/** The carousel headline balance is negative-capable (overdraft), so it composes U+2212 (#332). */
function ownedAmountText(value: number, currency: Currency): string {
  const parts = formatOwnedAmountParts(value, currency);
  return `${parts.value} ${parts.code}`;
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
                style={{ flex: 1, fontSize: msFont(17), lineHeight: lineHeightFor(msFont(17)) }}
              >
                {account.name}
              </Text>
              <View
                className="rounded"
                style={{
                  borderWidth: 1,
                  borderColor: withAlpha(color, '55'),
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
                  backgroundColor: withAlpha(color, '22'),
                }}
              >
                <MaterialCommunityIcons name={icon} size={ms(15)} color={color} />
              </View>
              <Text
                variant="numMd"
                numberOfLines={1}
                className={resolveAccountBalanceColorClass(account.type)}
                style={{ flex: 1, fontSize: msFont(17), lineHeight: lineHeightFor(msFont(17)) }}
              >
                {ownedAmountText(account.current_balance, account.currency)}
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
