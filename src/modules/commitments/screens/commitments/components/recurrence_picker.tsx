import { Input } from 'heroui-native';
import { Controller, useWatch, type UseFormReturn } from 'react-hook-form';
import { View } from 'react-native';

import { SelectablePill } from '@/components/ui/chip';
import { Text } from '@/components/ui/text';
import { RecurrencePeriod, RecurrencePreset } from '@/constants/enums';
import { Strings } from '@/constants/strings';

import { type CommitmentFormValues, SET_OPTS } from '../commitment_form.shared';

interface Props {
  form: UseFormReturn<CommitmentFormValues>;
  recurrencePreset: RecurrencePreset;
  onPresetChange: (preset: RecurrencePreset) => void;
}

const PRESETS: { key: RecurrencePreset; label: string }[] = [
  { key: RecurrencePreset.Monthly, label: Strings.commitmentsRecurrenceMonthly },
  { key: RecurrencePreset.Weekly, label: Strings.commitmentsRecurrenceWeekly },
  { key: RecurrencePreset.Annually, label: Strings.commitmentsRecurrenceAnnually },
  { key: RecurrencePreset.Custom, label: Strings.commitmentsRecurrenceCustom },
];
const PERIODS: { key: RecurrencePeriod; label: string }[] = [
  { key: RecurrencePeriod.Days, label: Strings.commitmentsRecurrenceUnitDays },
  { key: RecurrencePeriod.Weeks, label: Strings.commitmentsRecurrenceUnitWeeks },
  { key: RecurrencePeriod.Months, label: Strings.commitmentsRecurrenceUnitMonths },
  { key: RecurrencePeriod.Years, label: Strings.commitmentsRecurrenceUnitYears },
];

export function RecurrencePicker({ form, recurrencePreset, onPresetChange }: Props) {
  const recurrencePeriod = useWatch({ control: form.control, name: 'recurrencePeriod' });
  const everyError = form.formState.errors.recurrenceEvery?.message;

  return (
    <View className="bg-default gap-2 rounded-2xl px-3 py-3">
      <Text className="font-inter text-muted text-[11px]">
        {Strings.commitmentsFieldRecurrence}
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }} className="gap-2">
        {PRESETS.map(({ key, label }) => (
          <SelectablePill
            key={key}
            label={label}
            selected={recurrencePreset === key}
            onPress={() => onPresetChange(key)}
          />
        ))}
      </View>

      {recurrencePreset === RecurrencePreset.Custom ? (
        <View
          style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}
          className="gap-2"
        >
          <Text className="font-inter text-muted text-[11px]">
            {Strings.commitmentsRecurrenceEvery}
          </Text>
          <View style={{ width: 56 }}>
            <Controller
              control={form.control}
              name="recurrenceEvery"
              render={({ field: { value, onChange, onBlur } }) => (
                <Input
                  // oxlint-disable-next-line typescript/no-unnecessary-condition -- RHF value can be null/undefined at reset
                  value={value != null ? String(value) : ''}
                  onChangeText={(v) => {
                    if (v === '') {
                      onChange(undefined);
                      return;
                    }
                    const n = parseInt(v, 10);
                    if (!isNaN(n)) onChange(n);
                  }}
                  onBlur={onBlur}
                  keyboardType="number-pad"
                  maxLength={3}
                  isInvalid={!!everyError}
                  style={{ textAlign: 'center' }}
                />
              )}
            />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }} className="gap-2">
            {PERIODS.map(({ key, label }) => (
              <SelectablePill
                key={key}
                label={label}
                selected={recurrencePeriod === key}
                onPress={() => form.setValue('recurrencePeriod', key, SET_OPTS)}
              />
            ))}
          </View>
        </View>
      ) : null}

      {everyError ? <Text className="font-inter text-danger text-[11px]">{everyError}</Text> : null}
    </View>
  );
}
