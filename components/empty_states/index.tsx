import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';

export type EmptyStateVariant = 'accounts' | 'transactions' | 'bills' | 'goals' | 'budget';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const VARIANT_CONFIG: Record<EmptyStateVariant, { icon: IconName; title: string; sub: string }> = {
  accounts: {
    icon: 'bank-outline',
    title: Strings.emptyAccountsTitle,
    sub: Strings.emptyAccountsSub,
  },
  transactions: {
    icon: 'swap-horizontal',
    title: Strings.emptyTransactionsTitle,
    sub: Strings.emptyTransactionsSub,
  },
  bills: {
    icon: 'calendar-clock-outline',
    title: Strings.emptyBillsTitle,
    sub: Strings.emptyBillsSub,
  },
  goals: {
    icon: 'target',
    title: Strings.emptyGoalsTitle,
    sub: Strings.emptyGoalsSub,
  },
  budget: {
    icon: 'chart-pie',
    title: Strings.emptyBudgetTitle,
    sub: Strings.emptyBudgetSub,
  },
};

interface EmptyStateProps {
  variant: EmptyStateVariant;
  onAction?: () => void;
  actionLabel?: string;
}

export function EmptyState({ variant, onAction, actionLabel }: EmptyStateProps) {
  const config = VARIANT_CONFIG[variant];

  return (
    <View style={styles.container}>
      <View style={styles.iconBox}>
        <MaterialCommunityIcons name={config.icon} size={Size.iconHero} color={Colors.dark.text2} />
      </View>
      <Text style={styles.title}>{config.title}</Text>
      <Text style={styles.sub}>{config.sub}</Text>
      {onAction && (
        <Pressable onPress={onAction} style={styles.ctaPress}>
          <LinearGradient
            colors={[Colors.shared.cairoGold, Colors.dark.gold]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cta}
          >
            <Text style={styles.ctaText}>{actionLabel}</Text>
          </LinearGradient>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.sm,
  },
  iconBox: {
    width: Size.iconHero * 1.5,
    height: Size.iconHero * 1.5,
    borderRadius: Size.iconHero * 0.75,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.title,
    color: Colors.dark.text1,
    textAlign: 'center',
  },
  sub: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.body,
    color: Colors.dark.text2,
    textAlign: 'center',
    lineHeight: Type.body * 1.6,
  },
  ctaPress: {
    width: '100%',
    borderRadius: Radius.cta,
    overflow: 'hidden',
    marginTop: Spacing.md,
  },
  cta: {
    height: Size.ctaHeight,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.cta,
  },
  ctaText: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.bodyStrong,
    color: Colors.shared.midnightBlue,
  },
});
