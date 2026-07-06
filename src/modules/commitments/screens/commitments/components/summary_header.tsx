import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Card, SkeletonGroup } from 'heroui-native';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { GoldTokens } from '@/constants/theme_tokens';

interface SummaryHeaderProps {
  counts: {
    paid: number;
    overdue: number;
    due: number;
    upcoming: number;
    skipped: number;
    total: number;
  };
  totalsByCurrency: Map<string, number>;
  isLoading?: boolean;
}

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
const numberFmt = new Intl.NumberFormat('en-US', { style: 'decimal' });

export function SummaryHeader({ counts, totalsByCurrency, isLoading = false }: SummaryHeaderProps) {
  const progress = counts.total > 0 ? counts.paid / counts.total : 0;
  const progressPct = Math.round(progress * 100);
  const totalEntries = Array.from(totalsByCurrency.entries());
  const totalsLine =
    totalEntries.length === 0
      ? '—'
      : totalEntries.map(([cur, amt]) => `${numberFmt.format(amt)} ${cur}`).join('  ·  ');

  return (
    <Card className="bg-surface border-border mx-4 mb-2 gap-1 rounded-2xl border px-4 py-2">
      <SkeletonGroup isLoading={isLoading} className="gap-1">
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          className="gap-2"
        >
          <View style={{ flex: 1 }}>
            <Text className="font-inter text-muted text-[10px] tracking-wide uppercase">
              {Strings.commitmentsTotalCommitted}
            </Text>
            <SkeletonGroup.Item isLoading={isLoading} className="h-5 w-32 rounded-md">
              <Text className="font-sora text-foreground text-[16px] font-bold" numberOfLines={1}>
                {totalsLine}
              </Text>
            </SkeletonGroup.Item>
          </View>
          <SkeletonGroup.Item isLoading={isLoading} className="h-6 w-12 rounded-full">
            <View
              style={{ backgroundColor: `${GoldTokens[500]}22` }}
              className="rounded-full px-2 py-0.5"
            >
              <Text className="font-sora text-[13px] font-bold" style={{ color: GoldTokens[500] }}>
                {progressPct}%
              </Text>
            </View>
          </SkeletonGroup.Item>
        </View>

        <SkeletonGroup.Item isLoading={isLoading} className="h-[3px] w-full rounded-[2px]">
          <View className="bg-default h-[3px] overflow-hidden rounded-[2px]">
            <LinearGradient
              colors={[GoldTokens[500], Colors.dark.gold]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ height: 3, borderRadius: 2, width: `${progressPct}%` }}
            />
          </View>
        </SkeletonGroup.Item>

        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
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
  );
}

function Stat({ icon, color, value }: { icon: IconName; color: string; value: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }} className="gap-1">
      <MaterialCommunityIcons name={icon} size={13} color={color} />
      <Text className="font-sora text-[11px] font-semibold" style={{ color }}>
        {value}
      </Text>
    </View>
  );
}
