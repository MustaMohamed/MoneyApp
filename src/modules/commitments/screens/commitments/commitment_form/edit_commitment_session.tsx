import { PressableFeedback, Typography } from 'heroui-native';

import { Strings } from '@/constants/strings';

import { CommitmentFormBody } from '../components/commitment_form_body';
import type { RegisterCommitmentFormSubmit } from './commitment_form_host.hook';
import { useCommitmentFormSession } from './commitment_form_session.hook';
import { DeactivateSheet } from './components/deactivate_sheet';
import { useEditCommitment } from './edit_commitment.hook';

interface EditCommitmentSessionProps {
  sessionId: number;
  commitmentId: string;
  onRegisterSubmit: RegisterCommitmentFormSubmit;
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

  useCommitmentFormSession({
    sessionId,
    submit: onSubmit,
    footer: { saving: state.saving, errorMessage: state.saveError },
    onRegisterSubmit,
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
            accessibilityLabel={Strings.commitmentsDeactivate}
          >
            <Typography className="font-inter-semibold text-danger text-[15px]">
              {Strings.commitmentsDeactivate}
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
