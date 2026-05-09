import { useEffect } from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { Colors, FontFamily, Type } from '@/constants/theme';
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
  const { state, setText, reset } = useDecimalInputState(value != null ? String(value) : '');

  useEffect(() => {
    if (value == null) {
      reset('');
      return;
    }
    if (parseFloat(state.text) !== value) reset(String(value));
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <TextInput
      {...rest}
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
          reset('');
          onChange(undefined);
        } else {
          reset(String(n));
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
