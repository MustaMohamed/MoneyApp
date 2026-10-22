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
      errorMessage={state.saveError}
      onSubmit={() => void onSubmit()}
      title={Strings.commitmentsAddTitle}
    />
  );
}
