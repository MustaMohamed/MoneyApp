import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Card, PressableFeedback, Skeleton } from 'heroui-native';
import React from 'react';
import { View, useWindowDimensions } from 'react-native';

import { resolveSkeletonBarHeight } from '@/components/ui/skeleton_bar.geometry';
import { Text } from '@/components/ui/text';
import {
  resolveFitAmountTextProps,
  resolveOneLineTextProps,
  scaledTextStyle,
} from '@/components/ui/text_scale.geometry';
import type { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, Type } from '@/constants/theme';
import { formatCurrencyTotals } from '@/utils/format_amount';
import { formatMonthYear } from '@/utils/format_date';
import { wholePercentOf } from '@/utils/money';
import { ms } from '@/utils/responsive';

import { DASHBOARD_CARD_PADDING } from './dashboard_card.geometry';
import { DASHBOARD_SKELETON_ANIMATION } from './skeleton_animation';

interface Props {
  counts: {
    paid: number;
    overdue: number;
    due: number;
    upcoming: number;
    skipped: number;
    total: number;
  };
  totalsByCurrency: Map<Currency, number>;
  yearMonth: string;
  isLoading: boolean;
  onPress: () => void;
}

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const DASHBOARD_COMMITMENTS_SUMMARY_ROW_HEIGHT = ms(33);
const DASHBOARD_COMMITMENTS_PROGRESS_HEIGHT = ms(3);
const DASHBOARD_COMMITMENTS_STATS_ROW_HEIGHT = ms(14);

function CommitmentsCardSkeleton(): React.ReactElement {
  const { fontScale } = useWindowDimensions();
  return (
    <>
      <View
        testID="dashboard-commitments-skeleton-summary-row"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: ms(8),
          minHeight: resolveSkeletonBarHeight(DASHBOARD_COMMITMENTS_SUMMARY_ROW_HEIGHT, fontScale),
        }}
      >
        <View style={{ flex: 1, gap: ms(4) }}>
          <Skeleton
            animation={DASHBOARD_SKELETON_ANIMATION}
            className="w-28 rounded-md"
            style={{ height: resolveSkeletonBarHeight(ms(10), fontScale) }}
          />
          <Skeleton
            animation={DASHBOARD_SKELETON_ANIMATION}
            className="w-32 rounded-md"
            style={{ height: resolveSkeletonBarHeight(ms(14), fontScale) }}
          />
        </View>
        <Skeleton
          animation={DASHBOARD_SKELETON_ANIMATION}
          className="w-14 rounded-full"
          style={{ height: resolveSkeletonBarHeight(ms(24), fontScale) }}
        />
      </View>
      <Skeleton
        testID="dashboard-commitments-skeleton-progress"
        animation={DASHBOARD_SKELETON_ANIMATION}
        className="w-full rounded-[2px]"
        style={{ height: DASHBOARD_COMMITMENTS_PROGRESS_HEIGHT }}
      />
      <View
        testID="dashboard-commitments-skeleton-stats-row"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: resolveSkeletonBarHeight(DASHBOARD_COMMITMENTS_STATS_ROW_HEIGHT, fontScale),
        }}
      >
        {[0, 1, 2, 3, 4].map((stat) => (
          <View
            key={stat}
            testID="dashboard-commitments-skeleton-stat"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: ms(2),
            }}
          >
            <Skeleton
              animation={DASHBOARD_SKELETON_ANIMATION}
              className="rounded-full"
              style={{ width: ms(11), height: ms(11) }}
            />
            <Skeleton
              animation={DASHBOARD_SKELETON_ANIMATION}
              className="rounded-md"
              style={{ width: ms(8), height: resolveSkeletonBarHeight(ms(9), fontScale) }}
            />
          </View>
        ))}
      </View>
    </>
  );
}

export function CommitmentsCard({
  counts,
  totalsByCurrency,
  yearMonth,
  isLoading,
  onPress,
}: Props) {
  const { fontScale } = useWindowDimensions();
  const monthLabel = formatMonthYear(yearMonth);
  const progressPct = wholePercentOf(counts.paid, counts.total);
  const totalsLine = formatCurrencyTotals(totalsByCurrency);

  return (
    <PressableFeedback
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={Strings.dashboardCommitmentsTitle}
    >
      <Card
        testID="dashboard-commitments-card"
        className="border-border mx-4 mt-4 rounded-2xl border p-0"
        style={{
          ...DASHBOARD_CARD_PADDING,
          gap: ms(8),
          boxShadow: 'none',
        }}
      >
        <View className="flex-row items-center justify-between" style={{ flexDirection: 'row' }}>
          <View className="flex-row items-center" style={{ flexDirection: 'row', gap: ms(8) }}>
            <View
              className="items-center justify-center rounded-full"
              style={{
                width: ms(22),
                height: ms(22),
                backgroundColor: Colors.dark.goldTint,
              }}
            >
              <MaterialCommunityIcons
                name="calendar-check"
                size={ms(13)}
                color={Colors.shared.cairoGold}
              />
            </View>
            <Text variant="caption" className="font-inter-semibold text-foreground">
              {Strings.dashboardCommitmentsTitle}
            </Text>
          </View>
          <Text variant="caption" className="text-muted">
            {monthLabel}
          </Text>
        </View>

        {isLoading ? (
          <CommitmentsCardSkeleton />
        ) : (
          <>
            <View
              className="flex-row items-center justify-between"
              style={{ flexDirection: 'row', gap: ms(8) }}
            >
              <View className="flex-1" style={{ flex: 1 }}>
                <Text
                  variant="hint"
                  {...resolveOneLineTextProps(scaledTextStyle(Type.caption, fontScale))}
                  className="text-muted uppercase"
                >
                  {Strings.commitmentsTotalCommitted}
                </Text>
                <Text
                  {...resolveFitAmountTextProps(Type.title, fontScale)}
                  className="font-sora-bold text-foreground"
                >
                  {totalsLine}
                </Text>
              </View>
              <View
                className="rounded-full"
                style={{
                  paddingHorizontal: ms(12),
                  paddingVertical: ms(3),
                  backgroundColor: Colors.dark.goldTint,
                }}
              >
                <Text
                  allowFontScaling={false}
                  className="font-sora-bold"
                  style={{
                    ...scaledTextStyle(Type.subhead, fontScale),
                    color: Colors.shared.cairoGold,
                  }}
                >
                  {progressPct}%
                </Text>
              </View>
            </View>

            <View
              className="overflow-hidden rounded"
              style={{ height: ms(3), backgroundColor: Colors.dark.surfaceEl }}
            >
              <LinearGradient
                colors={[Colors.shared.cairoGold, Colors.dark.gold]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ height: ms(3), width: `${progressPct}%`, borderRadius: ms(2) }}
              />
            </View>

            <View
              className="flex-row items-center justify-between"
              style={{ flexDirection: 'row' }}
            >
              <Stat icon="check-circle" color={Colors.dark.positive} value={counts.paid} />
              <Stat icon="alert-circle" color={Colors.dark.negative} value={counts.overdue} />
              <Stat icon="clock-outline" color={Colors.dark.gold} value={counts.due} />
              <Stat icon="calendar-clock" color={Colors.dark.text2} value={counts.upcoming} />
              <Stat icon="minus-circle" color={Colors.dark.text3} value={counts.skipped} />
            </View>
          </>
        )}
      </Card>
    </PressableFeedback>
  );
}

function Stat({ icon, color, value }: { icon: IconName; color: string; value: number }) {
  const { fontScale } = useWindowDimensions();
  return (
    <View className="flex-row items-center" style={{ flexDirection: 'row', gap: ms(4) }}>
      <MaterialCommunityIcons name={icon} size={ms(13)} color={color} />
      <Text
        variant="caption"
        allowFontScaling={false}
        style={{ ...scaledTextStyle(Type.micro, fontScale), color }}
        className="font-inter-semibold"
      >
        {value}
      </Text>
    </View>
  );
}
