import { useEffect } from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { Colors, FontFamily, Type, lineHeightFor } from '@/constants/theme';

import { useDecimalInputState } from './decimal_amount_input.state';

interface Props extends Omit<
  TextInputProps,
  'value' | 'onChange' | 'onChangeText' | 'keyboardType'
> {
  value: number | undefined;
  onChange: (n: number | undefined) => void;
  hasError?: boolean;
}

export function DecimalAmountInput({ value, onChange, onBlur, hasError, style, ...rest }: Props) {
  const { state, setText, syncToValue } = useDecimalInputState(value != null ? String(value) : '');

  useEffect(() => {
    if (value == null) {
      syncToValue('');
      return;
    }
    if (parseFloat(state.text) !== value) syncToValue(String(value));
  }, [value]); // oxlint-disable-line react-hooks/exhaustive-deps -- omit syncToValue/state.text to prevent sync loop

  return (
    <TextInput
      {...rest}
      placeholderTextColor={Colors.dark.text2}
      style={[styles.input, hasError ? styles.inputError : null, style]}
      value={state.text}
      keyboardType="decimal-pad"
      onChangeText={(v) => {
        if (v !== '' && !/^\d*\.?\d*$/.test(v)) return;
        setText(v);
        if (v === '' || v === '.') {
          onChange(undefined);
          return;
        }
        const n = parseFloat(v);
        onChange(isNaN(n) ? undefined : n);
      }}
      onBlur={(e) => {
        const n = parseFloat(state.text);
        if (isNaN(n)) {
          syncToValue('');
          onChange(undefined);
        } else {
          syncToValue(String(n));
          onChange(n);
        }
        onBlur?.(e);
      }}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.body,
    lineHeight: lineHeightFor(Type.body),
    color: Colors.dark.text1,
    paddingVertical: 0,
  },
  inputError: {
    borderWidth: 1,
    borderColor: Colors.dark.negative,
  },
});
