import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import { parseAmountInput } from '../filter.helpers';
import { useFilterAmountSectionState } from './filter_amount_section.state';

interface Props {
  currency: Currency;
  min: number | undefined;
  max: number | undefined;
  onChangeCurrency: (c: Currency) => void;
  onChangeMin: (v: number | undefined) => void;
  onChangeMax: (v: number | undefined) => void;
}

function formatAmount(n: number | undefined): string {
  if (n === undefined) return '';
  return new Intl.NumberFormat('en-US', { style: 'decimal' }).format(n);
}

export function FilterAmountSection({
  currency,
  min,
  max,
  onChangeCurrency,
  onChangeMin,
  onChangeMax,
}: Props) {
  // Local string state lets the user type freely (commas, decimals) before committing.
  const minStr = useFilterAmountSectionState((s) => s.state.minStr);
  const maxStr = useFilterAmountSectionState((s) => s.state.maxStr);
  const setMinStr = useFilterAmountSectionState((s) => s.setMinStr);
  const setMaxStr = useFilterAmountSectionState((s) => s.setMaxStr);

  // Sync display when the parent resets (e.g. drawer Reset button clears the draft).
  useEffect(() => {
    setMinStr(formatAmount(min));
  }, [min, setMinStr]);
  useEffect(() => {
    setMaxStr(formatAmount(max));
  }, [max, setMaxStr]);

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>{Strings.filterSectionAmount}</Text>

      <View style={styles.toggleRow}>
        <CurrencyPill
          label={Currency.EGP}
          isActive={currency === Currency.EGP}
          onPress={() => onChangeCurrency(Currency.EGP)}
        />
        <CurrencyPill
          label={Currency.USD}
          isActive={currency === Currency.USD}
          onPress={() => onChangeCurrency(Currency.USD)}
        />
      </View>

      <View style={styles.inputsRow}>
        <View style={styles.inputWrap}>
          <Text style={styles.inputLabel}>{Strings.filterCustomFromLabel}</Text>
          <TextInput
            value={minStr}
            onChangeText={setMinStr}
            onBlur={() => {
              const parsed = parseAmountInput(minStr);
              setMinStr(formatAmount(parsed));
              onChangeMin(parsed);
            }}
            placeholder={Strings.filterAmountFromPlaceholder}
            placeholderTextColor={Colors.dark.text2}
            keyboardType="decimal-pad"
            style={styles.input}
          />
        </View>
        <View style={styles.inputWrap}>
          <Text style={styles.inputLabel}>{Strings.filterCustomToLabel}</Text>
          <TextInput
            value={maxStr}
            onChangeText={setMaxStr}
            onBlur={() => {
              const parsed = parseAmountInput(maxStr);
              setMaxStr(formatAmount(parsed));
              onChangeMax(parsed);
            }}
            placeholder={Strings.filterAmountToPlaceholder}
            placeholderTextColor={Colors.dark.text2}
            keyboardType="decimal-pad"
            style={styles.input}
          />
        </View>
      </View>
    </View>
  );
}

function CurrencyPill({
  label,
  isActive,
  onPress,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        isActive && styles.pillActive,
        pressed && styles.pillPressed,
      ]}
    >
      <Text style={[styles.pillLabel, isActive && styles.pillLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },
  sectionLabel: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
    paddingHorizontal: Spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  pill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: ms(6),
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.surface,
  },
  pillActive: {
    backgroundColor: Colors.shared.cairoGold,
    borderColor: Colors.shared.cairoGold,
  },
  pillPressed: { opacity: 0.7 },
  pillLabel: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.caption,
    color: Colors.dark.text2,
  },
  pillLabelActive: {
    color: Colors.shared.midnightBlue,
  },
  inputsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  inputWrap: {
    flex: 1,
    backgroundColor: Colors.dark.surfaceEl,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  inputLabel: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.micro,
    color: Colors.dark.text2,
  },
  input: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
    paddingVertical: 0,
  },
});
