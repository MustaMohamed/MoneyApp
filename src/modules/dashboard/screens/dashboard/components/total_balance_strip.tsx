import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Text as RNText, View } from 'react-native';

import {
  HERO_GRADIENT_COLORS,
  HERO_GRADIENT_END,
  HERO_GRADIENT_START,
} from '@/components/ui/hero_gradient';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Size } from '@/constants/theme';
import { SemanticTokens } from '@/constants/theme_tokens';
import type {
  DashboardNetWorth,
  DashboardNetWorthAmount,
} from '@/modules/accounts/domain/account_aggregation';
import { formatCurrencyParts } from '@/utils/format_amount';
import { ms } from '@/utils/responsive';

// This strip only ever painted 2 of HeroShell's 3 gradient stops — kept
// exactly as-is (debt:quality #228 / MA-009 post-approval fix F3 only asks
// this site to read the shared source, not to adopt the third stop).
const TOTAL_BALANCE_GRADIENT_COLORS = [HERO_GRADIENT_COLORS[0], HERO_GRADIENT_COLORS[1]] as const;

interface TotalBalanceStripProps {
  /**
   * One object, not loose numbers: a discriminated union narrows only when the
   * discriminant and the fields arrive together, and sibling props destructured
   * in a signature do not narrow each other.
   */
  netWorth: DashboardNetWorth;
  /** Read once in `dashboard.hook.ts` and passed down — never from a store here. */
  baseCurrency: Currency;
  accountsCount: number;
}

/**
 * The amount path's headline, kept as a subcomponent rather than inline so the two
 * `formatCurrencyParts` calls the value/code split needs collapse to one. Matches
 * `stat_cards.tsx`'s `NetWorthCardBody` and `hero_card.tsx`'s `HeroCardAssetsAmount` — the
 * established shape for a `DashboardNetWorthAmount`-narrowed subcomponent here, not a
 * compiler requirement (an if/else-scoped const also compiles here).
 */
function TotalBalanceStripAmount({
  netWorth: amount,
  baseCurrency,
}: {
  netWorth: DashboardNetWorthAmount;
  baseCurrency: Currency;
}): React.ReactElement {
  const assetsParts = formatCurrencyParts(amount.assets, baseCurrency);
  return (
    <RNText className="font-sora-bold text-accent mt-1 text-2xl">
      {assetsParts.value} <RNText className="text-muted text-base">{assetsParts.code}</RNText>
    </RNText>
  );
}

export function TotalBalanceStrip({
  netWorth,
  baseCurrency,
  accountsCount,
}: TotalBalanceStripProps) {
  return (
    <View className="border-border mx-4 mt-2 mb-2 overflow-hidden rounded-2xl border">
      <LinearGradient
        colors={TOTAL_BALANCE_GRADIENT_COLORS}
        start={HERO_GRADIENT_START}
        end={HERO_GRADIENT_END}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: ms(16),
          paddingVertical: ms(12),
        }}
      >
        <View style={{ flexShrink: 1 }}>
          <RNText className="text-muted text-xs tracking-wide uppercase">
            {Strings.dashboardTotalBalance}
          </RNText>
          {netWorth.kind === 'rate-needed' ? (
            // Warning, not danger, and no number of any kind — the union carries
            // none on this path. The remedy sentence lives on the hero card.
            <View
              className="mt-1 flex-row items-center"
              style={{ flexDirection: 'row', gap: ms(6) }}
              accessible
              accessibilityLabel={Strings.dashboardRateNeededValue}
            >
              <MaterialCommunityIcons
                name="alert-outline"
                size={Size.iconSm}
                color={SemanticTokens.warning}
              />
              <RNText className="text-warning font-sora-semibold flex-1 text-base">
                {Strings.dashboardRateNeededValue}
              </RNText>
            </View>
          ) : (
            <TotalBalanceStripAmount netWorth={netWorth} baseCurrency={baseCurrency} />
          )}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <RNText className="text-muted text-xs tracking-wide uppercase">
            {Strings.dashboardAccountsLabel}
          </RNText>
          <RNText className="font-sora-semibold text-foreground mt-1 text-base">
            {String(accountsCount)}
          </RNText>
        </View>
      </LinearGradient>
    </View>
  );
}
