import React from 'react';
import { Pressable, type PressableProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';
import { GoldTokens } from '@/constants/theme_tokens';
import { Text } from './text';

const buttonVariants = cva(
  'min-h-[52px] min-w-[44px] rounded-[13px] items-center justify-center px-4',
  {
    variants: {
      variant: {
        primary: '',
        ghost: 'border border-border bg-transparent',
        destructive: 'bg-negative',
      },
    },
    defaultVariants: { variant: 'primary' },
  },
);

const labelVariants = cva('font-soraSemi text-[16px]', {
  variants: {
    variant: {
      primary: 'text-surfaceEl',
      ghost: 'text-text1',
      destructive: 'text-text1',
    },
  },
  defaultVariants: { variant: 'primary' },
});

interface ButtonProps extends PressableProps, VariantProps<typeof buttonVariants> {
  className?: string;
  label: string;
}

// NOTE: forwardRef targets the inner Pressable for all variants, including
// `primary` (where the Pressable sits inside a LinearGradient wrapper).
// Consumers that measure layout via ref (e.g. animated CTAs in §5 Dashboard)
// will receive Pressable's geometry, NOT the gradient's. The gradient is a
// 1px-wider visual frame around the Pressable — measure offsets will be off
// by the gradient's border-radius/padding if any is added later. Reach for
// the gradient ref via children-as-function or a separate API if/when needed.
export const Button = React.forwardRef<React.ElementRef<typeof Pressable>, ButtonProps>(
  ({ className, variant = 'primary', label, ...props }, ref) => {
    const pressable = (
      <Pressable
        ref={ref}
        className={cn(buttonVariants({ variant }), className)}
        accessibilityRole="button"
        {...props}
      >
        <Text className={labelVariants({ variant })}>{label}</Text>
      </Pressable>
    );

    if (variant === 'primary') {
      return (
        <LinearGradient
          // Token-sourced: GoldTokens[400] = #E0B968, GoldTokens[600] = #C9973A
          colors={[GoldTokens[400], GoldTokens[600]]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ borderRadius: 13 }}
        >
          {pressable}
        </LinearGradient>
      );
    }

    return pressable;
  },
);
Button.displayName = 'Button';
