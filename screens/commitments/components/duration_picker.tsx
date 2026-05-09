import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Controller, useWatch } from 'react-hook-form';

import { DurationType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import { formatLongDate, toLocalDateString } from '@/utils/format_date';
import type { UseFormReturn } from 'react-hook-form';
import { type CommitmentFormValues, SET_OPTS } from '../commitment_form.shared';

interface Props {
  form: UseFormReturn<CommitmentFormValues>;
  durationType: DurationType;
  onDurationTypeChange: (type: DurationType) => void;
  showEndDatePicker: boolean;
  setShowEndDatePicker: (v: boolean) => void;
}

const CHIP_ACTIVE_BG = Colors.shared.cairoGold + '22';

const DURATION_TYPES: { key: DurationType; label: string }[] = [
  { key: DurationType.Forever, label: Strings.commitmentsDurationForever },
  { key: DurationType.AfterCount, label: Strings.commitmentsDurationAfterCount },
  { key: DurationType.UntilDate, label: Strings.commitmentsDurationUntilDate },
];

export function DurationPicker({
  form,
  durationType,
  onDurationTypeChange,
  showEndDatePicker,
  setShowEndDatePicker,
}: Props) {
  const endDate = useWatch({ control: form.control, name: 'endDate' });
  const countError = form.formState.errors.endAfterCount?.message;
  const dateError = form.formState.errors.endDate?.message;

  const endDateAsDate = endDate ? new Date(endDate + 'T00:00:00') : new Date();
  const formattedEndDate = endDate ? formatLongDate(endDate) : Strings.commitmentDateInputFormat;

  function openEndDatePicker() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: endDateAsDate,
        mode: 'date',
        onChange: (_, d) => {
          if (d) form.setValue('endDate', toLocalDateString(d), SET_OPTS);
        },
      });
    } else {
      setShowEndDatePicker(!showEndDatePicker);
    }
  }

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
          <Controller
            control={form.control}
            name="endAfterCount"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                style={[styles.countInput, countError ? styles.inputError : null]}
                value={value != null ? String(value) : ''}
                onChangeText={(v) => {
                  const n = parseInt(v, 10);
                  onChange(isNaN(n) ? undefined : n);
                }}
                onBlur={onBlur}
                keyboardType="number-pad"
                maxLength={4}
                placeholderTextColor={Colors.dark.text2}
                placeholder={Strings.commitmentsAfterCountPlaceholder}
                multiline={false}
                numberOfLines={1}
              />
            )}
          />
          <Text style={styles.conditionalLabel}>{Strings.commitmentsDurationPayments}</Text>
        </View>
      )}
      {countError ? <Text style={styles.err}>{countError}</Text> : null}

      {/* UntilDate conditional */}
      {durationType === DurationType.UntilDate && (
        <Pressable
          style={[styles.dateRow, dateError ? styles.inputError : null]}
          onPress={openEndDatePicker}
        >
          <Text style={endDate ? styles.dateValue : styles.datePlaceholder}>
            {formattedEndDate}
          </Text>
          <MaterialCommunityIcons name="calendar" size={ms(18)} color={Colors.dark.text2} />
        </Pressable>
      )}
      {durationType === DurationType.UntilDate && showEndDatePicker && (
        <View style={styles.iosPickerWrap}>
          <View style={styles.iosPickerHeader}>
            <Pressable hitSlop={8} onPress={() => setShowEndDatePicker(false)}>
              <Text style={styles.iosPickerDone}>{Strings.commitmentsDone}</Text>
            </Pressable>
          </View>
          <DateTimePicker
            value={endDateAsDate}
            mode="date"
            display="spinner"
            themeVariant="dark"
            onChange={(_, d) => {
              if (d) form.setValue('endDate', toLocalDateString(d), SET_OPTS);
            }}
          />
        </View>
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
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  dateValue: {
    flex: 1,
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  datePlaceholder: {
    flex: 1,
    fontFamily: FontFamily.interRegular,
    fontSize: Type.body,
    color: Colors.dark.text2,
  },
  inputError: {
    borderColor: Colors.dark.negative,
  },
  err: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.negative,
  },
  iosPickerWrap: {
    backgroundColor: Colors.dark.surfaceEl,
    borderRadius: Radius.md,
  },
  iosPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  iosPickerDone: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.body,
    color: Colors.shared.cairoGold,
  },
});
