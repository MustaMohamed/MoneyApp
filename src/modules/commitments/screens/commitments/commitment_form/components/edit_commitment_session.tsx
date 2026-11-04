import { PressableFeedback, Typography } from 'heroui-native';

import { Strings } from '@/constants/strings';
import { useCommitmentFormHostState } from '@/modules/commitments/store/commitment_form_host.state';
import { type RegisterFormSessionSubmit, useFormSession } from '@/utils/use_form_session.hook';

import type { CommitmentStopCounts } from '../../../../domain/payment_state';
import type { Commitment } from '../../../../entities/commitment.entity';
import { CommitmentFormBody } from '../../components/commitment_form_body';
import { useCommitmentFormStatus } from '../../components/commitment_form_body.hook';
import { StopConfirmDialog } from '../../components/stop_confirm_dialog';
import { useEditCommitment } from '../edit_commitment.hook';

interface EditCommitmentSessionProps {
  sessionId: number;
  commitment: Commitment;
  settledDueDates: readonly string[];
  stopCounts: CommitmentStopCounts;
  onRegisterSubmit: RegisterFormSessionSubmit;
  onSaved: (sessionId: number) => void;
  onStopped: (sessionId: number) => void;
}

export function EditCommitmentSession({
  sessionId,
  commitment,
  settledDueDates,
  stopCounts,
  onRegisterSubmit,
  onSaved,
  onStopped,
}: EditCommitmentSessionProps): React.ReactElement {
  const { state, form, onSubmit, openStopDialog, confirmStop, cancelStop } = useEditCommitment({
    commitment,
    onSaved: () => onSaved(sessionId),
    onStopped: () => onStopped(sessionId),
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
            onPress={openStopDialog}
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
      <StopConfirmDialog
        isOpen={state.stopDialogVisible}
        name={commitment.name}
        counts={stopCounts}
        busy={state.saving}
        failed={state.stopError}
        onCancel={cancelStop}
        onConfirm={() => void confirmStop()}
      />
    </>
  );
}
