import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { RecurrencePeriod } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import type { UseFormReturn } from 'react-hook-form';
import type { CommitmentFormValues } from '../add_commitment/add_commitment.hook';
import type { RecurrencePreset } from '../add_commitment/add_commitment.store';

interface Props {
  form: UseFormReturn<CommitmentFormValues>;
  recurrencePreset: RecurrencePreset;
  onPresetChange: (preset: RecurrencePreset) => void;
}

const PRESETS: { key: RecurrencePreset; label: string }[] = [
  { key: 'monthly', label: Strings.commitmentsRecurrenceMonthly },
  { key: 'weekly', label: Strings.commitmentsRecurrenceWeekly },
  { key: 'annually', label: Strings.commitmentsRecurrenceAnnually },
  { key: 'custom', label: Strings.commitmentsRecurrenceCustom },
];

const PERIODS: { key: RecurrencePeriod; label: string }[] = [
  { key: RecurrencePeriod.Days, label: 'Days' },
  { key: RecurrencePeriod.Weeks, label: 'Weeks' },
  { key: RecurrencePeriod.Months, label: 'Months' },
  { key: RecurrencePeriod.Years, label: 'Years' },
];

export function RecurrencePicker({ form, recurrencePreset, onPresetChange }: Props) {
  const recurrence_every = form.watch('recurrence_every');
  const recurrence_period = form.watch('recurrence_period');
  const everyError = form.formState.errors.recurrence_every?.message;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{Strings.commitmentsFieldRecurrence}</Text>

      {/* Preset chips */}
      <View style={styles.chipRow}>
        {PRESETS.map(({ key, label }) => {
          const active = recurrencePreset === key;
          return (
            <Pressable
              key={key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onPresetChange(key)}
            >
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Custom row */}
      {recurrencePreset === 'custom' && (
        <View style={styles.customRow}>
          <Text style={styles.everyLabel}>{Strings.commitmentsRecurrenceEvery}</Text>
          <TextInput
            style={[styles.everyInput, everyError ? styles.inputError : null]}
            value={recurrence_every != null ? String(recurrence_every) : ''}
            onChangeText={(v) => {
              const n = parseInt(v, 10);
              form.setValue('recurrence_every', isNaN(n) ? 1 : n);
            }}
            keyboardType="number-pad"
            maxLength={3}
            placeholderTextColor={Colors.dark.text2}
          />
          <View style={styles.periodChips}>
            {PERIODS.map(({ key, label }) => {
              const active = recurrence_period === key;
              return (
                <Pressable
                  key={key}
                  style={[styles.periodChip, active && styles.chipActive]}
                  onPress={() => form.setValue('recurrence_period', key)}
                >
                  <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
      {everyError ? <Text style={styles.err}>{everyError}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.dark.surfaceEl,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  label: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.caption,
    color: Colors.dark.text2,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  chipActive: {
    borderColor: Colors.shared.cairoGold,
    backgroundColor: Colors.shared.cairoGold + '22',
  },
  chipLabel: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.caption,
    color: Colors.dark.text2,
  },
  chipLabelActive: {
    color: Colors.shared.cairoGold,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  everyLabel: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.caption,
    color: Colors.dark.text2,
  },
  everyInput: {
    width: ms(52),
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
    textAlign: 'center',
  },
  inputError: {
    borderColor: Colors.dark.negative,
  },
  periodChips: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  periodChip: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  err: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.negative,
  },
});
