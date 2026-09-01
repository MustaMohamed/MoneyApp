import { LinearGradient } from 'expo-linear-gradient';
import { Button as HButton, Spinner, cn, type ButtonSize, type ButtonVariant } from 'heroui-native';
import React from 'react';
import { StyleSheet, type PressableProps } from 'react-native';

import { Radius } from '@/constants/theme';
import { GoldTokens } from '@/constants/theme_tokens';

import { resolveButtonContent } from './button.content';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'disabled'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  label: string;
  isLoading?: boolean;
  isDisabled?: boolean;
  /** RN convention. When set and `isDisabled` is not, maps to HeroUI Native's `isDisabled`. */
  disabled?: boolean;
  /** When `isLoading`, replaces `Strings.loading` as the button text. */
  loadingLabel?: string;
  /** Flat accent fill at Radius.cta, no gradient — opt-in per redesigned screen (spec.md § Known disagreements 1). */
  flat?: boolean;
  className?: string;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading,
  isDisabled,
  disabled,
  label,
  loadingLabel,
  flat,
  className,
  ...props
}: ButtonProps) {
  const disabledState = isDisabled ?? disabled;
  const { text, showSpinner, spinnerColor } = resolveButtonContent({
    variant,
    label,
    isLoading,
    loadingLabel,
  });

  if (variant === 'primary' && flat) {
    return (
      <HButton
        variant="primary"
        size={size}
        isDisabled={disabledState}
        className={className}
        {...props}
        style={{ borderRadius: Radius.cta }}
      >
        {showSpinner ? <Spinner size="sm" color={spinnerColor} /> : null}
        <HButton.Label>{text}</HButton.Label>
      </HButton>
    );
  }

  if (variant === 'primary') {
    return (
      <HButton
        variant="primary"
        size={size}
        isDisabled={disabledState}
        className={cn('overflow-hidden bg-transparent', className)}
        {...props}
      >
        <LinearGradient
          colors={[GoldTokens[400], GoldTokens[600]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[StyleSheet.absoluteFill, { borderRadius: 13 }]}
          pointerEvents="none"
        />
        {showSpinner ? <Spinner size="sm" color={spinnerColor} /> : null}
        <HButton.Label className="text-accent-foreground">{text}</HButton.Label>
      </HButton>
    );
  }

  return (
    <HButton
      variant={variant}
      size={size}
      isDisabled={disabledState}
      className={className}
      {...props}
    >
      {showSpinner ? <Spinner size="sm" color={spinnerColor} /> : null}
      <HButton.Label>{text}</HButton.Label>
    </HButton>
  );
}
