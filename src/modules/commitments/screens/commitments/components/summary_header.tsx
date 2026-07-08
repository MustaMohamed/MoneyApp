import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Card, Skeleton } from 'heroui-native';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { GoldTokens } from '@/constants/theme_tokens';
import { ms } from '@/utils/responsive';

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
const SUMMARY_ROW_HEIGHT = ms(27);
const SUMMARY_PROGRESS_HEIGHT = ms(3);
const SUMMARY_STATS_ROW_HEIGHT = ms(13);

function SummarySkeleton(): React.ReactElement {
  return (
    <>
      <View
        testID="commitments-summary-skeleton-summary-row"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: ms(8),
          minHeight: SUMMARY_ROW_HEIGHT,
        }}
      >
        <View style={{ flex: 1, gap: ms(4) }}>
          <Skeleton className="w-28 rounded-md" style={{ height: ms(6) }} />
          <Skeleton className="w-32 rounded-md" style={{ height: ms(14) }} />
        </View>
        <Skeleton className="w-12 rounded-full" style={{ height: ms(14) }} />
      </View>
      <Skeleton
        testID="commitments-summary-skeleton-progress"
        className="w-full rounded-[2px]"
        style={{ height: SUMMARY_PROGRESS_HEIGHT }}
      />
      <View
        testID="commitments-summary-skeleton-stats-row"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: SUMMARY_STATS_ROW_HEIGHT,
        }}
      >
        {[0, 1, 2, 3, 4].map((stat) => (
          <View
            key={stat}
            testID="commitments-summary-skeleton-stat"
            style={{ flexDirection: 'row', alignItems: 'center', gap: ms(4) }}
          >
            <Skeleton className="rounded-full" style={{ width: ms(11), height: ms(11) }} />
            <Skeleton className="rounded-md" style={{ width: ms(8), height: ms(9) }} />
          </View>
        ))}
      </View>
    </>
  );
}

export function SummaryHeader({ counts, totalsByCurrency, isLoading = false }: SummaryHeaderProps) {
  const progress = counts.total > 0 ? counts.paid / counts.total : 0;
  const progressPct = Math.round(progress * 100);
  const totalEntries = Array.from(totalsByCurrency.entries());
  const totalsLine =
    totalEntries.length === 0
      ? '—'
      : totalEntries.map(([cur, amt]) => `${numberFmt.format(amt)} ${cur}`).join('  ·  ');

  return (
    <Card className="bg-surface border-border mx-4 mb-2 gap-1 rounded-2xl border px-3 py-2">
      {isLoading ? (
        <SummarySkeleton />
      ) : (
        <>
          <View
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            className="gap-2"
          >
            <View style={{ flex: 1 }}>
              <Text className="font-inter text-muted text-[10px] tracking-wide uppercase">
                {Strings.commitmentsTotalCommitted}
              </Text>
              <Text className="font-sora text-foreground text-[16px] font-bold" numberOfLines={1}>
                {totalsLine}
              </Text>
            </View>
            <View
              style={{ backgroundColor: `${GoldTokens[500]}22` }}
              className="rounded-full px-2 py-0.5"
            >
              <Text className="font-sora text-[13px] font-bold" style={{ color: GoldTokens[500] }}>
                {progressPct}%
              </Text>
            </View>
          </View>

          <View className="bg-default h-[3px] overflow-hidden rounded-[2px]">
            <LinearGradient
              colors={[GoldTokens[500], Colors.dark.gold]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ height: 3, borderRadius: 2, width: `${progressPct}%` }}
            />
          </View>

          <View
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
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
