import { cn, Typography } from 'heroui-native';
import React from 'react';
import { View, useWindowDimensions } from 'react-native';

import { Radius, Size, Spacing, Type } from '@/constants/theme';

import {
  resolveProgressRail,
  resolveProgressRailGeometry,
  type OnboardingStepIndex,
} from './onboarding_shell.geometry';

export interface OnboardingProgressRailProps {
  step: OnboardingStepIndex;
}

/** Segments are hidden from assistive tech; the label row below carries the meaning. */
export function OnboardingProgressRail({ step }: OnboardingProgressRailProps) {
  const model = resolveProgressRail(step);
  const { height, label } = resolveProgressRailGeometry(useWindowDimensions().fontScale);

  return (
    <View
      style={{
        height,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
      }}
    >
      <View
        style={{ flexDirection: 'row', gap: Spacing.xxs }}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        {model.filled.map((isFilled, i) => (
          <View
            key={`segment-${i}`}
            style={{ flex: 1, height: Size.progressThin, borderRadius: Radius.xs }}
            className={cn(isFilled ? 'bg-accent' : 'bg-muted')}
          />
        ))}
      </View>
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: label === undefined ? 0 : Spacing.xs,
        }}
        accessible
        accessibilityLabel={model.accessibilityLabel}
      >
        <Typography
          className="text-foreground font-inter-semibold"
          allowFontScaling={label === undefined}
          style={[
            // oxlint-disable-next-line moneyapp/font-size-pairs-line-height -- at or below font scale 1 both rail labels take Size.compactBodyLineHeight (theme.ts:176), a fixed 20px token, not lineHeightFor(Type.caption)'s 16px; above it the scaled pair in the next entry replaces this one.
            { fontSize: Type.caption, lineHeight: Size.compactBodyLineHeight },
            label ? { ...label, flexShrink: 0 } : undefined,
          ]}
          numberOfLines={1}
        >
          {model.stepLabel}
        </Typography>
        <Typography
          className="text-content-secondary"
          allowFontScaling={label === undefined}
          style={[
            // oxlint-disable-next-line moneyapp/font-size-pairs-line-height -- the step label's Size.compactBodyLineHeight pair, at or below font scale 1; above it the scaled pair in the next entry replaces it.
            { fontSize: Type.caption, lineHeight: Size.compactBodyLineHeight },
            label ? { ...label, flexShrink: 1 } : undefined,
          ]}
          numberOfLines={1}
        >
          {model.stepName}
        </Typography>
      </View>
    </View>
  );
}
