import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PressableFeedback, Typography } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { LogoMark } from '@/components/ui/logo_mark';
import { Strings } from '@/constants/strings';
import { Radius, Size, Spacing, Type } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';

import { ONBOARDING_SHELL_TRACKS } from './onboarding_shell.geometry';

export interface OnboardingHeaderProps {
  /** Omit for the N1 brand header. */
  title?: string;
  onBack?: () => void;
}

/**
 * Onboarding's own header, not a change to StackHeader. StackHeader renders
 * its back button unconditionally and has no brand variant; onboarding needs
 * both a brand variant (N1) and an absent back affordance (N3/N4 in this
 * task — their back semantics are MA-005's). Teaching the shared header two
 * onboarding-only shapes would push them onto every other screen that uses
 * it. Primitives reused verbatim from stack_header.tsx.
 */
export function OnboardingHeader({ title, onBack }: OnboardingHeaderProps) {
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', height: ONBOARDING_SHELL_TRACKS.header }}
      className="border-separator justify-between border-b px-2"
    >
      {title !== undefined ? (
        <>
          {onBack ? (
            <PressableFeedback
              onPress={onBack}
              hitSlop={8}
              className="bg-surface border-border h-9 w-9 items-center justify-center border"
              style={{ borderRadius: Radius.sm }}
              accessibilityRole="button"
              accessibilityLabel={Strings.goBackAccessibility}
            >
              <MaterialCommunityIcons
                name="chevron-left"
                size={Size.iconBack}
                color={CoreTokens.text2}
              />
            </PressableFeedback>
          ) : (
            <View className="w-9" />
          )}
          <Typography
            className="font-sora-semibold text-foreground flex-1 text-center"
            style={{ fontSize: Type.title }}
            numberOfLines={1}
          >
            {title}
          </Typography>
          <View className="w-9" />
        </>
      ) : (
        <>
          {/* .brand groups the mark + wordmark (mockup.html:292-294,1027-1028); a
              third flat sibling here would let the root's justify-between spread
              Setup and the wordmark evenly, floating MoneyApp into the header's
              centre instead of leaving it beside the mark. */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
            <LogoMark />
            <Typography className="font-sora-bold" style={{ fontSize: Type.subhead }}>
              {Strings.n1HeaderWordmark}
            </Typography>
          </View>
          <Typography className="text-content-secondary" style={{ fontSize: Type.micro }}>
            {Strings.n1HeaderSetup}
          </Typography>
        </>
      )}
    </View>
  );
}
