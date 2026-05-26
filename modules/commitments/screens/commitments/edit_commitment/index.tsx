import { PressableFeedback, Text as HeroText } from 'heroui-native';

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
        onSubmit={() => void onSubmit()}
        title={Strings.commitmentsEditTitle}
        footerExtra={
          <PressableFeedback
            onPress={handleDeactivate}
            className="items-center px-4 py-5"
            accessibilityRole="button"
            accessibilityLabel={Strings.commitmentsDeactivate}
          >
            <HeroText className="font-inter text-danger text-[15px] font-semibold">
              {Strings.commitmentsDeactivate}
            </HeroText>
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
