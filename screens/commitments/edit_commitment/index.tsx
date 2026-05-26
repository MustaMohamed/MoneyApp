import { Pressable } from 'react-native';

import { Text } from '@/components/ui/text';
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
          <Pressable
            onPress={handleDeactivate}
            className="items-center px-4 py-5"
            accessibilityRole="button"
            accessibilityLabel={Strings.commitmentsDeactivate}
          >
            <Text className="font-inter text-danger text-[15px] font-semibold">
              {Strings.commitmentsDeactivate}
            </Text>
          </Pressable>
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
