import { Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Spacing, Type } from '@/constants/theme';

import { CommitmentFormBody } from '../components/commitment_form_body';
import { DeactivateDialog } from './components/deactivate_dialog';
import { useEditCommitment } from './edit_commitment.hook';

export default function EditCommitmentScreen() {
  const { state, form, onSubmit, handleDeactivate, confirmDeactivate, cancelDeactivate } =
    useEditCommitment();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <CommitmentFormBody
        form={form}
        categories={state.categories}
        accounts={state.accounts}
        saving={state.saving}
        onSubmit={() => {
          void onSubmit();
        }}
        title={Strings.commitmentsEditTitle}
      />
      <Pressable style={styles.deactivateBtn} onPress={handleDeactivate}>
        <Text style={styles.deactivateText}>{Strings.commitmentsDeactivate}</Text>
      </Pressable>
      <DeactivateDialog
        visible={state.deactivateDialogVisible}
        busy={state.saving}
        onCancel={cancelDeactivate}
        onConfirm={() => {
          void confirmDeactivate();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.bg },
  deactivateBtn: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  deactivateText: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.body,
    color: Colors.dark.negative,
  },
});
