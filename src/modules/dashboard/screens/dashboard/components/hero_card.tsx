import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { SkeletonGroup } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { HeroShell } from '@/components/ui/hero_shell';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { formatAmount } from '@/utils/format_amount';
import { ms } from '@/utils/responsive';

const DASHBOARD_HERO_CARD_MIN_HEIGHT = ms(148);
const DASHBOARD_HERO_AMOUNT_SKELETON_HEIGHT = ms(40);
const DASHBOARD_HERO_PILL_SKELETON_HEIGHT = ms(24);

interface HeroCardProps {
  assetsEgp: number;
  assetsUsd: number;
  rate: number;
  isManualOverride: boolean;
  assetsCount: number;
  liabilitiesCount: number;
  isLoading: boolean;
  onPress: () => void;
}

function HeroCardSkeleton(): React.ReactElement {
  return (
    <SkeletonGroup isLoading isSkeletonOnly style={{ gap: ms(8) }}>
      <SkeletonGroup.Item
        testID="dashboard-hero-skeleton-amount"
        className="mx-5 mt-3 mb-2 w-48 rounded-md"
        style={{ height: DASHBOARD_HERO_AMOUNT_SKELETON_HEIGHT }}
      />
      <View
        testID="dashboard-hero-skeleton-pills-row"
        className="flex-row flex-wrap px-5 pb-5"
        style={{
          flexDirection: 'row',
          gap: ms(6),
          minHeight: DASHBOARD_HERO_PILL_SKELETON_HEIGHT,
        }}
      >
        <SkeletonGroup.Item
          testID="dashboard-hero-skeleton-pill"
          className="w-24 rounded-full"
          style={{ height: DASHBOARD_HERO_PILL_SKELETON_HEIGHT }}
        />
        <SkeletonGroup.Item
          testID="dashboard-hero-skeleton-pill"
          className="w-36 rounded-full"
          style={{ height: DASHBOARD_HERO_PILL_SKELETON_HEIGHT }}
        />
        <SkeletonGroup.Item
          testID="dashboard-hero-skeleton-pill"
          className="w-24 rounded-full"
          style={{ height: DASHBOARD_HERO_PILL_SKELETON_HEIGHT }}
        />
      </View>
    </SkeletonGroup>
  );
}

export function HeroCard({
  assetsEgp,
  assetsUsd,
  rate,
  isManualOverride,
  assetsCount,
  liabilitiesCount,
  isLoading,
  onPress,
}: HeroCardProps) {
  const totalAccounts = assetsCount + liabilitiesCount;

  return (
    <HeroShell
      onPress={onPress}
      accessibilityLabel={Strings.dashAvailableToSpend}
      style={{ minHeight: DASHBOARD_HERO_CARD_MIN_HEIGHT }}
    >
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
            <Text className="text-xs uppercase" style={{ color: Colors.shared.cairoGold }}>
              {Strings.currencyManualShort}
            </Text>
          </View>
        )}
      </View>

      {isLoading ? (
        <HeroCardSkeleton />
      ) : (
        <>
          <Text
            className="mt-3 mb-2 px-5 font-bold"
            style={{ color: Colors.dark.gold, fontSize: ms(32) }}
          >
            {formatAmount(assetsEgp)} <Text style={{ fontSize: ms(16), opacity: 0.8 }}>EGP</Text>
          </Text>

          <View
            className="flex-row flex-wrap px-5 pb-5"
            style={{ flexDirection: 'row', gap: ms(6) }}
          >
            <View
              className="flex-row items-center rounded-full px-2 py-1"
              style={{
                flexDirection: 'row',
                gap: ms(4),
                backgroundColor: Colors.dark.overlayWhite7,
              }}
            >
              <MaterialCommunityIcons
                name="approximately-equal"
                size={ms(11)}
                color={Colors.dark.text1}
              />
              <Text className="text-foreground text-xs">
                {rate > 0 ? `${formatAmount(assetsUsd, 0)} USD` : '— USD'}
              </Text>
            </View>
            <View
              className="flex-row items-center rounded-full px-2 py-1"
              style={{
                flexDirection: 'row',
                gap: ms(4),
                backgroundColor: Colors.dark.overlayWhite7,
              }}
            >
              <MaterialCommunityIcons
                name="swap-horizontal"
                size={ms(11)}
                color={Colors.dark.text1}
              />
              <Text className="text-foreground text-xs">1 USD = {rate.toFixed(2)} EGP</Text>
            </View>
            <View
              className="flex-row items-center rounded-full px-2 py-1"
              style={{
                flexDirection: 'row',
                gap: ms(4),
                backgroundColor: Colors.dark.overlayWhite7,
              }}
            >
              <MaterialCommunityIcons name="bank-outline" size={ms(11)} color={Colors.dark.text1} />
              <Text className="text-foreground text-xs">
                {totalAccounts} {Strings.o6AccountsUnit}
              </Text>
            </View>
          </View>
        </>
      )}
    </HeroShell>
  );
}
