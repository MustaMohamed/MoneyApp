import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Svg, { Defs, Pattern, Path, Rect } from 'react-native-svg';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import { formatAmount } from '@/utils/format_amount';

interface HeroCardProps {
  assetsEgp: number;
  assetsUsd: number;
  rate: number;
  isManualOverride: boolean;
  assetsCount: number;
  liabilitiesCount: number;
  onPress: () => void;
}

function GridTexture() {
  return (
    <Svg style={StyleSheet.absoluteFill}>
      <Defs>
        <Pattern id="dash-hero-grid-v2" width="26" height="26" patternUnits="userSpaceOnUse">
          <Path d="M 26 0 L 0 0 0 26" fill="none" stroke="#FFFFFF" strokeWidth="1" opacity="0.03" />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#dash-hero-grid-v2)" />
    </Svg>
  );
}

export function HeroCard({
  assetsEgp,
  assetsUsd,
  rate,
  isManualOverride,
  assetsCount,
  liabilitiesCount,
  onPress,
}: HeroCardProps) {
  const totalAccounts = assetsCount + liabilitiesCount;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={Strings.dashAvailableToSpend}
      className="mx-4 mt-4 rounded-2xl border border-border overflow-hidden"
    >
      <LinearGradient
        colors={[Colors.shared.heroGrad1, Colors.shared.heroGrad2, Colors.shared.heroGrad3]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <GridTexture />
      <View
        pointerEvents="none"
        className="absolute"
        style={{
          top: -ms(40),
          right: -ms(40),
          width: ms(160),
          height: ms(160),
          borderRadius: ms(80),
          backgroundColor: Colors.dark.gold,
          opacity: 0.18,
        }}
      />

      <View
        className="flex-row items-center justify-between px-5 pt-5"
        style={{ flexDirection: 'row' }}
      >
        <View className="flex-row items-center" style={{ flexDirection: 'row', gap: ms(8) }}>
          <View
            className="items-center justify-center rounded-full"
            style={{
              width: ms(24),
              height: ms(24),
              backgroundColor: Colors.shared.cairoGold + '22',
            }}
          >
            <MaterialCommunityIcons name="wallet" size={ms(14)} color={Colors.shared.cairoGold} />
          </View>
          <Text variant="caption" className="text-foreground tracking-wide">
            {Strings.dashAvailableToSpend}
          </Text>
        </View>
        {isManualOverride && (
          <View
            className="flex-row items-center rounded-full"
            style={{
              flexDirection: 'row',
              gap: ms(4),
              paddingHorizontal: ms(8),
              paddingVertical: ms(3),
              backgroundColor: Colors.shared.cairoGold + '22',
              borderWidth: 1,
              borderColor: Colors.shared.cairoGold,
            }}
          >
            <View
              style={{
                width: ms(5),
                height: ms(5),
                borderRadius: ms(3),
                backgroundColor: Colors.shared.cairoGold,
              }}
            />
            <Text className="uppercase text-xs" style={{ color: Colors.shared.cairoGold }}>
              Manual
            </Text>
          </View>
        )}
      </View>

      <Text
        className="px-5 mt-3 mb-2 font-bold"
        style={{ color: Colors.dark.gold, fontSize: ms(32) }}
      >
        {formatAmount(assetsEgp)} <Text style={{ fontSize: ms(16), opacity: 0.8 }}>EGP</Text>
      </Text>

      <View className="flex-row flex-wrap px-5 pb-5" style={{ flexDirection: 'row', gap: ms(6) }}>
        <View
          className="flex-row items-center rounded-full px-2 py-1"
          style={{ flexDirection: 'row', gap: ms(4), backgroundColor: Colors.dark.overlayWhite7 }}
        >
          <MaterialCommunityIcons
            name="approximately-equal"
            size={ms(11)}
            color={Colors.dark.text1}
          />
          <Text className="text-xs text-foreground">
            {rate > 0 ? `${formatAmount(assetsUsd, 0)} USD` : '— USD'}
          </Text>
        </View>
        <View
          className="flex-row items-center rounded-full px-2 py-1"
          style={{ flexDirection: 'row', gap: ms(4), backgroundColor: Colors.dark.overlayWhite7 }}
        >
          <MaterialCommunityIcons name="swap-horizontal" size={ms(11)} color={Colors.dark.text1} />
          <Text className="text-xs text-foreground">1 USD = {rate.toFixed(2)} EGP</Text>
        </View>
        <View
          className="flex-row items-center rounded-full px-2 py-1"
          style={{ flexDirection: 'row', gap: ms(4), backgroundColor: Colors.dark.overlayWhite7 }}
        >
          <MaterialCommunityIcons name="bank-outline" size={ms(11)} color={Colors.dark.text1} />
          <Text className="text-xs text-foreground">{totalAccounts} accounts</Text>
        </View>
      </View>
    </Pressable>
  );
}
