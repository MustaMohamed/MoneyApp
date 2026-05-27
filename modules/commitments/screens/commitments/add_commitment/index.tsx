import { Strings } from '@/constants/strings';

import { CommitmentFormBody } from '../components/commitment_form_body';
import { useAddCommitment } from './add_commitment.hook';

export default function AddCommitmentScreen() {
  const { state, form, onSubmit } = useAddCommitment();

  return (
    <CommitmentFormBody
      form={form}
      categories={state.categories}
      accounts={state.accounts}
      saving={state.saving}
      onSubmit={() => void onSubmit()}
      title={Strings.commitmentsAddTitle}
    />
  );
}
