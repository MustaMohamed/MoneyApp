import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { GoldTokens } from '@/constants/theme_tokens';
import { ms } from '@/utils/responsive';

export type EmptyStateVariant =
  | 'accounts'
  | 'transactions'
  | 'commitments'
  | 'filtered'
  | 'categories';

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
};

export function EmptyState({ variant, onAction }: EmptyStateProps) {
  const config = VARIANT_CONFIG[variant];

  return (
    <View style={styles.root}>
      {/* Icon circle */}
      <View style={styles.iconCircle}>
        <MaterialCommunityIcons name={config.icon} size={ms(40)} color={Colors.dark.text2} />
      </View>

      {/* Headline */}
      <Text variant="h3" style={styles.headline}>
        {config.headline}
      </Text>

      {/* Description */}
      <Text variant="hint" style={styles.description}>
        {config.description}
      </Text>

      {/* CTA — gradient button for non-filtered variants */}
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

      {/* Clear Filters — text button for filtered variant */}
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
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  iconCircle: {
    width: ms(80),
    height: ms(80),
    borderRadius: ms(40),
    backgroundColor: Colors.dark.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headline: {
    marginTop: Spacing.md,
    textAlign: 'center',
    color: Colors.dark.text1,
  },
  description: {
    marginTop: Spacing.xs,
    textAlign: 'center',
    maxWidth: ms(260),
    color: Colors.dark.text2,
  },
  ctaWrapper: {
    marginTop: Spacing.md,
    width: '100%',
    height: ms(52),
    borderRadius: Radius.cta,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: Radius.cta,
  },
  ctaLabel: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.bodyStrong,
    color: Colors.shared.midnightBlue,
  },
  clearWrapper: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  clearLabel: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.body,
    color: Colors.dark.gold,
  },
});
