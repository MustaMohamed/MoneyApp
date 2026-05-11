import React from 'react';
import { Pressable as RNPressable, type PressableProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { tv, type VariantProps } from 'tailwind-variants';
import { cn } from 'heroui-native';
import { Text } from './text';
import { GoldTokens } from '@/constants/theme_tokens';

const buttonVariants = tv({
  base: 'h-[52px] rounded-[13px] items-center justify-center flex-row gap-2',
  variants: {
    variant: {
      primary: 'overflow-hidden',
      secondary: 'bg-default border border-border',
      outline: 'border border-accent',
      ghost: '',
      danger: 'bg-danger',
    },
    fullWidth: {
      true: 'w-full',
    },
    disabled: {
      true: 'opacity-40',
    },
  },
  defaultVariants: {
    variant: 'primary',
  },
});

const labelVariants = tv({
  base: 'font-sora text-[16px] font-semibold',
  variants: {
    variant: {
      primary: 'text-accent-foreground',
      secondary: 'text-foreground',
      outline: 'text-accent',
      ghost: 'text-foreground',
      danger: 'text-danger-foreground',
    },
  },
  defaultVariants: { variant: 'primary' },
});

type ButtonVariantProps = Omit<VariantProps<typeof buttonVariants>, 'disabled'>;

export interface ButtonProps extends PressableProps, ButtonVariantProps {
  className?: string;
  label: string;
  isLoading?: boolean;
}

export function Button({
  variant = 'primary',
  fullWidth,
  disabled,
  isLoading,
  label,
  className,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || isLoading;

  const inner = (
    <Text className={cn(labelVariants({ variant }))}>{isLoading ? 'Loading...' : label}</Text>
  );

  if (variant === 'primary') {
    return (
      <RNPressable
        disabled={isDisabled}
        className={cn(buttonVariants({ variant, fullWidth, disabled: isDisabled }), className)}
        {...props}
      >
        <LinearGradient
          colors={[GoldTokens[400], GoldTokens[600]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }}
        >
          {inner}
        </LinearGradient>
      </RNPressable>
    );
  }

  return (
    <RNPressable
      disabled={isDisabled}
      className={cn(buttonVariants({ variant, fullWidth, disabled: isDisabled }), className)}
      {...props}
    >
      {inner}
    </RNPressable>
  );
}
