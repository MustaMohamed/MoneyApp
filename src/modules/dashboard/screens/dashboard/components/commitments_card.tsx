import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Card, PressableFeedback, Skeleton } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { formatMonthYear } from '@/utils/format_date';
import { ms } from '@/utils/responsive';

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
  totalsByCurrency: Map<string, number>;
  yearMonth: string;
  isLoading: boolean;
  onPress: () => void;
}

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const DASHBOARD_COMMITMENTS_SUMMARY_ROW_HEIGHT = ms(34);
const DASHBOARD_COMMITMENTS_PROGRESS_HEIGHT = ms(3);
const DASHBOARD_COMMITMENTS_STATS_ROW_HEIGHT = ms(14);

const numberFmt = new Intl.NumberFormat('en-US', { style: 'decimal' });

function CommitmentsCardSkeleton(): React.ReactElement {
  return (
    <>
      <View
        testID="dashboard-commitments-skeleton-summary-row"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: ms(8),
          minHeight: DASHBOARD_COMMITMENTS_SUMMARY_ROW_HEIGHT,
        }}
      >
        <View style={{ flex: 1 }}>
          <Skeleton
            animation={DASHBOARD_SKELETON_ANIMATION}
            className="w-28 rounded-md"
            style={{ height: ms(12) }}
          />
          <Skeleton
            animation={DASHBOARD_SKELETON_ANIMATION}
            className="w-32 rounded-md"
            style={{ height: ms(22) }}
          />
        </View>
        <Skeleton
          animation={DASHBOARD_SKELETON_ANIMATION}
          className="w-14 rounded-full"
          style={{ height: ms(25) }}
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
          minHeight: DASHBOARD_COMMITMENTS_STATS_ROW_HEIGHT,
        }}
      >
        {[0, 1, 2, 3, 4].map((stat) => (
          <View
            key={stat}
            testID="dashboard-commitments-skeleton-stat"
            style={{ flexDirection: 'row', alignItems: 'center', gap: ms(4) }}
          >
            <Skeleton
              animation={DASHBOARD_SKELETON_ANIMATION}
              className="rounded-full"
              style={{ width: ms(13), height: ms(13) }}
            />
            <Skeleton
              animation={DASHBOARD_SKELETON_ANIMATION}
              className="rounded-md"
              style={{ width: ms(10), height: ms(11) }}
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
  const monthLabel = formatMonthYear(yearMonth);
  const progress = counts.total === 0 ? 0 : counts.paid / counts.total;
  const progressPct = Math.round(progress * 100);
  const totalEntries = Array.from(totalsByCurrency.entries());
  const totalsLine =
    totalEntries.length === 0
      ? '—'
      : totalEntries.map(([cur, amt]) => `${numberFmt.format(amt)} ${cur}`).join('  ·  ');

  return (
    <PressableFeedback
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={Strings.dashboardCommitmentsTitle}
    >
      <Card
        testID="dashboard-commitments-card"
        className="border-border mx-4 mt-4 rounded-2xl border p-0 px-4 py-3"
        style={{
          gap: ms(8),
          elevation: 0,
          shadowOpacity: 0,
        }}
      >
        <View className="flex-row items-center justify-between" style={{ flexDirection: 'row' }}>
          <View className="flex-row items-center" style={{ flexDirection: 'row', gap: ms(8) }}>
            <View
              className="items-center justify-center rounded-full"
              style={{
                width: ms(22),
                height: ms(22),
                backgroundColor: Colors.shared.cairoGold + '22',
              }}
            >
              <MaterialCommunityIcons
                name="calendar-check"
                size={ms(13)}
                color={Colors.shared.cairoGold}
              />
            </View>
            <Text variant="caption" className="text-foreground font-semibold">
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
                <Text variant="hint" className="text-muted text-xs uppercase">
                  {Strings.commitmentsTotalCommitted}
                </Text>
                <Text className="text-foreground text-lg font-bold" numberOfLines={1}>
                  {totalsLine}
                </Text>
              </View>
              <View
                className="rounded-full"
                style={{
                  paddingHorizontal: ms(12),
                  paddingVertical: ms(3),
                  backgroundColor: Colors.shared.cairoGold + '22',
                }}
              >
                <Text className="text-base font-bold" style={{ color: Colors.shared.cairoGold }}>
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
  return (
    <View className="flex-row items-center" style={{ flexDirection: 'row', gap: ms(4) }}>
      <MaterialCommunityIcons name={icon} size={ms(13)} color={color} />
      <Text variant="caption" style={{ color }} className="font-semibold">
        {value}
      </Text>
    </View>
  );
}
