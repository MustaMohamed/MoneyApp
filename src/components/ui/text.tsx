import { cn } from 'heroui-native';
import React from 'react';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';

const textVariants = tv({
  base: 'text-foreground',
  variants: {
    variant: {
      hero: 'font-sora text-[32px] font-bold leading-tight',
      h1: 'font-sora text-[28px] font-bold leading-tight',
      h2: 'font-sora text-[22px] font-semibold leading-snug',
      h3: 'font-sora text-[18px] font-semibold',
      title: 'font-sora text-[20px] font-semibold',
      body: 'font-inter text-[15px] font-normal',
      label: 'font-inter text-[13px] font-medium',
      hint: 'font-inter text-[12px] font-normal text-muted',
      caption: 'font-inter text-[11px] font-normal text-muted',
      numLg: 'font-sora text-[32px] font-bold tabular-nums',
      numMd: 'font-sora text-[20px] font-semibold tabular-nums',
    },
    muted: {
      true: 'text-muted',
    },
    accent: {
      true: 'text-accent',
    },
  },
  defaultVariants: {
    variant: 'body',
  },
});

export interface TextProps extends RNTextProps, VariantProps<typeof textVariants> {
  className?: string;
}

export function Text({ variant, muted, accent, className, ...props }: TextProps) {
  return <RNText className={cn(textVariants({ variant, muted, accent }), className)} {...props} />;
}
