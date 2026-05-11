import React from 'react';
import { Text as RNText, type TextProps } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

const textVariants = cva('font-inter text-text1', {
  variants: {
    variant: {
      body: 'text-[14px]',
      caption: 'text-[12px] text-text2',
      hint: 'text-[12px] text-hint',
      title: 'font-soraSemi text-[18px]',
      hero: 'font-soraSemi text-[28px]',
    },
  },
  defaultVariants: { variant: 'body' },
});

interface TextComponentProps extends TextProps, VariantProps<typeof textVariants> {
  className?: string;
}

export const Text = React.forwardRef<RNText, TextComponentProps>(
  ({ className, variant, ...props }, ref) => (
    <RNText ref={ref} className={cn(textVariants({ variant }), className)} {...props} />
  ),
);
Text.displayName = 'Text';
