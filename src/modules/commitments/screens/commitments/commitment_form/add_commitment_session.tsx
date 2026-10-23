import { CommitmentFormBody } from '../components/commitment_form_body';
import { useAddCommitment } from './add_commitment.hook';
import type { RegisterCommitmentFormSubmit } from './commitment_form_host.hook';
import { useCommitmentFormSession } from './commitment_form_session.hook';

interface AddCommitmentSessionProps {
  sessionId: number;
  onRegisterSubmit: RegisterCommitmentFormSubmit;
  onSaved: (sessionId: number) => void;
}

export function AddCommitmentSession({
  sessionId,
  onRegisterSubmit,
  onSaved,
}: AddCommitmentSessionProps): React.ReactElement {
  const { state, form, onSubmit } = useAddCommitment({ onSaved: () => onSaved(sessionId) });

  useCommitmentFormSession({
    sessionId,
    submit: onSubmit,
    footer: { saving: state.saving, errorMessage: state.saveError },
    onRegisterSubmit,
  });

  return <CommitmentFormBody form={form} categories={state.categories} accounts={state.accounts} />;
}
