import { useCommitmentFormHostState } from '@/modules/commitments/store/commitment_form_host.state';
import { type RegisterFormSessionSubmit, useFormSession } from '@/utils/use_form_session.hook';

import { CommitmentFormBody } from '../../components/commitment_form_body';
import { useAddCommitment } from '../add_commitment.hook';

interface AddCommitmentSessionProps {
  sessionId: number;
  onRegisterSubmit: RegisterFormSessionSubmit;
  onSaved: (sessionId: number) => void;
}

export function AddCommitmentSession({
  sessionId,
  onRegisterSubmit,
  onSaved,
}: AddCommitmentSessionProps): React.ReactElement {
  const { state, form, onSubmit } = useAddCommitment({ onSaved: () => onSaved(sessionId) });

  useFormSession({
    sessionId,
    submit: onSubmit,
    footer: { saving: state.saving, errorMessage: state.saveError },
    onRegisterSubmit,
    publishFooter: useCommitmentFormHostState.getState().publishFooter,
  });

  return <CommitmentFormBody form={form} categories={state.categories} accounts={state.accounts} />;
}
