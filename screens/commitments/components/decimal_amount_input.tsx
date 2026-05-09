import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { Colors, FontFamily, Type } from '@/constants/theme';

interface Props extends Omit<
  TextInputProps,
  'value' | 'onChange' | 'onChangeText' | 'keyboardType'
> {
  value: number | undefined;
  onChange: (n: number | undefined) => void;
  hasError?: boolean;
}

export function DecimalAmountInput({ value, onChange, onBlur, hasError, style, ...rest }: Props) {
  const [text, setText] = useState(value != null ? String(value) : '');

  useEffect(() => {
    if (value == null) {
      setText('');
      return;
    }
    if (parseFloat(text) !== value) setText(String(value));
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <TextInput
      {...rest}
      style={[styles.input, hasError ? styles.inputError : null, style]}
      value={text}
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
        const n = parseFloat(text);
        if (isNaN(n)) {
          setText('');
          onChange(undefined);
        } else {
          setText(String(n));
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
    color: Colors.dark.text1,
    paddingVertical: 0,
  },
  inputError: {
    borderWidth: 1,
    borderColor: Colors.dark.negative,
  },
});
