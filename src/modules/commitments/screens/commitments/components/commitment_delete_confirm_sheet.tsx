import { ConfirmSheet } from '@/components/ui/confirm_sheet';
import { Strings } from '@/constants/strings';

interface Props {
  isOpen: boolean;
  busy: boolean;
  errorMessage?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Swipe-delete means deactivate: a soft delete that preserves commitment history. */
export function CommitmentDeleteConfirmSheet({
  isOpen,
  busy,
  errorMessage,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <ConfirmSheet
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      busy={busy}
      errorMessage={errorMessage}
      destructive
      title={Strings.commitmentsDeactivateTitle}
      body={Strings.commitmentsDeactivateBody}
      confirmLabel={Strings.commitmentsDeactivateConfirm}
      cancelLabel={Strings.commitmentsDeactivateCancel}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
