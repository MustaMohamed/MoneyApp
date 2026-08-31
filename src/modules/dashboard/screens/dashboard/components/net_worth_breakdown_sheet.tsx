import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import React from 'react';
import { View } from 'react-native';

import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, Size, Type } from '@/constants/theme';
import { SemanticTokens } from '@/constants/theme_tokens';
import type {
  DashboardNetWorth,
  DashboardNetWorthAmount,
} from '@/modules/accounts/domain/account_aggregation';
import { formatAmount, formatCurrencyParts } from '@/utils/format_amount';
import { nextDueDate } from '@/utils/format_date';
import { ms } from '@/utils/responsive';

import type { AccountRow, LiabilityRow, LiquidityBreakdown } from '../dashboard.helpers';
import {
  formatLiabilityRowValue,
  resolveBreakdownRowColors,
  resolveNetWorthUsdCaption,
  shouldShowProportionBar,
} from './net_worth_breakdown_sheet.helpers';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface NetWorthBreakdownSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * One object, not loose numbers: a discriminated union narrows only when the
   * discriminant and the fields arrive together, and sibling props destructured
   * in a signature do not narrow each other.
   */
  netWorth: DashboardNetWorth;
  liquidity: LiquidityBreakdown;
  liabilities: LiabilityRow[];
}

/**
 * On a `rate-needed` outcome this renders the refusal and NOTHING ELSE — and
 * that suppression, not a gate inside `computeLiquidityBreakdown` or
 * `computeLiabilitiesBreakdown`, is why neither helper needs one (#259 C7):
 *
 * - the body renders iff `netWorth.kind === 'amount'` (below), which is
 *   `foreignCount === 0 || rateUsable` (`dashboard.helpers.ts:84-90`);
 * - both helpers multiply by `rate` only when `a.currency === Currency.USD`,
 *   and `Currency` has exactly two members (`enums.ts:16-19`);
 * - so the only path a gate inside either helper could fire on is
 *   EGP-only-unverified — where the rate is arithmetically inert (nothing to
 *   convert) and the gate would blank a correct breakdown instead of guarding
 *   anything. `liquidity`/`liabilities` are non-optional props: there is no
 *   third, gated state for either to represent.
 *
 * The pin for this argument is the rate-independence test in
 * `dashboard_helpers.test.ts` (T6): both helpers return deeply equal results
 * for the same EGP-only accounts at `rate = 50` and `rate = 0.0001`. Body
 * suppression above stands as the second guard behind the non-tappable hero
 * (`hero_card.tsx`'s refusal-path comment).
 */
export function NetWorthBreakdownSheet({
  isOpen,
  onOpenChange,
  netWorth,
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
            liquidity={liquidity}
            liabilities={liabilities}
          />
        )}
      </BottomSheetScrollView>
    </Sheet>
  );
}

/**
 * Warning, not danger — nothing failed. No number, no dash-as-number, no partial
 * total, no substituted rate: the union carries no value on this path, by
 * construction. Mirrors `ready_hero_card.tsx`'s refusal so the two read as one
 * app.
 */
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
          style={{ fontSize: Type.headline }}
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

/**
 * The amount path's body, kept as a subcomponent rather than an early return:
 * the eight derivations below then sit INSIDE the narrowing, and the `Sheet`'s
 * five configuration props and the scroll view's `contentContainerStyle` are
 * declared once instead of drifting between two returns.
 */
function NetWorthBreakdownBody({
  netWorth,
  liquidity,
  liabilities,
}: {
  netWorth: DashboardNetWorthAmount;
  liquidity: LiquidityBreakdown;
  liabilities: LiabilityRow[];
}): React.ReactElement {
  const assetsTotal = liquidity.liquidEgp + liquidity.reserveEgp;
  // Gated on both parts being non-negative, not just the total being positive
  // (#259 C6) — see `shouldShowProportionBar`'s own comment for the overdrawn-
  // account defect this closes.
  const showProportionBar = shouldShowProportionBar(liquidity);
  const liquidPct = showProportionBar ? liquidity.liquidEgp / assetsTotal : 0;
  const reservePct = 1 - liquidPct;
  const showLiquid = liquidity.liquidCount > 0;
  const showReserve = liquidity.reserveCount > 0;
  const showLiabilities = liabilities.length > 0;
  const assetsAccountCount = liquidity.liquidCount + liquidity.reserveCount;
  const netWorthEgpParts = formatCurrencyParts(netWorth.netWorthEgp, Currency.EGP);
  const liquidColors = resolveBreakdownRowColors('liquid');
  const reserveColors = resolveBreakdownRowColors('reserve');
  const liabilityColors = resolveBreakdownRowColors('liability');

  return (
    <>
      {/* Net Worth headline */}
      <View className="px-4 pt-2">
        <Text variant="hint" className="text-muted text-xs tracking-wide uppercase">
          {Strings.dashboardBreakdownNetWorthLabel}
        </Text>
        <Text className="font-sora-bold mt-1" style={{ color: Colors.dark.gold, fontSize: ms(28) }}>
          {netWorthEgpParts.value}{' '}
          <Text className="font-inter-medium text-muted text-base">{netWorthEgpParts.code}</Text>
        </Text>
        <Text variant="caption" className="text-muted mt-1">
          {resolveNetWorthUsdCaption(netWorth.netWorthUsd)}
        </Text>
      </View>

      {/* Divider */}
      <View className="bg-separator mx-4 my-4 h-px" />

      {/* Assets */}
      <View className="px-4">
        <Text variant="hint" className="text-muted mb-2 text-xs tracking-wide uppercase">
          {Strings.dashAssetsLabel} ·{' '}
          {Strings.dashboardBreakdownAssetsHeader(
            formatAmount(netWorth.assetsEgp),
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
              value={formatAmount(liquidity.liquidEgp)}
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
              color={reserveColors.legend}
              icon="piggy-bank"
              label={Strings.dashboardBreakdownReserve}
              caption={Strings.dashboardBreakdownReserveCaption}
              value={formatAmount(liquidity.reserveEgp)}
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
                formatAmount(netWorth.liabilitiesEgp),
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
                  // The trigger reads the NUMBER, not the rendered text: a
                  // true `-0` row (the only other non-positive case
                  // `roundMoney` can produce) fails `< 0` and keeps the
                  // due-caption below (#259 C2/C4).
                  row.balanceEgp < 0
                    ? Strings.dashboardBreakdownInCredit
                    : row.statementDueDay != null && row.statementDueDay > 0
                      ? `due ${nextDueDate(row.statementDueDay)}`
                      : undefined
                }
                value={formatLiabilityRowValue(row.balanceEgp)}
                valueColor={liabilityColors.value}
              />
            ))}
            <View className="bg-separator mt-1 mb-2 h-px" />
            <View className="flex-row justify-between" style={{ flexDirection: 'row' }}>
              <Text className="text-muted">{Strings.dashboardBreakdownTotalDebt}</Text>
              <Text className="font-sora-bold" style={{ color: Colors.dark.gold }}>
                {formatAmount(netWorth.liabilitiesEgp)}
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
  /**
   * Pre-formatted display text — every call site renders through a formatter
   * before this prop sees the value: `formatAmount` at the liquid/reserve
   * call sites, `formatLiabilityRowValue` (#259 C3) at the liability one,
   * which owns that row's signed glyph. A single `string` channel, not
   * `number | string`, keeps that true at the TYPE level: reverting the
   * liability call site to a raw `row.balanceEgp` number is a compile error
   * here, not a silently unsigned row rendered through `formatAmount`.
   */
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
      <Text variant="caption" className="font-inter-medium text-foreground">
        {formatAmount(account.balanceEgp)}
      </Text>
    </View>
  );
}
