import { Sheet } from '@/components/ui/sheet';

import { CommitmentFormBody, CommitmentFormFooter } from '../components/commitment_form_body';
import { useCommitmentFormHost } from './commitment_form_host.hook';

export function CommitmentFormHost(): React.ReactElement {
  const { state, form, handleSave, handleOpenChange, handleCloseComplete } =
    useCommitmentFormHost();

  return (
    <Sheet
      isOpen={state.isOpen}
      onOpenChange={handleOpenChange}
      onCloseComplete={handleCloseComplete}
      title={state.title}
      size="lg"
      scrollable
      liftsAboveKeyboard
      isDismissable={state.isDismissable}
      footer={
        state.hasSession ? (
          <CommitmentFormFooter
            errorMessage={state.saveError}
            saving={state.saving}
            onSubmit={handleSave}
          />
        ) : undefined
      }
    >
      {state.hasSession ? (
        <CommitmentFormBody
          key={state.sessionId}
          presentation="sheet"
          form={form}
          categories={state.categories}
          accounts={state.accounts}
        />
      ) : null}
    </Sheet>
  );
}
