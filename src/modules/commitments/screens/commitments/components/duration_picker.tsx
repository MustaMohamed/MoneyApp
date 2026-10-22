import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Input, PressableFeedback } from 'heroui-native';
import { Controller, useWatch, type UseFormReturn } from 'react-hook-form';
import { Platform, View } from 'react-native';

import { SelectablePill } from '@/components/ui/chip';
import { useBottomSheetAwareHandlers } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { useTouchFloorGridHitSlop } from '@/components/ui/touch_floor.hook';
import { DurationType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { HIT_SLOP_UNCLIPPED_STYLE } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';
import { formatLongDate, toLocalDateString } from '@/utils/format_date';

import { type CommitmentFormValues, SET_OPTS, composeFieldBlur } from '../commitment_form.shared';
import { COMMITMENT_FORM_PICKER_GAP, COMMITMENT_FORM_PILL_SLOP } from './commitment_form.geometry';

interface Props {
  form: UseFormReturn<CommitmentFormValues>;
  durationType: DurationType;
  onDurationTypeChange: (type: DurationType) => void;
  showEndDatePicker: boolean;
  setShowEndDatePicker: (v: boolean) => void;
}

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
  const { onFocus: onInputFocus, onBlur: onInputBlur } = useBottomSheetAwareHandlers();
  const durationTouch = useTouchFloorGridHitSlop(
    COMMITMENT_FORM_PICKER_GAP,
    durationType === DurationType.Forever ? {} : { bottom: COMMITMENT_FORM_PICKER_GAP / 2 },
    COMMITMENT_FORM_PILL_SLOP,
  );

  const endDateAsDate = endDate ? new Date(endDate + 'T00:00:00') : new Date();
  const formattedEndDate = endDate ? formatLongDate(endDate) : Strings.commitmentDateInputFormat;

  function openEndDatePicker() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: endDateAsDate,
        mode: 'date',
        onValueChange: (_, d) => form.setValue('endDate', toLocalDateString(d), SET_OPTS),
      });
    } else {
      setShowEndDatePicker(!showEndDatePicker);
    }
  }

  return (
    <View className="bg-default rounded-2xl px-3 py-3" style={{ gap: COMMITMENT_FORM_PICKER_GAP }}>
      <Text className="font-inter text-muted text-[11px]">{Strings.commitmentsFieldDuration}</Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: COMMITMENT_FORM_PICKER_GAP }}>
        {DURATION_TYPES.map(({ key, label }) => (
          <SelectablePill
            key={key}
            {...durationTouch.item(key)}
            label={label}
            selected={durationType === key}
            onPress={() => onDurationTypeChange(key)}
            style={HIT_SLOP_UNCLIPPED_STYLE}
          />
        ))}
      </View>

      {durationType === DurationType.AfterCount ? (
        <View style={{ flexDirection: 'row', alignItems: 'center' }} className="gap-2">
          <Text className="font-inter text-muted text-[11px]">
            {Strings.commitmentsDurationStopAfter}
          </Text>
          <View style={{ width: 64 }}>
            <Controller
              control={form.control}
              name="endAfterCount"
              render={({ field: { value, onChange, onBlur } }) => (
                <Input
                  value={value != null ? String(value) : ''}
                  onChangeText={(v) => {
                    const n = parseInt(v, 10);
                    onChange(isNaN(n) ? undefined : n);
                  }}
                  onFocus={onInputFocus}
                  onBlur={composeFieldBlur(onInputBlur, onBlur)}
                  keyboardType="number-pad"
                  maxLength={4}
                  placeholder={Strings.commitmentsAfterCountPlaceholder}
                  isInvalid={!!countError}
                  style={{ textAlign: 'center' }}
                />
              )}
            />
          </View>
          <Text className="font-inter text-muted text-[11px]">
            {Strings.commitmentsDurationPayments}
          </Text>
        </View>
      ) : null}
      {countError ? <Text className="font-inter text-danger text-[11px]">{countError}</Text> : null}

      {durationType === DurationType.UntilDate ? (
        <PressableFeedback
          onPress={openEndDatePicker}
          style={{ flexDirection: 'row', alignItems: 'center' }}
          className={`border-border gap-2 rounded-md border px-3 py-3 ${dateError ? 'border-danger' : ''}`}
        >
          <Text
            className={
              endDate
                ? 'font-sora text-foreground flex-1 text-[15px]'
                : 'font-inter text-muted flex-1 text-[15px]'
            }
          >
            {formattedEndDate}
          </Text>
          <MaterialCommunityIcons name="calendar" size={18} color={CoreTokens.text2} />
        </PressableFeedback>
      ) : null}
      {durationType === DurationType.UntilDate && showEndDatePicker && Platform.OS === 'ios' ? (
        <DateTimePicker
          value={endDateAsDate}
          mode="date"
          display="spinner"
          themeVariant="dark"
          onValueChange={(_, d) => form.setValue('endDate', toLocalDateString(d), SET_OPTS)}
        />
      ) : null}
      {dateError ? <Text className="font-inter text-danger text-[11px]">{dateError}</Text> : null}
    </View>
  );
}
