import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Card, Skeleton } from 'heroui-native';
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
import { GoldTokens } from '@/constants/theme_tokens';
import { formatCurrencyTotals } from '@/utils/format_amount';
import { wholePercentOf } from '@/utils/money';
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
  totalsByCurrency: Map<Currency, number>;
  isLoading?: boolean;
}

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
const SUMMARY_ROW_HEIGHT = ms(27);
const SUMMARY_PROGRESS_HEIGHT = ms(3);
const SUMMARY_STATS_ROW_HEIGHT = ms(13);

function SummarySkeleton(): React.ReactElement {
  const { fontScale } = useWindowDimensions();
  return (
    <>
      <View
        testID="commitments-summary-skeleton-summary-row"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: ms(8),
          minHeight: resolveSkeletonBarHeight(SUMMARY_ROW_HEIGHT, fontScale),
        }}
      >
        <View style={{ flex: 1, gap: ms(4) }}>
          <Skeleton
            className="w-28 rounded-md"
            style={{ height: resolveSkeletonBarHeight(ms(6), fontScale) }}
          />
          <Skeleton
            className="w-32 rounded-md"
            style={{ height: resolveSkeletonBarHeight(ms(14), fontScale) }}
          />
        </View>
        <Skeleton
          className="w-12 rounded-full"
          style={{ height: resolveSkeletonBarHeight(ms(14), fontScale) }}
        />
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
          minHeight: resolveSkeletonBarHeight(SUMMARY_STATS_ROW_HEIGHT, fontScale),
        }}
      >
        {[0, 1, 2, 3, 4].map((stat) => (
          <View
            key={stat}
            testID="commitments-summary-skeleton-stat"
            style={{ flexDirection: 'row', alignItems: 'center', gap: ms(4) }}
          >
            <Skeleton className="rounded-full" style={{ width: ms(11), height: ms(11) }} />
            <Skeleton
              className="rounded-md"
              style={{ width: ms(8), height: resolveSkeletonBarHeight(ms(9), fontScale) }}
            />
          </View>
        ))}
      </View>
    </>
  );
}

export function SummaryHeader({ counts, totalsByCurrency, isLoading = false }: SummaryHeaderProps) {
  const progressPct = wholePercentOf(counts.paid, counts.total);
  const totalsLine = formatCurrencyTotals(totalsByCurrency);
  const { fontScale } = useWindowDimensions();

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
              <Text
                {...resolveOneLineTextProps(scaledTextStyle(Type.pillLabel, fontScale))}
                className="font-inter text-muted tracking-wide uppercase"
              >
                {Strings.commitmentsTotalCommitted}
              </Text>
              <Text
                {...resolveFitAmountTextProps(Type.subhead, fontScale)}
                className="font-sora-bold text-foreground"
              >
                {totalsLine}
              </Text>
            </View>
            <View
              style={{ backgroundColor: Colors.dark.goldTint }}
              className="rounded-full px-2 py-0.5"
            >
              <Text
                allowFontScaling={false}
                className="font-sora-bold"
                style={{ ...scaledTextStyle(Type.meta, fontScale), color: GoldTokens[500] }}
              >
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
  const { fontScale } = useWindowDimensions();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }} className="gap-1">
      <MaterialCommunityIcons name={icon} size={13} color={color} />
      <Text
        allowFontScaling={false}
        className="font-sora-semibold"
        style={{ ...scaledTextStyle(Type.micro, fontScale), color }}
      >
        {value}
      </Text>
    </View>
  );
}
