import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import React from 'react';
import { View } from 'react-native';

import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import type {
  AccountRow,
  LiabilityRow,
  LiquidityBreakdown,
} from '@/screens/dashboard/dashboard.helpers';
import { formatAmount } from '@/utils/format_amount';
import { nextDueDate } from '@/utils/format_date';
import { ms } from '@/utils/responsive';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface NetWorthBreakdownSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  assetsEgp: number;
  liabilitiesEgp: number;
  netWorthEgp: number;
  netWorthUsd: number;
  rate: number;
  liquidity: LiquidityBreakdown;
  liabilities: LiabilityRow[];
}

const LIQUID_COLOR = Colors.dark.positive;
const RESERVE_COLOR = Colors.dark.gold;
const LIABILITY_COLOR = Colors.dark.negative;

export function NetWorthBreakdownSheet({
  isOpen,
  onOpenChange,
  assetsEgp,
  liabilitiesEgp,
  netWorthEgp,
  netWorthUsd,
  rate,
  liquidity,
  liabilities,
}: NetWorthBreakdownSheetProps) {
  const assetsTotal = liquidity.liquidEgp + liquidity.reserveEgp;
  const liquidPct = assetsTotal > 0 ? liquidity.liquidEgp / assetsTotal : 0;
  const reservePct = 1 - liquidPct;
  const showLiquid = liquidity.liquidCount > 0;
  const showReserve = liquidity.reserveCount > 0;
  const showLiabilities = liabilities.length > 0;
  const totalDebt = liabilities.reduce((sum, row) => sum + row.balanceEgp, 0);
  const assetsAccountCount = liquidity.liquidCount + liquidity.reserveCount;

  return (
    <Sheet
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={Strings.dashboardBreakdownTitle}
      size="lg"
      scrollable
    >
      <BottomSheetScrollView contentContainerStyle={{ paddingBottom: ms(24) }}>
        {/* Net Worth headline */}
        <View className="px-4 pt-2">
          <Text variant="hint" className="text-muted text-xs tracking-wide uppercase">
            {Strings.dashboardBreakdownNetWorthLabel}
          </Text>
          <Text className="mt-1 font-bold" style={{ color: Colors.dark.gold, fontSize: ms(28) }}>
            {formatAmount(netWorthEgp)}{' '}
            <Text className="text-muted text-base font-medium">EGP</Text>
          </Text>
          <Text variant="caption" className="text-muted mt-1">
            {rate > 0 ? `≈ ${formatAmount(netWorthUsd, 0)} USD` : '— USD'}
          </Text>
        </View>

        {/* Divider */}
        <View className="bg-separator mx-4 my-4 h-px" />

        {/* Assets */}
        <View className="px-4">
          <Text variant="hint" className="text-muted mb-2 text-xs tracking-wide uppercase">
            {Strings.dashAssetsLabel} ·{' '}
            {Strings.dashboardBreakdownAssetsHeader(formatAmount(assetsEgp), assetsAccountCount)}
          </Text>
          {assetsTotal > 0 && (
            <View
              className="mb-2 overflow-hidden rounded"
              style={{ height: ms(6), flexDirection: 'row' }}
            >
              {showLiquid && <View style={{ flex: liquidPct, backgroundColor: LIQUID_COLOR }} />}
              {showReserve && <View style={{ flex: reservePct, backgroundColor: RESERVE_COLOR }} />}
            </View>
          )}
          {showLiquid && (
            <>
              <LegendRow
                color={LIQUID_COLOR}
                icon="wallet-outline"
                label={Strings.dashboardBreakdownLiquid}
                caption={Strings.dashboardBreakdownLiquidCaption}
                value={liquidity.liquidEgp}
                count={liquidity.liquidCount}
              />
              {liquidity.liquidAccounts.map((acc) => (
                <AccountSubRow key={acc.id} account={acc} />
              ))}
            </>
          )}
          {showReserve && (
            <>
              <LegendRow
                color={RESERVE_COLOR}
                icon="piggy-bank"
                label={Strings.dashboardBreakdownReserve}
                caption={Strings.dashboardBreakdownReserveCaption}
                value={liquidity.reserveEgp}
                count={liquidity.reserveCount}
              />
              {liquidity.reserveAccounts.map((acc) => (
                <AccountSubRow key={acc.id} account={acc} />
              ))}
            </>
          )}
        </View>

        {showLiabilities && (
          <>
            <View className="bg-separator mx-4 my-4 h-px" />
            <View className="px-4">
              <Text variant="hint" className="text-muted mb-2 text-xs tracking-wide uppercase">
                {Strings.dashLiabilitiesLabel} ·{' '}
                {Strings.dashboardBreakdownLiabilitiesHeader(
                  formatAmount(liabilitiesEgp),
                  liabilities.length,
                )}
              </Text>
              {liabilities.map((row) => (
                <LegendRow
                  key={row.id}
                  color={LIABILITY_COLOR}
                  icon="credit-card"
                  label={row.name}
                  caption={
                    row.statementDueDay != null && row.statementDueDay > 0
                      ? `due ${nextDueDate(row.statementDueDay)}`
                      : undefined
                  }
                  value={row.balanceEgp}
                  valueColor={LIABILITY_COLOR}
                  negative
                />
              ))}
              <View className="bg-separator mt-1 mb-2 h-px" />
              <View className="flex-row justify-between" style={{ flexDirection: 'row' }}>
                <Text className="text-muted">{Strings.dashboardBreakdownTotalDebt}</Text>
                <Text className="font-bold" style={{ color: Colors.dark.gold }}>
                  {formatAmount(totalDebt)}
                </Text>
              </View>
            </View>
          </>
        )}
      </BottomSheetScrollView>
    </Sheet>
  );
}

interface LegendRowProps {
  color: string;
  icon?: IconName;
  label: string;
  caption?: string;
  value: number;
  count?: number;
  valueColor?: string;
  negative?: boolean;
}

function LegendRow({
  color,
  icon,
  label,
  caption,
  value,
  count,
  valueColor,
  negative,
}: LegendRowProps) {
  return (
    <View className="flex-row items-center justify-between py-2" style={{ flexDirection: 'row' }}>
      <View className="flex-row items-center" style={{ flexDirection: 'row', gap: ms(10) }}>
        {icon ? (
          <View style={{ width: ms(16), alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name={icon} size={ms(16)} color={color} />
          </View>
        ) : (
          <View
            style={{ width: ms(8), height: ms(8), borderRadius: ms(4), backgroundColor: color }}
          />
        )}
        <View>
          <View style={{ flexDirection: 'row', gap: ms(4) }}>
            <Text className="text-foreground font-semibold">{label}</Text>
            {count !== undefined && <Text className="text-muted font-normal">({count})</Text>}
          </View>
          {caption && (
            <Text variant="caption" className="text-muted">
              {caption}
            </Text>
          )}
        </View>
      </View>
      <Text className="font-semibold" style={valueColor ? { color: valueColor } : undefined}>
        {negative ? `−${formatAmount(value)}` : formatAmount(value)}
      </Text>
    </View>
  );
}

// Account sub-rows align horizontally with the LegendRow label above them.
// LegendRow's label starts at: icon width (ms(16)) + icon→label gap (ms(10)) = ms(26).
const SUB_ROW_INDENT = ms(27.5);

function AccountSubRow({ account }: { account: AccountRow }) {
  return (
    <View
      className="flex-row justify-between"
      style={{ flexDirection: 'row', paddingVertical: ms(4), paddingLeft: SUB_ROW_INDENT }}
    >
      <Text variant="caption" className="text-muted">
        {account.name}
      </Text>
      <Text variant="caption" className="text-foreground font-medium">
        {formatAmount(account.balanceEgp)}
      </Text>
    </View>
  );
}
