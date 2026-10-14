import {
  TextField as HTextField,
  Input as HInput,
  Label,
  Description,
  FieldError,
  InputGroup,
  Typography,
  cn,
  type InputProps as HInputProps,
} from 'heroui-native';
import React from 'react';
import type { ReactNode } from 'react';
import { View, useWindowDimensions } from 'react-native';

import {
  INPUT_REST_SELECTION,
  type InputRestTextInsets,
  type InputValueAtRest,
  resolveInputRestTextProps,
} from '@/components/ui/input.geometry';
import { useInputValueAtRest } from '@/components/ui/input.hook';
import { Colors } from '@/constants/theme';

/** `borderColor` for an `Input` with `border-0`, whose focus mark is the caret or its own box: HeroUI's Android focus border outranks the class and would draw as well. */
export const INPUT_NO_FOCUS_BORDER_COLOR = Colors.shared.transparent;

const INPUT_TEXT_STYLE = { includeFontPadding: false, textAlignVertical: 'center' } as const;
const INPUT_HIDDEN_TEXT_STYLE = { color: Colors.shared.transparent } as const;

export interface InputProps extends HInputProps {
  className?: string;
  label?: string;
  helperText?: string;
  errorMessage?: string;
  isRequired?: boolean;
  suffix?: ReactNode;
  suffixClassName?: string;
  /** Caps `errorMessage` at N lines; uncapped it wraps and widens a fixed-height slot. */
  errorNumberOfLines?: number;
  /** Above font scale 1, how the value shows while the field has no focus; unset, the input shows it as it scrolled. */
  valueAtRest?: InputValueAtRest;
}

interface RestValueProps {
  display: 'fit' | 'ellipsis';
  insets: InputRestTextInsets;
  value: string | undefined;
  isDisabled: boolean | undefined;
  fontScale: number;
}

/** The value at rest drawn over the input box; the input under it keeps the tap and the screen reader. */
function RestValue({ display, insets, value, isDisabled, fontScale }: RestValueProps) {
  return (
    <View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        start: insets.start,
        end: insets.end,
        justifyContent: 'center',
      }}
    >
      <Typography
        {...resolveInputRestTextProps(display, fontScale)}
        className={isDisabled ? 'font-inter text-foreground/70' : 'font-inter text-foreground'}
      >
        {value}
      </Typography>
    </View>
  );
}

export function Input({
  className,
  label,
  helperText,
  errorMessage,
  errorNumberOfLines,
  isInvalid,
  isDisabled,
  isRequired,
  suffix,
  suffixClassName,
  style,
  valueAtRest,
  value,
  selection,
  onFocus,
  onBlur,
  ...inputProps
}: InputProps) {
  const invalid = isInvalid ?? false;
  const { fontScale } = useWindowDimensions();
  const binding = useInputValueAtRest({ valueAtRest, value, fontScale, onFocus, onBlur });
  const restDisplay =
    binding.shown === 'fit' || binding.shown === 'ellipsis' ? binding.shown : undefined;
  const fieldProps = {
    style:
      restDisplay === undefined
        ? [INPUT_TEXT_STYLE, style]
        : [INPUT_TEXT_STYLE, style, INPUT_HIDDEN_TEXT_STYLE],
    ...inputProps,
    value,
    selection: binding.shown === 'start' ? INPUT_REST_SELECTION : selection,
    onFocus: binding.onFocus,
    onBlur: binding.onBlur,
  };
  const restValue =
    restDisplay === undefined ? null : (
      <RestValue
        display={restDisplay}
        insets={binding.insets}
        value={value}
        isDisabled={isDisabled}
        fontScale={fontScale}
      />
    );
  return (
    <HTextField isInvalid={invalid} isDisabled={isDisabled} isRequired={isRequired}>
      {label ? <Label>{label}</Label> : null}
      {suffix ? (
        <InputGroup isDisabled={isDisabled}>
          <InputGroup.Input
            className={cn('font-inter py-2 text-[16px]', className)}
            {...fieldProps}
          />
          {restValue}
          <InputGroup.Suffix
            isDecorative
            className={suffixClassName}
            onLayout={binding.onSuffixLayout}
          >
            {suffix}
          </InputGroup.Suffix>
        </InputGroup>
      ) : valueAtRest === 'fit' || valueAtRest === 'ellipsis' ? (
        <View>
          <HInput className={cn('font-inter py-2 text-[16px]', className)} {...fieldProps} />
          {restValue}
        </View>
      ) : (
        <HInput className={cn('font-inter py-2 text-[16px]', className)} {...fieldProps} />
      )}
      {helperText ? <Description>{helperText}</Description> : null}
      {errorMessage ? (
        <FieldError textProps={{ numberOfLines: errorNumberOfLines }}>{errorMessage}</FieldError>
      ) : null}
    </HTextField>
  );
}
