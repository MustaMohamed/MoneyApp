import { PressableFeedback, Typography } from 'heroui-native';

import { Strings } from '@/constants/strings';
import { useCommitmentFormHostState } from '@/modules/commitments/store/commitment_form_host.state';
import { type RegisterFormSessionSubmit, useFormSession } from '@/utils/use_form_session.hook';

import { CommitmentFormBody } from '../../components/commitment_form_body';
import { useEditCommitment } from '../edit_commitment.hook';
import { DeactivateSheet } from './deactivate_sheet';

interface EditCommitmentSessionProps {
  sessionId: number;
  commitmentId: string;
  onRegisterSubmit: RegisterFormSessionSubmit;
  onSaved: (sessionId: number) => void;
  onDeactivated: (sessionId: number) => void;
  onClose: () => void;
}

export function EditCommitmentSession({
  sessionId,
  commitmentId,
  onRegisterSubmit,
  onSaved,
  onDeactivated,
  onClose,
}: EditCommitmentSessionProps): React.ReactElement {
  const { state, form, onSubmit, handleDeactivate, confirmDeactivate, cancelDeactivate } =
    useEditCommitment({
      commitmentId,
      onSaved: () => onSaved(sessionId),
      onDeactivated: () => onDeactivated(sessionId),
      onMissing: onClose,
    });

  useFormSession({
    sessionId,
    submit: onSubmit,
    footer: { saving: state.saving, errorMessage: state.saveError },
    onRegisterSubmit,
    publishFooter: useCommitmentFormHostState.getState().publishFooter,
  });

  return (
    <>
      <CommitmentFormBody
        form={form}
        categories={state.categories}
        accounts={state.accounts}
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
