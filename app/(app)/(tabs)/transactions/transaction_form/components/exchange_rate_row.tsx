import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';

interface Props {
  value: string;
  onChange: (v: string) => void;
  error?: string;
}

export function ExchangeRateRow({ value, onChange, error }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.labels}>
          <Text style={styles.label}>{Strings.addTxRateLabel}</Text>
          <Text style={styles.sub}>{Strings.addTxRateSub}</Text>
        </View>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          placeholderTextColor={Colors.dark.text2}
          placeholder="0.00"
        />
      </View>
      {error ? <Text style={styles.err}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.xxs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D4830A1A',
    borderWidth: 1,
    borderColor: '#D4830A55',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  labels: { flex: 1 },
  label: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.body,
    color: '#D4830A',
  },
  sub: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.text2,
  },
  input: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.body,
    color: '#D4830A',
    textAlign: 'right',
    minWidth: 80,
  },
  err: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.negative,
  },
});
