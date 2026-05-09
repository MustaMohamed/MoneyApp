import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, Text, View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { ms, msFont } from '@/utils/responsive';
import { formatAmount } from '@/utils/format_amount';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

interface StatCardsProps {
  netWorthEgp: number;
  assetsEgp: number;
  liabilitiesEgp: number;
  assetsCount: number;
  liabilitiesCount: number;
  monthSpentEgp: number;
  monthSpentUsd: number;
  monthSpendDeltaPct: number | null;
  monthSpendCount: number;
  spendYearMonth: string;
}

export function StatCards({
  netWorthEgp,
  assetsEgp,
  liabilitiesEgp,
  assetsCount,
  liabilitiesCount,
  monthSpentEgp,
  monthSpentUsd,
  monthSpendDeltaPct,
  monthSpendCount,
  spendYearMonth,
}: StatCardsProps) {
  const netNegative = netWorthEgp < 0;
  const netColor = netNegative ? Colors.dark.negative : Colors.dark.positive;

  // Mini bar split — assets vs liabilities. Use abs since liabilities are positive numbers here.
  const total = assetsEgp + Math.abs(liabilitiesEgp);
  const assetsPct = total > 0 ? assetsEgp / total : 1;

  const monthIdx = parseInt(spendYearMonth.split('-')[1], 10) - 1;
  const monthLabel = SHORT_MONTHS[monthIdx] ?? '';
  const prevMonthLabel = SHORT_MONTHS[(monthIdx + 11) % 12] ?? '';
  // For spending, an increase is *bad* (negative for the user) — flip semantics.
  const deltaPositive = monthSpendDeltaPct != null && monthSpendDeltaPct < 0;
  const deltaNegative = monthSpendDeltaPct != null && monthSpendDeltaPct > 0;
  const deltaColor = deltaPositive
    ? Colors.dark.positive
    : deltaNegative
      ? Colors.dark.negative
      : Colors.dark.text2;
  const deltaIcon: IconName = deltaPositive
    ? 'trending-down'
    : deltaNegative
      ? 'trending-up'
      : 'trending-neutral';

  return (
    <View style={styles.row}>
      {/* Net Worth */}
      <View style={styles.card}>
        <View style={styles.titleRow}>
          <View style={[styles.iconBadge, { backgroundColor: netColor + '22' }]}>
            <MaterialCommunityIcons name="scale-balance" size={ms(13)} color={netColor} />
          </View>
          <Text style={styles.title}>{Strings.dashNetWorthTitle}</Text>
        </View>
        <Text style={[styles.value, { color: netColor }]} numberOfLines={1}>
          {formatAmount(netWorthEgp)} <Text style={styles.valueCurrency}>EGP</Text>
        </Text>
        <View style={styles.splitTrack}>
          <View style={[styles.splitAssets, { flex: assetsPct }]} />
          <View style={[styles.splitLiabs, { flex: 1 - assetsPct }]} />
        </View>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={styles.legendHeader}>
              <View style={[styles.dot, { backgroundColor: Colors.dark.positive }]} />
              <Text style={styles.legendLabel}>
                {Strings.dashAssetsLabel} ({assetsCount})
              </Text>
            </View>
            <Text style={styles.legendValue} numberOfLines={1}>
              {formatAmount(assetsEgp)}
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={styles.legendHeader}>
              <View style={[styles.dot, { backgroundColor: Colors.dark.negative }]} />
              <Text style={styles.legendLabel}>
                {Strings.dashLiabilitiesLabel} ({liabilitiesCount})
              </Text>
            </View>
            <Text style={styles.legendValue} numberOfLines={1}>
              {formatAmount(liabilitiesEgp)}
            </Text>
          </View>
        </View>
      </View>

      {/* Spent This Month */}
      <View style={styles.card}>
        <View style={styles.titleRow}>
          <View style={[styles.iconBadge, { backgroundColor: Colors.dark.negative + '22' }]}>
            <MaterialCommunityIcons name="cash-minus" size={ms(13)} color={Colors.dark.negative} />
          </View>
          <Text style={styles.title}>{Strings.dashMonthSpentTitle}</Text>
          <Text style={styles.month}>{monthLabel}</Text>
        </View>
        <Text style={styles.value} numberOfLines={1}>
          {formatAmount(monthSpentEgp)} <Text style={styles.valueCurrency}>EGP</Text>
        </Text>
        <Text style={styles.value} numberOfLines={1}>
          {formatAmount(monthSpentUsd, 0)} <Text style={styles.valueCurrency}>USD</Text>
        </Text>
        <View style={styles.spendMeta}>
          <View style={styles.deltaWrap}>
            <View style={[styles.deltaChip, { backgroundColor: deltaColor + '22' }]}>
              <MaterialCommunityIcons name={deltaIcon} size={ms(11)} color={deltaColor} />
              <Text style={[styles.deltaText, { color: deltaColor }]}>
                {monthSpendDeltaPct == null ? '—' : `${Math.abs(monthSpendDeltaPct)}%`}
              </Text>
            </View>
            <Text style={styles.deltaCaption}>vs {prevMonthLabel}</Text>
          </View>
          <Text style={styles.txCount}>{monthSpendCount} txs</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginHorizontal: Spacing.sm,
    marginTop: Spacing.xs,
    gap: Spacing.xs,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.dark.surface,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    gap: Spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  iconBadge: {
    width: ms(20),
    height: ms(20),
    borderRadius: ms(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontFamily: FontFamily.interMedium,
    fontSize: msFont(10),
    color: Colors.dark.text2,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginLeft: ms(2),
  },
  month: {
    fontFamily: FontFamily.interMedium,
    fontSize: msFont(9),
    color: Colors.dark.text2,
  },
  value: {
    fontFamily: FontFamily.soraBold,
    fontSize: msFont(16),
    color: Colors.dark.text1,
  },
  valueCurrency: {
    fontFamily: FontFamily.interMedium,
    fontSize: msFont(11),
    color: Colors.dark.text2,
  },
  splitTrack: {
    flexDirection: 'row',
    height: ms(4),
    borderRadius: ms(2),
    overflow: 'hidden',
    backgroundColor: Colors.dark.surfaceEl,
  },
  splitAssets: {
    backgroundColor: Colors.dark.positive,
  },
  splitLiabs: {
    backgroundColor: Colors.dark.negative,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: ms(2),
    gap: Spacing.xs,
  },
  legendItem: {
    flex: 1,
    gap: ms(2),
  },
  legendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(4),
  },
  dot: {
    width: ms(6),
    height: ms(6),
    borderRadius: ms(3),
  },
  legendLabel: {
    fontFamily: FontFamily.interRegular,
    fontSize: msFont(9),
    color: Colors.dark.text2,
  },
  legendValue: {
    fontFamily: FontFamily.soraSemi,
    fontSize: msFont(11),
    color: Colors.dark.text1,
  },
  spendMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  deltaWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(5),
    flexShrink: 1,
  },
  deltaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(3),
    paddingHorizontal: Spacing.xs,
    paddingVertical: ms(2),
    borderRadius: Radius.pill,
  },
  deltaText: {
    fontFamily: FontFamily.soraSemi,
    fontSize: msFont(10),
  },
  deltaCaption: {
    fontFamily: FontFamily.interRegular,
    fontSize: msFont(9),
    color: Colors.dark.text2,
    flexShrink: 1,
  },
  txCount: {
    fontFamily: FontFamily.interRegular,
    fontSize: msFont(10),
    color: Colors.dark.text2,
  },
});
