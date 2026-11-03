import type { UseFormReturn } from 'react-hook-form';
import { View, useWindowDimensions } from 'react-native';

import { resolveTypeTabsGeometry } from '@/components/ui/form_sheet.geometry';
import { FormSheetFooter } from '@/components/ui/form_sheet_footer';
import { Stepper } from '@/components/ui/stepper';
import { SegmentedTabs, type TabSegment } from '@/components/ui/tabs';
import { Text } from '@/components/ui/text';
import { RecurrencePeriod, type RecurrencePreset } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { LetterSpacing, Radius, Size, Spacing, Type, lineHeightFor } from '@/constants/theme';
import { ms } from '@/utils/responsive';

import { resolveRepeatsOptions } from '../commitment_form.helpers';
import {
  type CommitmentFormValues,
  RECURRENCE_EVERY_MAX,
  RECURRENCE_EVERY_MIN,
} from '../commitment_form.shared';
import { CommitmentChoiceOptions, CommitmentChoiceSheet } from './commitment_choice_sheet';
import { REPEATS_UNIT_MIN_WIDTH } from './commitment_form.geometry';
import { useRepeatsSheet } from './repeats_sheet.hook';

interface RepeatsSheetProps {
  owner: string;
  form: UseFormReturn<CommitmentFormValues>;
  isOpen: boolean;
  onClose: () => void;
}

const REPEATS_OPTIONS: { value: RecurrencePreset; label: string }[] = resolveRepeatsOptions().map(
  ({ preset, label }) => ({ value: preset, label }),
);

const REPEATS_UNITS: TabSegment<RecurrencePeriod>[] = [
  { value: RecurrencePeriod.Days, label: Strings.commitmentsRepeatsUnitDays },
  { value: RecurrencePeriod.Weeks, label: Strings.commitmentsRepeatsUnitWeeks },
  { value: RecurrencePeriod.Months, label: Strings.commitmentsRepeatsUnitMonths },
  { value: RecurrencePeriod.Years, label: Strings.commitmentsRepeatsUnitYears },
];

export function RepeatsSheet({ owner, form, isOpen, onClose }: RepeatsSheetProps) {
  const {
    state: { draft, label, isCustom },
    pickPreset,
    setEvery,
    setPeriod,
    done,
  } = useRepeatsSheet(owner, form);
  const { listHeight, triggerHitSlop } = resolveTypeTabsGeometry(useWindowDimensions().fontScale);

  return (
    <CommitmentChoiceSheet
      isOpen={isOpen}
      title={Strings.commitmentsFieldRecurrence}
      testID="repeats-sheet"
      onClose={onClose}
      footer={
        <FormSheetFooter
          statusTestID="repeats-sheet-status"
          showsStatusTrack
          footnote={label}
          label={Strings.commitmentsDone}
          isLoading={false}
          onPress={done}
        />
      }
    >
      {draft === undefined ? null : (
        <>
          <CommitmentChoiceOptions<RecurrencePreset>
            options={REPEATS_OPTIONS}
            value={draft.preset}
            onValueChange={pickPreset}
            testIDPrefix="repeats-option"
          />
          {isCustom ? (
            <View
              testID="repeats-custom"
              className="bg-background border-separator"
              style={{
                marginTop: Spacing.sm,
                paddingVertical: Spacing.sm,
                paddingHorizontal: Spacing.md,
                borderWidth: Size.hairline,
                borderRadius: Radius.lg,
              }}
            >
              <Text
                className="font-inter-semibold text-muted uppercase"
                style={{
                  marginBottom: Spacing.xs,
                  fontSize: Type.overline,
                  lineHeight: lineHeightFor(Type.overline),
                  letterSpacing: LetterSpacing.eyebrow,
                }}
              >
                {Strings.commitmentsRecurrenceEvery}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: Spacing.xs,
                }}
              >
                <Stepper
                  value={draft.every}
                  min={RECURRENCE_EVERY_MIN}
                  max={RECURRENCE_EVERY_MAX}
                  onChange={setEvery}
                  testID="repeats-stepper"
                />
                <View
                  testID="repeats-unit"
                  style={{ flex: 1, minWidth: ms(REPEATS_UNIT_MIN_WIDTH) }}
                >
                  <SegmentedTabs<RecurrencePeriod>
                    segments={REPEATS_UNITS}
                    value={draft.period}
                    onValueChange={setPeriod}
                    variant="solid-gold"
                    density="compact"
                    corners="form"
                    listClassName="w-full"
                    listStyle={{ height: listHeight }}
                    triggerHitSlop={triggerHitSlop}
                    accessibilityLabel={Strings.commitmentsRepeatsUnitA11y}
                  />
                </View>
              </View>
              <Text
                testID="repeats-custom-line"
                className="font-inter text-muted"
                style={{
                  marginTop: Spacing.xs,
                  fontSize: Type.caption,
                  lineHeight: lineHeightFor(Type.caption),
                }}
              >
                {label}
              </Text>
            </View>
          ) : null}
        </>
      )}
    </CommitmentChoiceSheet>
  );
}
