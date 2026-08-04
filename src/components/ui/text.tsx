import { cn } from 'heroui-native';
import React from 'react';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';

const textVariants = tv({
  base: 'text-foreground',
  variants: {
    variant: {
      hero: 'font-sora-bold text-[32px] leading-tight',
      h1: 'font-sora-bold text-[28px] leading-tight',
      h2: 'font-sora-semibold text-[22px] leading-snug',
      h3: 'font-sora-semibold text-[18px]',
      title: 'font-sora-semibold text-[20px]',
      body: 'font-inter text-[15px]',
      label: 'font-inter-medium text-[13px]',
      hint: 'font-inter text-[12px] text-muted',
      caption: 'font-inter text-[11px] text-muted',
      numLg: 'font-sora-bold text-[32px] tabular-nums',
      numMd: 'font-sora-semibold text-[20px] tabular-nums',
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
