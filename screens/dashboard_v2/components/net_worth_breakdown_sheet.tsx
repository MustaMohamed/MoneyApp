import React from 'react';
import { View } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';

import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import { formatAmount } from '@/utils/format_amount';
import type {
  LiabilityRow,
  LiquidityBreakdown,
} from '@/screens/dashboard/dashboard.helpers';

interface NetWorthBreakdownSheetProps {
  visible: boolean;
  onClose: () => void;
  assetsEgp: number;
  liabilitiesEgp: number;
  netWorthEgp: number;
  netWorthUsd: number;
  liquidity: LiquidityBreakdown;
  liabilities: LiabilityRow[];
}

const LIQUID_COLOR = Colors.dark.positive;
const RESERVE_COLOR = Colors.dark.gold;

export function NetWorthBreakdownSheet({
  visible,
  onClose,
  assetsEgp,
  liabilitiesEgp,
  netWorthEgp,
  netWorthUsd,
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
    <Sheet visible={visible} onClose={onClose} title={Strings.dashboardBreakdownTitle} size="lg">
      <Sheet.Body>
        <BottomSheetScrollView contentContainerStyle={{ paddingBottom: ms(24) }}>
          {/* Net Worth headline */}
          <View className="px-4 pt-2">
            <Text variant="hint" className="text-muted uppercase tracking-wide text-xs">
              {Strings.dashboardBreakdownNetWorthLabel}
            </Text>
            <Text className="font-bold mt-1" style={{ color: Colors.dark.gold, fontSize: ms(28) }}>
              {formatAmount(netWorthEgp)}{' '}
              <Text className="text-base text-muted font-medium">EGP</Text>
            </Text>
            <Text variant="caption" className="text-muted mt-1">
              ≈ {formatAmount(netWorthUsd, 0)} USD
            </Text>
          </View>

          {/* Divider */}
          <View className="h-px bg-separator mx-4 my-4" />

          {/* Assets */}
          <View className="px-4">
            <Text variant="hint" className="text-muted uppercase tracking-wide text-xs mb-2">
              {Strings.dashAssetsLabel} ·{' '}
              {Strings.dashboardBreakdownAssetsHeader(formatAmount(assetsEgp), assetsAccountCount)}
            </Text>
            {assetsTotal > 0 && (
              <View
                className="rounded overflow-hidden mb-2"
                style={{ height: ms(6), flexDirection: 'row' }}
              >
                {showLiquid && (
                  <View style={{ flex: liquidPct, backgroundColor: LIQUID_COLOR }} />
                )}
                {showReserve && (
                  <View style={{ flex: reservePct, backgroundColor: RESERVE_COLOR }} />
                )}
              </View>
            )}
            {showLiquid && (
              <LegendRow
                color={LIQUID_COLOR}
                label={Strings.dashboardBreakdownLiquid}
                caption={Strings.dashboardBreakdownLiquidCaption}
                value={liquidity.liquidEgp}
                count={liquidity.liquidCount}
              />
            )}
            {showReserve && (
              <LegendRow
                color={RESERVE_COLOR}
                label={Strings.dashboardBreakdownReserve}
                caption={Strings.dashboardBreakdownReserveCaption}
                value={liquidity.reserveEgp}
                count={liquidity.reserveCount}
              />
            )}
          </View>

          {showLiabilities && (
            <>
              <View className="h-px bg-separator mx-4 my-4" />
              <View className="px-4">
                <Text variant="hint" className="text-muted uppercase tracking-wide text-xs mb-2">
                  {Strings.dashLiabilitiesLabel} ·{' '}
                  {Strings.dashboardBreakdownLiabilitiesHeader(
                    formatAmount(liabilitiesEgp),
                    liabilities.length,
                  )}
                </Text>
                {liabilities.map((row) => (
                  <View
                    key={row.id}
                    className="flex-row justify-between py-2"
                    style={{ flexDirection: 'row' }}
                  >
                    <Text className="text-foreground">{row.name}</Text>
                    <Text className="font-semibold" style={{ color: Colors.dark.negative }}>
                      −{formatAmount(row.balanceEgp)}
                    </Text>
                  </View>
                ))}
                <View className="h-px bg-separator mt-1 mb-2" />
                <View
                  className="flex-row justify-between"
                  style={{ flexDirection: 'row' }}
                >
                  <Text className="text-muted">{Strings.dashboardBreakdownTotalDebt}</Text>
                  <Text className="font-bold" style={{ color: Colors.dark.gold }}>
                    {formatAmount(totalDebt)}
                  </Text>
                </View>
              </View>
            </>
          )}
        </BottomSheetScrollView>
      </Sheet.Body>
    </Sheet>
  );
}

interface LegendRowProps {
  color: string;
  label: string;
  caption: string;
  value: number;
  count: number;
}

function LegendRow({ color, label, caption, value, count }: LegendRowProps) {
  return (
    <View
      className="flex-row items-center justify-between py-2"
      style={{ flexDirection: 'row' }}
    >
      <View className="flex-row items-center" style={{ flexDirection: 'row', gap: ms(8) }}>
        <View style={{ width: ms(8), height: ms(8), borderRadius: ms(4), backgroundColor: color }} />
        <View>
          <View style={{ flexDirection: 'row', gap: ms(4) }}>
            <Text className="text-foreground font-semibold">{label}</Text>
            <Text className="text-muted font-normal">({count})</Text>
          </View>
          <Text variant="caption" className="text-muted">{caption}</Text>
        </View>
      </View>
      <Text className="font-semibold text-foreground">{formatAmount(value)}</Text>
    </View>
  );
}
