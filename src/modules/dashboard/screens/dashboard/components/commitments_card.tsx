import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Card, PressableFeedback, SkeletonGroup } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { formatMonthYear } from '@/utils/format_date';
import { ms } from '@/utils/responsive';

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

const numberFmt = new Intl.NumberFormat('en-US', { style: 'decimal' });

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
        className="border-border mx-4 mt-4 rounded-2xl border p-0 px-4 py-3"
        style={{ gap: ms(8), elevation: 0, shadowOpacity: 0 }}
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

        <SkeletonGroup isLoading={isLoading} style={{ gap: ms(8) }}>
          <View
            className="flex-row items-center justify-between"
            style={{ flexDirection: 'row', gap: ms(8) }}
          >
            <View className="flex-1" style={{ flex: 1 }}>
              <Text variant="hint" className="text-muted text-xs uppercase">
                {Strings.commitmentsTotalCommitted}
              </Text>
              <SkeletonGroup.Item isLoading={isLoading} className="h-6 w-32 rounded-md">
                <Text className="text-foreground text-lg font-bold" numberOfLines={1}>
                  {totalsLine}
                </Text>
              </SkeletonGroup.Item>
            </View>
            <SkeletonGroup.Item isLoading={isLoading} className="h-7 w-14 rounded-full">
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
            </SkeletonGroup.Item>
          </View>

          <SkeletonGroup.Item isLoading={isLoading} className="h-[3px] w-full rounded-[2px]">
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
          </SkeletonGroup.Item>

          <View className="flex-row items-center justify-between" style={{ flexDirection: 'row' }}>
            <SkeletonGroup.Item isLoading={isLoading} className="h-4 w-8 rounded-md">
              <Stat icon="check-circle" color={Colors.dark.positive} value={counts.paid} />
            </SkeletonGroup.Item>
            <SkeletonGroup.Item isLoading={isLoading} className="h-4 w-8 rounded-md">
              <Stat icon="alert-circle" color={Colors.dark.negative} value={counts.overdue} />
            </SkeletonGroup.Item>
            <SkeletonGroup.Item isLoading={isLoading} className="h-4 w-8 rounded-md">
              <Stat icon="clock-outline" color={Colors.dark.gold} value={counts.due} />
            </SkeletonGroup.Item>
            <SkeletonGroup.Item isLoading={isLoading} className="h-4 w-8 rounded-md">
              <Stat icon="calendar-clock" color={Colors.dark.text2} value={counts.upcoming} />
            </SkeletonGroup.Item>
            <SkeletonGroup.Item isLoading={isLoading} className="h-4 w-8 rounded-md">
              <Stat icon="minus-circle" color={Colors.dark.text3} value={counts.skipped} />
            </SkeletonGroup.Item>
          </View>
        </SkeletonGroup>
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
