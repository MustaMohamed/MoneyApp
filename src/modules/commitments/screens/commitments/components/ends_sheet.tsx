import { useId } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import { DateRow } from '@/components/ui/date_row';
import { FormFactCell } from '@/components/ui/form_fact_cell';
import { FormSheetFooter } from '@/components/ui/form_sheet_footer';
import { ListCard } from '@/components/ui/list_card';
import { Stepper } from '@/components/ui/stepper';
import { DurationType } from '@/constants/enums';
import { Strings } from '@/constants/strings';

import { resolveEndsOptions } from '../commitment_form.helpers';
import { type CommitmentFormValues, ENDS_AFTER_COUNT_MIN } from '../commitment_form.shared';
import {
  CommitmentChoiceBlock,
  CommitmentChoiceOptions,
  CommitmentChoiceSheet,
} from './commitment_choice_sheet';
import { useEndsSheet } from './ends_sheet.hook';

interface EndsSheetProps {
  owner: string;
  form: UseFormReturn<CommitmentFormValues>;
  startDate: string;
  isSubmitted: boolean;
  isOpen: boolean;
  onClose: () => void;
}

const ENDS_OPTIONS = resolveEndsOptions();

export function EndsSheet({
  owner,
  form,
  startDate,
  isSubmitted,
  isOpen,
  onClose,
}: EndsSheetProps) {
  const dateOwnerId = useId();
  const {
    state: { draft, track },
    pickType,
    setCount,
    setDate,
    done,
  } = useEndsSheet(owner, form, isSubmitted);

  return (
    <CommitmentChoiceSheet
      isOpen={isOpen}
      title={Strings.commitmentsFieldDuration}
      testID="ends-sheet"
      onClose={onClose}
      footer={
        <FormSheetFooter
          statusTestID="ends-sheet-status"
          showsStatusTrack
          footnote={track}
          label={Strings.commitmentsDone}
          isLoading={false}
          onPress={done}
        />
      }
    >
      {draft === undefined ? null : (
        <>
          <CommitmentChoiceOptions<DurationType>
            options={ENDS_OPTIONS}
            value={draft.type}
            onValueChange={pickType}
            testIDPrefix="ends-option"
          />
          {draft.type === DurationType.AfterCount ? (
            <CommitmentChoiceBlock testID="ends-after" label={Strings.commitmentsDurationStopAfter}>
              <Stepper
                value={draft.count}
                min={ENDS_AFTER_COUNT_MIN}
                onChange={setCount}
                testID="ends-stepper"
                unit={Strings.commitmentsEndsStepperUnit(draft.count)}
              />
            </CommitmentChoiceBlock>
          ) : null}
          {draft.type === DurationType.UntilDate ? (
            <CommitmentChoiceBlock testID="ends-date" label={Strings.commitmentsEndsUntilLabel}>
              <ListCard>
                <FormFactCell divider={false}>
                  <DateRow
                    ownerId={dateOwnerId}
                    value={draft.date}
                    onChange={setDate}
                    divider={false}
                    label={Strings.commitmentsEndsDateRow}
                    testID="ends-date-row"
                    pickerTitle={Strings.commitmentsFieldDuration}
                    capsAtToday={false}
                    minimumDate={startDate}
                  />
                </FormFactCell>
              </ListCard>
            </CommitmentChoiceBlock>
          ) : null}
        </>
      )}
    </CommitmentChoiceSheet>
  );
}
