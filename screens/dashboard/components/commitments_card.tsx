import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { ms, msFont } from '@/utils/responsive';
import { formatMonthYear } from '@/utils/format_date';

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
  onPress: () => void;
}

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const numberFmt = new Intl.NumberFormat('en-US', { style: 'decimal' });

export function CommitmentsCard({ counts, totalsByCurrency, yearMonth, onPress }: Props) {
  const monthLabel = formatMonthYear(yearMonth);
  const progress = counts.total === 0 ? 0 : counts.paid / counts.total;
  const progressPct = Math.round(progress * 100);
  const totalEntries = Array.from(totalsByCurrency.entries());
  const totalsLine =
    totalEntries.length === 0
      ? '—'
      : totalEntries.map(([cur, amt]) => `${numberFmt.format(amt)} ${cur}`).join('  ·  ');

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.titleRow}>
        <View style={styles.titleBox}>
          <View style={styles.iconBadge}>
            <MaterialCommunityIcons
              name="calendar-check"
              size={ms(13)}
              color={Colors.shared.cairoGold}
            />
          </View>
          <Text style={styles.title}>{Strings.dashboardCommitmentsTitle}</Text>
        </View>
        <Text style={styles.month}>{monthLabel}</Text>
      </View>

      <View style={styles.heroRow}>
        <View style={styles.heroLeft}>
          <Text style={styles.heroLabel}>{Strings.commitmentsTotalCommitted}</Text>
          <Text style={styles.heroAmount} numberOfLines={1}>
            {totalsLine}
          </Text>
        </View>
        <View style={styles.progressBadge}>
          <Text style={styles.progressPct}>{progressPct}%</Text>
        </View>
      </View>

      <View style={styles.track}>
        <LinearGradient
          colors={[Colors.shared.cairoGold, Colors.dark.gold]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fill, { width: `${progressPct}%` }]}
        />
      </View>

      <View style={styles.statsRow}>
        <Stat icon="check-circle" color={Colors.dark.positive} value={counts.paid} />
        <Stat icon="alert-circle" color={Colors.dark.negative} value={counts.overdue} />
        <Stat icon="clock-outline" color={Colors.dark.gold} value={counts.due} />
        <Stat icon="calendar-clock" color={Colors.dark.text2} value={counts.upcoming} />
        <Stat icon="minus-circle" color={Colors.dark.text3} value={counts.skipped} />
      </View>
    </Pressable>
  );
}

function Stat({ icon, color, value }: { icon: IconName; color: string; value: number }) {
  return (
    <View style={styles.stat}>
      <MaterialCommunityIcons name={icon} size={ms(13)} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.dark.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    gap: Spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  iconBadge: {
    width: ms(22),
    height: ms(22),
    borderRadius: ms(11),
    backgroundColor: Colors.shared.cairoGold + '22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.caption,
    color: Colors.dark.text1,
    letterSpacing: 0.3,
  },
  month: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.caption,
    color: Colors.dark.text2,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  heroLeft: { flex: 1, gap: ms(1) },
  heroLabel: {
    fontFamily: FontFamily.interRegular,
    fontSize: msFont(10),
    color: Colors.dark.text2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  heroAmount: {
    fontFamily: FontFamily.soraBold,
    fontSize: msFont(16),
    color: Colors.dark.text1,
  },
  progressBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: ms(3),
    borderRadius: Radius.pill,
    backgroundColor: Colors.shared.cairoGold + '22',
  },
  progressPct: {
    fontFamily: FontFamily.soraBold,
    fontSize: msFont(13),
    color: Colors.shared.cairoGold,
  },
  track: {
    height: ms(3),
    backgroundColor: Colors.dark.surfaceEl,
    borderRadius: ms(2),
    overflow: 'hidden',
  },
  fill: {
    height: ms(3),
    borderRadius: ms(2),
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(4),
  },
  statValue: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.caption,
  },
});
