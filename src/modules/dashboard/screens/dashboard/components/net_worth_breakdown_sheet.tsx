import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import React from 'react';
import { View } from 'react-native';

import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, Size, Type, lineHeightFor } from '@/constants/theme';
import { SemanticTokens } from '@/constants/theme_tokens';
import type {
  DashboardNetWorth,
  DashboardNetWorthAmount,
} from '@/modules/accounts/domain/account_aggregation';
import { nextDueDate } from '@/utils/format_date';
import { ms } from '@/utils/responsive';

import type { AccountRow, LiabilityRow, LiquidityBreakdown } from '../dashboard.helpers';
import {
  formatLiabilityAmountParts,
  formatLiabilityRowValue,
  formatOwnedAmountParts,
  resolveBreakdownRowColors,
  resolveNetWorthForeignCaption,
  shouldShowProportionBar,
} from './net_worth_breakdown_sheet.helpers';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface NetWorthBreakdownSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** Keep as one object: sibling props destructured in a signature do not narrow each other. */
  netWorth: DashboardNetWorth;
  /** Read once in `dashboard.hook.ts` and passed down; never read a store here. */
  baseCurrency: Currency;
  liquidity: LiquidityBreakdown;
  liabilities: LiabilityRow[];
}

/** On `rate-needed` the body is suppressed here, so neither breakdown helper needs a gate. */
export function NetWorthBreakdownSheet({
  isOpen,
  onOpenChange,
  netWorth,
  baseCurrency,
  liquidity,
  liabilities,
}: NetWorthBreakdownSheetProps) {
  return (
    <Sheet
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={Strings.dashboardBreakdownTitle}
      size="lg"
      scrollable
    >
      <BottomSheetScrollView contentContainerStyle={{ paddingBottom: ms(24) }}>
        {netWorth.kind === 'rate-needed' ? (
          <NetWorthRefusalHeadline />
        ) : (
          <NetWorthBreakdownBody
            netWorth={netWorth}
            baseCurrency={baseCurrency}
            liquidity={liquidity}
            liabilities={liabilities}
          />
        )}
      </BottomSheetScrollView>
    </Sheet>
  );
}

/** Warning, not danger: nothing failed, so no number, partial total, or substituted rate shows. */
function NetWorthRefusalHeadline(): React.ReactElement {
  return (
    <View className="px-4 pt-2">
      <Text variant="hint" className="text-muted text-xs tracking-wide uppercase">
        {Strings.dashboardBreakdownNetWorthLabel}
      </Text>
      <View
        className="mt-1 flex-row items-center"
        style={{ flexDirection: 'row', gap: ms(8) }}
        accessible
        accessibilityLabel={Strings.dashboardRateNeededValue}
      >
        <MaterialCommunityIcons
          name="alert-outline"
          size={Size.iconMd}
          color={SemanticTokens.warning}
        />
        <Text
          className="text-warning font-sora-semibold flex-1"
          style={{ fontSize: Type.headline, lineHeight: lineHeightFor(Type.headline) }}
        >
          {Strings.dashboardRateNeededValue}
        </Text>
      </View>
      <Text variant="caption" className="mt-2">
        {Strings.dashboardRateNeededCaption}
      </Text>
    </View>
  );
}

function NetWorthBreakdownBody({
  netWorth: amount,
  baseCurrency,
  liquidity,
  liabilities,
}: {
  netWorth: DashboardNetWorthAmount;
  baseCurrency: Currency;
  liquidity: LiquidityBreakdown;
  liabilities: LiabilityRow[];
}): React.ReactElement {
  const assetsTotal = liquidity.liquid + liquidity.reserve;
  // Gated on both parts being non-negative, not just the total being positive.
  const showProportionBar = shouldShowProportionBar(liquidity);
  const liquidPct = showProportionBar ? liquidity.liquid / assetsTotal : 0;
  const reservePct = 1 - liquidPct;
  const showLiquid = liquidity.liquidCount > 0;
  const showReserve = liquidity.reserveCount > 0;
  const showLiabilities = liabilities.length > 0;
  const assetsAccountCount = liquidity.liquidCount + liquidity.reserveCount;
  const netWorthParts = formatOwnedAmountParts(amount.netWorth, baseCurrency);
  const assetsParts = formatOwnedAmountParts(amount.assets, baseCurrency);
  const liabilitiesParts = formatLiabilityAmountParts(amount.liabilities, baseCurrency);
  const liquidColors = resolveBreakdownRowColors('liquid');
  const reserveColors = resolveBreakdownRowColors('reserve');
  const liabilityColors = resolveBreakdownRowColors('liability');

  return (
    <>
      <View className="px-4 pt-2">
        <Text variant="hint" className="text-muted text-xs tracking-wide uppercase">
          {Strings.dashboardBreakdownNetWorthLabel}
        </Text>
        <Text
          className="font-sora-bold mt-1"
          style={{ color: Colors.dark.gold, fontSize: ms(28), lineHeight: lineHeightFor(ms(28)) }}
        >
          {netWorthParts.value}{' '}
          <Text className="font-inter-medium text-muted text-base">{netWorthParts.code}</Text>
        </Text>
        <Text variant="caption" className="text-muted mt-1">
          {resolveNetWorthForeignCaption(amount.netWorthForeign, baseCurrency)}
        </Text>
      </View>

      <View className="bg-separator mx-4 my-4 h-px" />

      <View className="px-4">
        <Text variant="hint" className="text-muted mb-2 text-xs tracking-wide uppercase">
          {Strings.dashAssetsLabel} ·{' '}
          {Strings.dashboardBreakdownAssetsHeader(
            assetsParts.value,
            assetsParts.code,
            assetsAccountCount,
          )}
        </Text>
        {showProportionBar && (
          <View
            className="mb-2 overflow-hidden rounded"
            style={{ height: ms(6), flexDirection: 'row' }}
          >
            {showLiquid && (
              <View style={{ flex: liquidPct, backgroundColor: liquidColors.legend }} />
            )}
            {showReserve && (
              <View style={{ flex: reservePct, backgroundColor: reserveColors.legend }} />
            )}
          </View>
        )}
        {showLiquid && (
          <>
            <LegendRow
              color={liquidColors.legend}
              icon="wallet-outline"
              label={Strings.dashboardBreakdownLiquid}
              caption={Strings.dashboardBreakdownLiquidCaption}
              value={formatOwnedAmountParts(liquidity.liquid, baseCurrency).value}
              count={liquidity.liquidCount}
            />
            {liquidity.liquidAccounts.map((acc) => (
              <AccountSubRow key={acc.id} account={acc} baseCurrency={baseCurrency} />
            ))}
          </>
        )}
        {showReserve && (
          <>
            <LegendRow
              color={reserveColors.legend}
              icon="piggy-bank"
              label={Strings.dashboardBreakdownReserve}
              caption={Strings.dashboardBreakdownReserveCaption}
              value={formatOwnedAmountParts(liquidity.reserve, baseCurrency).value}
              count={liquidity.reserveCount}
            />
            {liquidity.reserveAccounts.map((acc) => (
              <AccountSubRow key={acc.id} account={acc} baseCurrency={baseCurrency} />
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
                liabilitiesParts.value,
                liabilitiesParts.code,
                liabilities.length,
              )}
            </Text>
            {liabilities.map((row) => (
              <LegendRow
                key={row.id}
                color={liabilityColors.legend}
                icon="credit-card"
                label={row.name}
                caption={
                  // A true `-0` fails `< 0`, so it keeps the due caption.
                  row.balance < 0
                    ? Strings.dashboardBreakdownInCredit
                    : row.statementDueDay != null && row.statementDueDay > 0
                      ? `due ${nextDueDate(row.statementDueDay)}`
                      : undefined
                }
                value={formatLiabilityRowValue(row.balance, baseCurrency)}
                valueColor={liabilityColors.value}
              />
            ))}
            <View className="bg-separator mt-1 mb-2 h-px" />
            <View className="flex-row justify-between" style={{ flexDirection: 'row' }}>
              <Text className="text-muted">{Strings.dashboardBreakdownTotalDebt}</Text>
              <Text className="font-sora-bold" style={{ color: Colors.dark.gold }}>
                {liabilitiesParts.value}
              </Text>
            </View>
          </View>
        </>
      )}
    </>
  );
}

interface LegendRowProps {
  color: string;
  icon?: IconName;
  label: string;
  caption?: string;
  /** Pre-formatted text; the liability row's sign comes from `formatLiabilityRowValue`. */
  value: string;
  count?: number;
  valueColor?: string;
}

function LegendRow({ color, icon, label, caption, value, count, valueColor }: LegendRowProps) {
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
            <Text className="font-inter-semibold text-foreground">{label}</Text>
            {count !== undefined && <Text className="font-inter text-muted">({count})</Text>}
          </View>
          {caption && (
            <Text variant="caption" className="text-muted">
              {caption}
            </Text>
          )}
        </View>
      </View>
      <Text className="font-sora-semibold" style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </Text>
    </View>
  );
}

// Aligns to the `LegendRow` label: icon width `ms(16)` + icon-to-label gap `ms(10)`.
const SUB_ROW_INDENT = ms(27.5);

function AccountSubRow({ account, baseCurrency }: { account: AccountRow; baseCurrency: Currency }) {
  return (
    <View
      className="flex-row justify-between"
      style={{ flexDirection: 'row', paddingVertical: ms(4), paddingLeft: SUB_ROW_INDENT }}
    >
      <Text variant="caption" className="text-muted">
        {account.name}
      </Text>
      <Text variant="caption" className="font-inter-medium text-foreground">
        {formatOwnedAmountParts(account.balance, baseCurrency).value}
      </Text>
    </View>
  );
}
