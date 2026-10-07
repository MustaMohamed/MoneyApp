import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { Button } from '@/components/ui/button';
import {
  resolveStateScreenBottomReserve,
  resolveStateScreenLayout,
} from '@/components/ui/state_screen.geometry';
import { Text } from '@/components/ui/text';
import { resolveOneLineTextProps, scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Spacing, Type, touchFloorSlop } from '@/constants/theme';

// Ruled genuinely different from ErrorState, not merged (#290). Evidence and the
// rejected merge shape: docs/adr/2026-09-01-empty-error-state-stay-separate.md
const LAYOUT = resolveStateScreenLayout('empty');

export type EmptyStateVariant =
  | 'accounts'
  | 'accountsArchivedOnly'
  | 'transactions'
  | 'transactionsMonth'
  | 'commitments'
  | 'commitmentsMonth'
  | 'filtered'
  | 'categories'
  | 'goals'
  | 'budget'
  | 'onboardingAccounts';

interface EmptyStateCommonProps {
  onAction?: () => void;
  placement?: 'inline';
  /** A tab screen's state that does not scroll: centres above the + button. */
  clearsFab?: boolean;
}

export type EmptyStateProps =
  | (EmptyStateCommonProps & { variant: 'accountsArchivedOnly'; archivedCount: number })
  | (EmptyStateCommonProps & {
      variant: 'transactionsMonth';
      monthName: string;
      showsBackLink: boolean;
    })
  | (EmptyStateCommonProps & {
      variant: Exclude<EmptyStateVariant, 'accountsArchivedOnly' | 'transactionsMonth'>;
    });

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface VariantFrame {
  icon: MCIName;
  /** `inline` sits at the top of a scroll; `centered` fills the screen. */
  placement: 'centered' | 'inline';
}

interface VariantConfig extends VariantFrame {
  headline: string;
  description: string | ((n: number) => string);
  ctaLabel?: string;
  clearLabel?: string;
}

type FixedCopyVariant = Exclude<EmptyStateVariant, 'transactionsMonth'>;

const VARIANT_CONFIG: Record<FixedCopyVariant, VariantConfig> & {
  accountsArchivedOnly: { description: (n: number) => string };
} = {
  accounts: {
    icon: 'bank',
    headline: Strings.emptyAccountsHeadline,
    description: Strings.emptyAccountsDescription,
    ctaLabel: Strings.emptyAccountsCta,
    placement: 'centered',
  },
  accountsArchivedOnly: {
    icon: 'bank',
    headline: Strings.emptyAccountsArchivedOnlyHeadline,
    description: Strings.emptyAccountsArchivedOnlyDescription,
    ctaLabel: Strings.emptyAccountsCta,
    placement: 'inline',
  },
  transactions: {
    icon: 'swap-horizontal',
    headline: Strings.emptyTransactionsHeadline,
    description: Strings.emptyTransactionsDescription,
    ctaLabel: Strings.emptyTransactionsCta,
    placement: 'centered',
  },
  commitments: {
    icon: 'calendar-check',
    headline: Strings.emptyCommitmentsHeadline,
    description: Strings.emptyCommitmentsDescription,
    ctaLabel: Strings.emptyCommitmentsCta,
    placement: 'centered',
  },
  commitmentsMonth: {
    icon: 'calendar-blank-outline',
    headline: Strings.emptyCommitmentsMonthHeadline,
    description: Strings.emptyCommitmentsMonthDescription,
    placement: 'centered',
  },
  filtered: {
    icon: 'filter-remove',
    headline: Strings.emptyFilteredHeadline,
    description: Strings.emptyFilteredDescription,
    clearLabel: Strings.emptyFilteredClearCta,
    placement: 'centered',
  },
  categories: {
    icon: 'tag-outline',
    headline: Strings.emptyStateCategoriesHeadline,
    description: Strings.emptyStateCategoriesDescription,
    placement: 'centered',
  },
  goals: {
    icon: 'target',
    headline: Strings.emptyGoalsTitle,
    description: Strings.emptyGoalsSub,
    placement: 'centered',
  },
  budget: {
    icon: 'chart-pie',
    headline: Strings.emptyBudgetTitle,
    description: Strings.emptyBudgetSub,
    ctaLabel: Strings.emptyBudgetCta,
    placement: 'centered',
  },
  // No `ctaLabel`: N3's action is `Strings.n3EmptyCta` in the `OnboardingShell` footer.
  onboardingAccounts: {
    icon: 'database-alert-outline', // mockup.html:2095
    headline: Strings.n3EmptyTitle,
    description: Strings.n3EmptyBody,
    placement: 'centered',
  },
};

// Frame A16's copy takes the month's name, so only its icon and placement are fixed.
const TRANSACTIONS_MONTH_FRAME: VariantFrame = {
  icon: 'calendar-blank-outline',
  placement: 'centered',
};

export interface EmptyStateCopy {
  headline: string;
  description: string;
  ctaLabel: string | undefined;
  clearLabel: string | undefined;
}

export function resolveEmptyStateCopy(props: EmptyStateProps): EmptyStateCopy {
  if (props.variant === 'transactionsMonth') {
    return {
      headline: Strings.emptyTransactionsMonthHeadline(props.monthName),
      description: Strings.emptyTransactionsMonthDescription(props.monthName),
      ctaLabel: undefined,
      clearLabel: props.showsBackLink ? Strings.emptyTransactionsMonthBackCta : undefined,
    };
  }
  const config = VARIANT_CONFIG[props.variant];
  // Only `accountsArchivedOnly` carries a count, and only its description reads one.
  const archivedCount = props.variant === 'accountsArchivedOnly' ? props.archivedCount : 0;
  return {
    headline: config.headline,
    description:
      typeof config.description === 'function'
        ? config.description(archivedCount)
        : config.description,
    ctaLabel: config.ctaLabel,
    clearLabel: config.clearLabel,
  };
}

/** The slop on each side that lifts the link's padded line box to the touch floor. */
export function resolveEmptyStateLinkHitSlop(lineHeight: number): { top: number; bottom: number } {
  const slop = touchFloorSlop(lineHeight + 2 * Spacing.xs);
  return { top: slop, bottom: slop };
}

/** An opt-in, never an override: the `'inline'`-only parameter cannot force a variant out of it. */
export function resolveEmptyStatePlacement(
  override: 'inline' | undefined,
  variantPlacement: 'centered' | 'inline',
): 'centered' | 'inline' {
  return override ?? variantPlacement;
}

export function EmptyState(props: EmptyStateProps) {
  const { fontScale } = useWindowDimensions();
  const bottomReserve = resolveStateScreenBottomReserve(fontScale);
  const clearText = scaledTextStyle(Type.body, fontScale);
  const clearLine = resolveOneLineTextProps(clearText);
  const { onAction, clearsFab } = props;
  const frame =
    props.variant === 'transactionsMonth'
      ? TRANSACTIONS_MONTH_FRAME
      : VARIANT_CONFIG[props.variant];
  const copy = resolveEmptyStateCopy(props);
  const placement = resolveEmptyStatePlacement(props.placement, frame.placement);

  const rootStyle =
    placement === 'inline'
      ? styles.rootInline
      : [styles.root, clearsFab === true ? { paddingBottom: bottomReserve } : undefined];

  return (
    <View style={rootStyle}>
      <View style={styles.iconCircle}>
        <MaterialCommunityIcons
          name={frame.icon}
          size={LAYOUT.iconSize}
          color={Colors.dark.text2}
        />
      </View>

      <Text variant="h3" style={styles.headline}>
        {copy.headline}
      </Text>

      <Text variant="hint" style={styles.description}>
        {copy.description}
      </Text>

      {copy.ctaLabel !== undefined && (
        <View style={styles.ctaWrapper}>
          <Button
            variant="primary"
            flat
            label={copy.ctaLabel}
            accessibilityLabel={copy.ctaLabel}
            onPress={onAction}
          />
        </View>
      )}

      {copy.clearLabel !== undefined && (
        <Pressable
          onPress={onAction}
          hitSlop={resolveEmptyStateLinkHitSlop(clearText.lineHeight)}
          style={styles.clearWrapper}
          accessibilityRole="button"
          accessibilityLabel={copy.clearLabel}
        >
          <Text {...clearLine} style={[styles.clearLabel, clearLine.style]}>
            {copy.clearLabel}
          </Text>
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
    color: Colors.dark.gold,
  },
});
