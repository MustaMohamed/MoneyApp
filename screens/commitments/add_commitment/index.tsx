import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { Strings } from '@/constants/strings';
import { CommitmentFormBody } from '../components/commitment_form_body';
import { useAddCommitment } from './add_commitment.hook';

export default function AddCommitmentScreen() {
  const { state, form, onSubmit } = useAddCommitment();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <CommitmentFormBody
        form={form}
        categories={state.categories}
        accounts={state.accounts}
        saving={state.saving}
        onSubmit={onSubmit}
        title={Strings.commitmentsAddTitle}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.bg },
});
