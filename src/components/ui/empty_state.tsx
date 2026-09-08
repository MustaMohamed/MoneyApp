import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { resolveStateScreenLayout } from '@/components/ui/state_screen.geometry';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Spacing, Type, lineHeightFor } from '@/constants/theme';

// Ruled genuinely different from ErrorState, not merged (#290). Evidence and the
// rejected merge shape: docs/adr/2026-09-01-empty-error-state-stay-separate.md
const LAYOUT = resolveStateScreenLayout('empty');

export type EmptyStateVariant =
  | 'accounts'
  | 'accountsArchivedOnly'
  | 'transactions'
  | 'commitments'
  | 'commitmentsMonth'
  | 'filtered'
  | 'categories'
  | 'goals'
  | 'budget'
  | 'onboardingAccounts';

export type EmptyStateProps =
  | {
      variant: 'accountsArchivedOnly';
      archivedCount: number;
      onAction?: () => void;
      placement?: 'inline';
    }
  | {
      variant: Exclude<EmptyStateVariant, 'accountsArchivedOnly'>;
      onAction?: () => void;
      placement?: 'inline';
    };

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface VariantConfig {
  icon: MCIName;
  headline: string;
  description: string | ((n: number) => string);
  ctaLabel: string | null;
  clearLabel: string | null;
  /** `inline` sits at the top of a scroll; `centered` fills the screen. */
  placement: 'centered' | 'inline';
}

const VARIANT_CONFIG: Record<EmptyStateVariant, VariantConfig> & {
  accountsArchivedOnly: { description: (n: number) => string };
} = {
  accounts: {
    icon: 'bank',
    headline: Strings.emptyAccountsHeadline,
    description: Strings.emptyAccountsDescription,
    ctaLabel: Strings.emptyAccountsCta,
    clearLabel: null,
    placement: 'centered',
  },
  accountsArchivedOnly: {
    icon: 'bank',
    headline: Strings.emptyAccountsArchivedOnlyHeadline,
    description: Strings.emptyAccountsArchivedOnlyDescription,
    ctaLabel: Strings.emptyAccountsCta,
    clearLabel: null,
    placement: 'inline',
  },
  transactions: {
    icon: 'swap-horizontal',
    headline: Strings.emptyTransactionsHeadline,
    description: Strings.emptyTransactionsDescription,
    ctaLabel: Strings.emptyTransactionsCta,
    clearLabel: null,
    placement: 'centered',
  },
  commitments: {
    icon: 'calendar-check',
    headline: Strings.emptyCommitmentsHeadline,
    description: Strings.emptyCommitmentsDescription,
    ctaLabel: Strings.emptyCommitmentsCta,
    clearLabel: null,
    placement: 'centered',
  },
  commitmentsMonth: {
    icon: 'calendar-blank-outline',
    headline: Strings.emptyCommitmentsMonthHeadline,
    description: Strings.emptyCommitmentsMonthDescription,
    ctaLabel: null,
    clearLabel: null,
    placement: 'centered',
  },
  filtered: {
    icon: 'filter-remove',
    headline: Strings.emptyFilteredHeadline,
    description: Strings.emptyFilteredDescription,
    ctaLabel: null,
    clearLabel: Strings.emptyFilteredClearCta,
    placement: 'centered',
  },
  categories: {
    icon: 'tag-outline',
    headline: Strings.emptyStateCategoriesHeadline,
    description: Strings.emptyStateCategoriesDescription,
    ctaLabel: null,
    clearLabel: null,
    placement: 'centered',
  },
  goals: {
    icon: 'target',
    headline: Strings.emptyGoalsTitle,
    description: Strings.emptyGoalsSub,
    ctaLabel: null,
    clearLabel: null,
    placement: 'centered',
  },
  budget: {
    icon: 'chart-pie',
    headline: Strings.emptyBudgetTitle,
    description: Strings.emptyBudgetSub,
    ctaLabel: Strings.emptyBudgetCta,
    clearLabel: null,
    placement: 'centered',
  },
  // `ctaLabel` stays null: N3's action is `Strings.n3EmptyCta` in the `OnboardingShell` footer.
  onboardingAccounts: {
    icon: 'database-alert-outline', // mockup.html:2095
    headline: Strings.n3EmptyTitle,
    description: Strings.n3EmptyBody,
    ctaLabel: null,
    clearLabel: null,
    placement: 'centered',
  },
};

/** An opt-in, never an override: the `'inline'`-only parameter cannot force a variant out of it. */
export function resolveEmptyStatePlacement(
  override: 'inline' | undefined,
  variantPlacement: 'centered' | 'inline',
): 'centered' | 'inline' {
  return override ?? variantPlacement;
}

export function EmptyState(props: EmptyStateProps) {
  const { onAction } = props;
  const config = VARIANT_CONFIG[props.variant];
  const placement = resolveEmptyStatePlacement(props.placement, config.placement);
  // Only `accountsArchivedOnly` carries a count, and only its description reads one.
  const archivedCount = props.variant === 'accountsArchivedOnly' ? props.archivedCount : 0;
  const description =
    typeof config.description === 'function'
      ? config.description(archivedCount)
      : config.description;

  return (
    <View style={placement === 'inline' ? styles.rootInline : styles.root}>
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
        {description}
      </Text>

      {config.ctaLabel !== null && (
        <View style={styles.ctaWrapper}>
          <Button
            variant="primary"
            flat
            label={config.ctaLabel}
            accessibilityLabel={config.ctaLabel}
            onPress={onAction}
          />
        </View>
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
  rootInline: LAYOUT.rootInline,
  iconCircle: {
    // Mockup `.ei` draws --surface-secondary (mockup.html:777); plain surface vanished against surface-hosted screens.
    ...LAYOUT.iconCircle,
    backgroundColor: Colors.dark.surfaceEl,
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
  },
  clearWrapper: {
    ...LAYOUT.action,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  clearLabel: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.body,
    lineHeight: lineHeightFor(Type.body),
    color: Colors.dark.gold,
  },
});
