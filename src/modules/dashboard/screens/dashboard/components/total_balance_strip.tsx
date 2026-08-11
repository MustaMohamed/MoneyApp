import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Text as RNText, View } from 'react-native';

import {
  HERO_GRADIENT_COLORS,
  HERO_GRADIENT_END,
  HERO_GRADIENT_START,
} from '@/components/ui/hero_gradient';
import { Strings } from '@/constants/strings';
import { formatAmount } from '@/utils/format_amount';
import { ms } from '@/utils/responsive';

// This strip only ever painted 2 of HeroShell's 3 gradient stops — kept
// exactly as-is (debt:quality #228 / MA-009 post-approval fix F3 only asks
// this site to read the shared source, not to adopt the third stop).
const TOTAL_BALANCE_GRADIENT_COLORS = [HERO_GRADIENT_COLORS[0], HERO_GRADIENT_COLORS[1]] as const;

interface TotalBalanceStripProps {
  assetsEgp: number;
  accountsCount: number;
}

export function TotalBalanceStrip({ assetsEgp, accountsCount }: TotalBalanceStripProps) {
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
        <View>
          <RNText className="text-muted text-xs tracking-wide uppercase">
            {Strings.dashboardTotalBalance}
          </RNText>
          <RNText className="font-sora-bold text-accent mt-1 text-2xl">
            {formatAmount(assetsEgp)} <RNText className="text-muted text-base">EGP</RNText>
          </RNText>
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
