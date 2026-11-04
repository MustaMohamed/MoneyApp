import { PressableFeedback, Typography } from 'heroui-native';

import { Strings } from '@/constants/strings';
import { useCommitmentFormHostState } from '@/modules/commitments/store/commitment_form_host.state';
import { type RegisterFormSessionSubmit, useFormSession } from '@/utils/use_form_session.hook';

import type { Commitment } from '../../../../entities/commitment.entity';
import { CommitmentFormBody } from '../../components/commitment_form_body';
import { useCommitmentFormStatus } from '../../components/commitment_form_body.hook';
import { useEditCommitment } from '../edit_commitment.hook';
import { DeactivateSheet } from './deactivate_sheet';

interface EditCommitmentSessionProps {
  sessionId: number;
  commitment: Commitment;
  settledDueDates: readonly string[];
  onRegisterSubmit: RegisterFormSessionSubmit;
  onSaved: (sessionId: number) => void;
  onDeactivated: (sessionId: number) => void;
}

export function EditCommitmentSession({
  sessionId,
  commitment,
  settledDueDates,
  onRegisterSubmit,
  onSaved,
  onDeactivated,
}: EditCommitmentSessionProps): React.ReactElement {
  const { state, form, onSubmit, handleDeactivate, confirmDeactivate, cancelDeactivate } =
    useEditCommitment({
      commitment,
      onSaved: () => onSaved(sessionId),
      onDeactivated: () => onDeactivated(sessionId),
    });
  const errorMessage = useCommitmentFormStatus(form, state.saveError);

  useFormSession({
    sessionId,
    submit: onSubmit,
    footer: {
      saving: state.saving,
      errorMessage,
      footnote: Strings.commitmentsEditScheduleFootnote,
    },
    onRegisterSubmit,
    publishFooter: useCommitmentFormHostState.getState().publishFooter,
  });

  return (
    <>
      <CommitmentFormBody
        form={form}
        categories={state.categories}
        accounts={state.accounts}
        settledDueDates={settledDueDates}
        afterFields={
          <PressableFeedback
            onPress={handleDeactivate}
            className="items-center px-4 py-5"
            accessibilityRole="button"
            accessibilityLabel={Strings.commitmentsStopLink}
          >
            <Typography className="font-inter-semibold text-danger text-[15px]">
              {Strings.commitmentsStopLink}
            </Typography>
          </PressableFeedback>
        }
      />
      <DeactivateSheet
        isOpen={state.deactivateDialogVisible}
        busy={state.saving}
        onCancel={cancelDeactivate}
        onConfirm={() => void confirmDeactivate()}
      />
    </>
  );
}
