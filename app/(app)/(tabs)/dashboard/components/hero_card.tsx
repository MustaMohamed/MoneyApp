import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { formatAmount } from '../dashboard.helpers';

interface HeroCardProps {
  assetsEgp: number;
  netWorthUsd: number;
  rate: number;
  isManualOverride: boolean;
  onPress: () => void;
}

export function HeroCard({
  assetsEgp,
  netWorthUsd,
  rate,
  isManualOverride,
  onPress,
}: HeroCardProps) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <Text style={styles.label}>{Strings.dashAvailableToSpend}</Text>
      <Text style={styles.amount}>{formatAmount(assetsEgp)} EGP</Text>
      <View style={styles.badgeRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>≈ {formatAmount(netWorthUsd, 0)} USD</Text>
        </View>
        <View style={[styles.badge, isManualOverride && styles.badgeManual]}>
          <Text style={styles.badgeText}>
            1 USD = {rate.toFixed(2)} EGP{isManualOverride ? ' ●' : ''}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.sm,
    marginTop: Spacing.md,
    backgroundColor: Colors.dark.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  label: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.caption,
    color: Colors.dark.text2,
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  amount: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.hero,
    color: Colors.dark.gold,
    marginBottom: Spacing.sm,
  },
  badgeRow: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  badge: {
    backgroundColor: Colors.dark.surfaceEl,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
  },
  badgeManual: { borderWidth: 1, borderColor: Colors.shared.cairoGold },
  badgeText: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.micro,
    color: Colors.dark.text2,
  },
});
