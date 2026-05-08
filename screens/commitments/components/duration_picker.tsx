import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { DurationType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import type { UseFormReturn } from 'react-hook-form';
import type { CommitmentFormValues } from '../add_commitment/add_commitment.hook';

interface Props {
  form: UseFormReturn<CommitmentFormValues>;
  durationType: DurationType;
  onDurationTypeChange: (type: DurationType) => void;
}

const CHIP_ACTIVE_BG = Colors.shared.cairoGold + '22';

const DURATION_TYPES: { key: DurationType; label: string }[] = [
  { key: DurationType.Forever, label: Strings.commitmentsDurationForever },
  { key: DurationType.AfterCount, label: Strings.commitmentsDurationAfterCount },
  { key: DurationType.UntilDate, label: Strings.commitmentsDurationUntilDate },
];

export function DurationPicker({ form, durationType, onDurationTypeChange }: Props) {
  const end_after_count = form.watch('end_after_count');
  const end_date = form.watch('end_date');
  const countError = form.formState.errors.end_after_count?.message;
  const dateError = form.formState.errors.end_date?.message;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{Strings.commitmentsFieldDuration}</Text>

      {/* Type chips */}
      <View style={styles.chipRow}>
        {DURATION_TYPES.map(({ key, label }) => {
          const active = durationType === key;
          return (
            <Pressable
              key={key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onDurationTypeChange(key)}
            >
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* AfterCount conditional */}
      {durationType === DurationType.AfterCount && (
        <View style={styles.conditionalRow}>
          <Text style={styles.conditionalLabel}>{Strings.commitmentsDurationStopAfter}</Text>
          <TextInput
            style={[styles.countInput, countError ? styles.inputError : null]}
            value={end_after_count != null ? String(end_after_count) : ''}
            onChangeText={(v) => {
              const n = parseInt(v, 10);
              form.setValue('end_after_count', isNaN(n) ? undefined : n);
            }}
            keyboardType="number-pad"
            maxLength={4}
            placeholderTextColor={Colors.dark.text2}
            placeholder={Strings.commitmentsAfterCountPlaceholder}
          />
          <Text style={styles.conditionalLabel}>{Strings.commitmentsDurationPayments}</Text>
        </View>
      )}
      {countError ? <Text style={styles.err}>{countError}</Text> : null}

      {/* UntilDate conditional */}
      {durationType === DurationType.UntilDate && (
        <TextInput
          style={[styles.dateInput, dateError ? styles.inputError : null]}
          value={end_date ?? ''}
          onChangeText={(v) => form.setValue('end_date', v || undefined)}
          placeholder={Strings.commitmentDateInputFormat}
          placeholderTextColor={Colors.dark.text2}
          keyboardType="numbers-and-punctuation"
          maxLength={10}
        />
      )}
      {dateError ? <Text style={styles.err}>{dateError}</Text> : null}
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
    backgroundColor: CHIP_ACTIVE_BG,
  },
  chipLabel: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.caption,
    color: Colors.dark.text2,
  },
  chipLabelActive: {
    color: Colors.shared.cairoGold,
  },
  conditionalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  conditionalLabel: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.caption,
    color: Colors.dark.text2,
  },
  countInput: {
    width: ms(64),
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
  dateInput: {
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  inputError: {
    borderColor: Colors.dark.negative,
  },
  err: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.negative,
  },
});
