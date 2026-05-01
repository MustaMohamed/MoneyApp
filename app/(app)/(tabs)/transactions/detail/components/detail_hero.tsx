import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { Defs, Pattern, Path, Rect } from 'react-native-svg';

import { TransactionType } from '@/constants/enums';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import type { Category } from '@/database/entities/category.entity';
import type { Transaction } from '@/database/entities/transaction.entity';
import { ms, msFont } from '@/utils/responsive';
import { heroEntering } from '../detail.anim';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface Props {
  tx: Transaction;
  category?: Category;
  amountText: string;
  title: string;
  dateTimeText: string;
}

function colorFor(tx: Transaction, category?: Category): { color: string; icon: IconName } {
  switch (tx.type) {
    case TransactionType.Expense:
      return {
        color: Colors.dark.negative,
        icon: (category?.icon as IconName) ?? 'shape-outline',
      };
    case TransactionType.Income:
      return {
        color: Colors.dark.positive,
        icon: (category?.icon as IconName) ?? 'shape-outline',
      };
    case TransactionType.Transfer:
      return { color: Colors.shared.transferBlue, icon: 'swap-horizontal' };
    case TransactionType.CCPayment:
      return { color: Colors.shared.ccPlum, icon: 'credit-card-refund' };
  }
}

export function DetailHero({ tx, category, amountText, title, dateTimeText }: Props) {
  const { color, icon } = colorFor(tx, category);
  const tintBg = color.length === 7 ? `${color}2E` : color; // 18% opacity tint

  return (
    <Animated.View entering={heroEntering} style={styles.wrap}>
      <LinearGradient
        colors={[Colors.shared.heroGrad1, Colors.shared.heroGrad2, Colors.shared.heroGrad3]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <GridTexture />
      <View pointerEvents="none" style={[styles.glow, { backgroundColor: color, opacity: 0.25 }]} />
      <View style={[styles.iconBox, { backgroundColor: tintBg }]}>
        <MaterialCommunityIcons name={icon} size={ms(28)} color={color} />
      </View>
      <Text style={[styles.amount, { color }]} numberOfLines={1}>
        {amountText}
      </Text>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.meta} numberOfLines={1}>
        {dateTimeText}
      </Text>
    </Animated.View>
  );
}

function GridTexture() {
  return (
    <Svg style={StyleSheet.absoluteFill}>
      <Defs>
        <Pattern id="grid" width="26" height="26" patternUnits="userSpaceOnUse">
          <Path d="M 26 0 L 0 0 0 26" fill="none" stroke="#FFFFFF" strokeWidth="1" opacity="0.02" />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#grid)" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: -ms(40),
    right: -ms(40),
    width: ms(160),
    height: ms(160),
    borderRadius: ms(80),
  },
  iconBox: {
    width: ms(52),
    height: ms(52),
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  amount: {
    fontFamily: FontFamily.soraExtra,
    fontSize: msFont(36),
    marginBottom: Spacing.xs,
  },
  title: {
    fontFamily: FontFamily.interSemi,
    fontSize: msFont(16),
    color: Colors.dark.text1,
    opacity: 0.7,
  },
  meta: {
    fontFamily: FontFamily.interRegular,
    fontSize: msFont(12),
    color: Colors.dark.text1,
    opacity: 0.35,
    marginTop: Spacing.xxs,
  },
});
