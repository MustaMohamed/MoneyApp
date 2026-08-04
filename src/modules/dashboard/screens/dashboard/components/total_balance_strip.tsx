import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Text as RNText, View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { formatAmount } from '@/utils/format_amount';
import { ms } from '@/utils/responsive';

interface TotalBalanceStripProps {
  assetsEgp: number;
  accountsCount: number;
}

export function TotalBalanceStrip({ assetsEgp, accountsCount }: TotalBalanceStripProps) {
  return (
    <View className="border-border mx-4 mt-2 mb-2 overflow-hidden rounded-2xl border">
      <LinearGradient
        colors={[Colors.shared.heroGrad1, Colors.shared.heroGrad2]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
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
