import { PressableFeedback, Typography } from 'heroui-native';

import { Strings } from '@/constants/strings';

import { CommitmentFormBody } from '../components/commitment_form_body';
import { DeactivateSheet } from './components/deactivate_sheet';
import { useEditCommitment } from './edit_commitment.hook';

export default function EditCommitmentScreen() {
  const { state, form, onSubmit, handleDeactivate, confirmDeactivate, cancelDeactivate } =
    useEditCommitment();

  return (
    <>
      <CommitmentFormBody
        form={form}
        categories={state.categories}
        accounts={state.accounts}
        saving={state.saving}
        errorMessage={state.saveError}
        onSubmit={() => void onSubmit()}
        title={Strings.commitmentsEditTitle}
        footerExtra={
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
