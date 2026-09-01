import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PressableFeedback, Typography } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { LogoMark } from '@/components/ui/logo_mark';
import { Strings } from '@/constants/strings';
import { Radius, Size, Spacing, Type, lineHeightFor } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';

import { ONBOARDING_SHELL_TRACKS } from './onboarding_shell.geometry';

export interface OnboardingHeaderProps {
  /** Omit for the N1 brand header. */
  title?: string;
  onBack?: () => void;
}

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
            style={{ fontSize: Type.title, lineHeight: lineHeightFor(Type.title) }}
            numberOfLines={1}
          >
            {title}
          </Typography>
          <View className="w-9" />
        </>
      ) : (
        <>
          {/* Grouping the mark and wordmark stops `justify-between` centring the wordmark. */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
            <LogoMark />
            <Typography
              className="font-sora-bold"
              style={{ fontSize: Type.subhead, lineHeight: lineHeightFor(Type.subhead) }}
            >
              {Strings.n1HeaderWordmark}
            </Typography>
          </View>
          <Typography
            className="text-content-secondary"
            style={{ fontSize: Type.micro, lineHeight: lineHeightFor(Type.micro) }}
          >
            {Strings.n1HeaderSetup}
          </Typography>
        </>
      )}
    </View>
  );
}
