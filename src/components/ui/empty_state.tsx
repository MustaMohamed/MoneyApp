import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { resolveStateScreenLayout } from '@/components/ui/state_screen.geometry';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { GoldTokens } from '@/constants/theme_tokens';
import { ms } from '@/utils/responsive';

const LAYOUT = resolveStateScreenLayout('empty');

export type EmptyStateVariant =
  | 'accounts'
  | 'transactions'
  | 'commitments'
  | 'commitmentsMonth'
  | 'filtered'
  | 'categories'
  | 'goals'
  | 'budget'
  | 'onboardingAccounts';

export interface EmptyStateProps {
  variant: EmptyStateVariant;
  onAction?: () => void;
}

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const VARIANT_CONFIG: Record<
  EmptyStateVariant,
  {
    icon: MCIName;
    headline: string;
    description: string;
    ctaLabel: string | null;
    clearLabel: string | null;
  }
> = {
  accounts: {
    icon: 'bank',
    headline: Strings.emptyAccountsHeadline,
    description: Strings.emptyAccountsDescription,
    ctaLabel: Strings.emptyAccountsCta,
    clearLabel: null,
  },
  transactions: {
    icon: 'swap-horizontal',
    headline: Strings.emptyTransactionsHeadline,
    description: Strings.emptyTransactionsDescription,
    ctaLabel: Strings.emptyTransactionsCta,
    clearLabel: null,
  },
  commitments: {
    icon: 'calendar-check',
    headline: Strings.emptyCommitmentsHeadline,
    description: Strings.emptyCommitmentsDescription,
    ctaLabel: Strings.emptyCommitmentsCta,
    clearLabel: null,
  },
  commitmentsMonth: {
    icon: 'calendar-blank-outline',
    headline: Strings.emptyCommitmentsMonthHeadline,
    description: Strings.emptyCommitmentsMonthDescription,
    ctaLabel: null,
    clearLabel: null,
  },
  filtered: {
    icon: 'filter-remove',
    headline: Strings.emptyFilteredHeadline,
    description: Strings.emptyFilteredDescription,
    ctaLabel: null,
    clearLabel: Strings.emptyFilteredClearCta,
  },
  categories: {
    icon: 'tag-outline',
    headline: Strings.emptyStateCategoriesHeadline,
    description: Strings.emptyStateCategoriesDescription,
    ctaLabel: null,
    clearLabel: null,
  },
  goals: {
    icon: 'target',
    headline: Strings.emptyGoalsTitle,
    description: Strings.emptyGoalsSub,
    ctaLabel: null,
    clearLabel: null,
  },
  budget: {
    icon: 'chart-pie',
    headline: Strings.emptyBudgetTitle,
    description: Strings.emptyBudgetSub,
    ctaLabel: Strings.emptyBudgetCta,
    clearLabel: null,
  },
  // `ctaLabel` stays null: N3's action is `Strings.n3EmptyCta` in the `OnboardingShell` footer.
  onboardingAccounts: {
    icon: 'database-alert-outline', // mockup.html:2095
    headline: Strings.n3EmptyTitle,
    description: Strings.n3EmptyBody,
    ctaLabel: null,
    clearLabel: null,
  },
};

export function EmptyState({ variant, onAction }: EmptyStateProps) {
  const config = VARIANT_CONFIG[variant];

  return (
    <View style={styles.root}>
      <View style={styles.iconCircle}>
        <MaterialCommunityIcons
          name={config.icon}
          size={LAYOUT.iconSize}
          color={Colors.dark.text2}
        />
      </View>

      <Text variant="h3" style={styles.headline}>
        {config.headline}
      </Text>

      <Text variant="hint" style={styles.description}>
        {config.description}
      </Text>

      {config.ctaLabel !== null && (
        <Pressable
          onPress={onAction}
          style={styles.ctaWrapper}
          accessibilityRole="button"
          accessibilityLabel={config.ctaLabel}
        >
          <LinearGradient
            testID="empty-state-cta-gradient"
            colors={[GoldTokens[500], GoldTokens[600]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          />
          <Text style={styles.ctaLabel}>{config.ctaLabel}</Text>
        </Pressable>
      )}

      {config.clearLabel !== null && (
        <Pressable
          onPress={onAction}
          style={styles.clearWrapper}
          accessibilityRole="button"
          accessibilityLabel={config.clearLabel}
        >
          <Text style={styles.clearLabel}>{config.clearLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: LAYOUT.root,
  iconCircle: {
    ...LAYOUT.iconCircle,
    backgroundColor: Colors.dark.surface,
  },
  headline: {
    ...LAYOUT.headline,
    color: Colors.dark.text1,
  },
  description: {
    ...LAYOUT.body,
    color: Colors.dark.text2,
  },
  ctaWrapper: {
    ...LAYOUT.action,
    width: '100%',
    height: ms(52),
    borderRadius: Radius.cta,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    borderRadius: Radius.cta,
  },
  ctaLabel: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.bodyStrong,
    color: Colors.shared.midnightBlue,
  },
  clearWrapper: {
    ...LAYOUT.action,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  clearLabel: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.body,
    color: Colors.dark.gold,
  },
});
