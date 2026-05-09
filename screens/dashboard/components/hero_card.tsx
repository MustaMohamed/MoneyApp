import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, Pattern, Path, Rect } from 'react-native-svg';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { ms, msFont } from '@/utils/responsive';
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
        <Pattern id="dash-hero-grid" width="26" height="26" patternUnits="userSpaceOnUse">
          <Path d="M 26 0 L 0 0 0 26" fill="none" stroke="#FFFFFF" strokeWidth="1" opacity="0.03" />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#dash-hero-grid)" />
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
    <Pressable onPress={onPress} style={styles.wrap}>
      <LinearGradient
        colors={[Colors.shared.heroGrad1, Colors.shared.heroGrad2, Colors.shared.heroGrad3]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <GridTexture />
      <View
        pointerEvents="none"
        style={[styles.glow, { backgroundColor: Colors.dark.gold, opacity: 0.18 }]}
      />

      <View style={styles.titleRow}>
        <View style={styles.titleBox}>
          <View style={styles.iconBadge}>
            <MaterialCommunityIcons name="wallet" size={ms(14)} color={Colors.shared.cairoGold} />
          </View>
          <Text style={styles.title}>{Strings.dashAvailableToSpend}</Text>
        </View>
        {isManualOverride && (
          <View style={styles.manualBadge}>
            <View style={styles.manualDot} />
            <Text style={styles.manualText}>Manual</Text>
          </View>
        )}
      </View>

      <Text style={styles.amount}>
        {formatAmount(assetsEgp)} <Text style={styles.amountCurrency}>EGP</Text>
      </Text>

      <View style={styles.metaRow}>
        <View style={styles.metaChip}>
          <MaterialCommunityIcons
            name="approximately-equal"
            size={ms(11)}
            color={Colors.dark.text1}
          />
          <Text style={styles.metaText}>{formatAmount(assetsUsd, 0)} USD</Text>
        </View>
        <View style={styles.metaChip}>
          <MaterialCommunityIcons name="swap-horizontal" size={ms(11)} color={Colors.dark.text1} />
          <Text style={styles.metaText}>1 USD = {rate.toFixed(2)} EGP</Text>
        </View>
        <View style={styles.metaChip}>
          <MaterialCommunityIcons name="bank-outline" size={ms(11)} color={Colors.dark.text1} />
          <Text style={styles.metaText}>{totalAccounts} accounts</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: Spacing.sm,
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  glow: {
    position: 'absolute',
    top: -ms(40),
    right: -ms(40),
    width: ms(160),
    height: ms(160),
    borderRadius: ms(80),
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  titleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  iconBadge: {
    width: ms(24),
    height: ms(24),
    borderRadius: ms(12),
    backgroundColor: Colors.shared.cairoGold + '22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.caption,
    color: Colors.dark.text1,
    letterSpacing: 0.5,
  },
  manualBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(4),
    paddingHorizontal: Spacing.xs,
    paddingVertical: ms(3),
    borderRadius: Radius.pill,
    backgroundColor: Colors.shared.cairoGold + '22',
    borderWidth: 1,
    borderColor: Colors.shared.cairoGold,
  },
  manualDot: {
    width: ms(5),
    height: ms(5),
    borderRadius: ms(3),
    backgroundColor: Colors.shared.cairoGold,
  },
  manualText: {
    fontFamily: FontFamily.interMedium,
    fontSize: msFont(9),
    color: Colors.shared.cairoGold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  amount: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.hero,
    color: Colors.dark.gold,
    marginBottom: Spacing.sm,
  },
  amountCurrency: {
    fontFamily: FontFamily.interMedium,
    fontSize: msFont(16),
    color: Colors.dark.gold,
    opacity: 0.8,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(4),
    backgroundColor: Colors.dark.overlayWhite7,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.xs,
    paddingVertical: ms(3),
  },
  metaText: {
    fontFamily: FontFamily.interMedium,
    fontSize: msFont(10),
    color: Colors.dark.text1,
  },
});
