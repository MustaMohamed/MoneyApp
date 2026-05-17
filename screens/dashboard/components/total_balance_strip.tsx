import React from 'react';
import { Text as RNText, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

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
    <View className="mx-4 mt-2 mb-2 rounded-2xl overflow-hidden border border-border">
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
          <RNText className="text-muted uppercase tracking-wide text-xs">
            {Strings.dashboardTotalBalance}
          </RNText>
          <RNText className="text-2xl font-bold text-accent mt-1">
            {formatAmount(assetsEgp)} <RNText className="text-base text-muted">EGP</RNText>
          </RNText>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <RNText className="text-muted uppercase tracking-wide text-xs">
            {Strings.dashboardAccountsLabel}
          </RNText>
          <RNText className="text-base font-semibold text-foreground mt-1">
            {String(accountsCount)}
          </RNText>
        </View>
      </LinearGradient>
    </View>
  );
}
