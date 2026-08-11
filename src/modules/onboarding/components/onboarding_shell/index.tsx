import React, { type ReactNode } from 'react';
import { View } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { Colors } from '@/constants/theme';

import { OnboardingFooter } from './onboarding_footer';
import { OnboardingHeader } from './onboarding_header';
import { OnboardingProgressRail } from './onboarding_progress_rail';
import type { OnboardingStepIndex } from './onboarding_shell.geometry';

export interface OnboardingShellProps {
  step: OnboardingStepIndex;
  /** Omit for the N1 brand header. */
  title?: string;
  onBack?: () => void;
  /** Idle copy. Required — the track is never empty. */
  footnote: string;
  /** When set, replaces the footnote in the identical box. */
  statusMessage?: string;
  cta: ReactNode;
  children: ReactNode;
  /** N1's ambient wash. Rendered as a sibling behind Screen, not inside it —
   * see MA-010 decision D4. Omitted on every other route. */
  background?: ReactNode;
}

/**
 * The shared chrome for all four onboarding routes: a fixed-height header, a
 * fixed-height progress rail, a flexible content viewport, and a footer built
 * from a permanently mounted status track above the primary action.
 *
 * `cta` is a node rather than a prop bundle so each route keeps the
 * Animated.View it wraps its button in today, and later motion work can
 * change that wrapper without touching the shell.
 *
 * `background` is hoisted one level above `Screen` rather than rendered
 * inside it (MA-010 decision D4): RN positions an absolutely-positioned
 * child against its parent's *padding box*, and `Screen` applies the
 * safe-area insets as padding, so a wash mounted inside it would start below
 * the status-bar inset and leave a visible seam under Android's edge-to-edge.
 * The host View here carries `bg-background` instead (`Screen` bakes that
 * class into its own `className` — screen.tsx:48 — so it is not passed down),
 * and `Screen` itself goes transparent via `style`, which wins over
 * `className` in RN (the mechanism account_type_tile.tsx:29-33 documents).
 */
export function OnboardingShell({
  step,
  title,
  onBack,
  footnote,
  statusMessage,
  cta,
  children,
  background,
}: OnboardingShellProps) {
  return (
    <View style={{ flex: 1 }} className="bg-background">
      {background}
      <Screen style={{ backgroundColor: Colors.shared.transparent }}>
        <OnboardingHeader title={title} onBack={onBack} />
        <OnboardingProgressRail step={step} />
        <View style={{ flex: 1 }}>{children}</View>
        <OnboardingFooter footnote={footnote} message={statusMessage} cta={cta} />
      </Screen>
    </View>
  );
}
