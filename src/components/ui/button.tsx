import { LinearGradient } from 'expo-linear-gradient';
import { Button as HButton, cn, type ButtonSize, type ButtonVariant } from 'heroui-native';
import React from 'react';
import { StyleSheet, type PressableProps } from 'react-native';

import { GoldTokens } from '@/constants/theme_tokens';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'disabled'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  label: string;
  isLoading?: boolean;
  isDisabled?: boolean;
  /** RN convention. When set and isDisabled is not, maps to HeroUI Native's `isDisabled`. */
  disabled?: boolean;
  className?: string;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading,
  isDisabled,
  disabled,
  label,
  className,
  ...props
}: ButtonProps) {
  const disabledState = isDisabled ?? disabled;
  const content = isLoading ? 'Loading...' : label;

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
        <HButton.Label className="text-accent-foreground">{content}</HButton.Label>
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
      <HButton.Label>{content}</HButton.Label>
    </HButton>
  );
}
