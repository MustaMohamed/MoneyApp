import { ConfirmSheet } from '@/components/ui/confirm_sheet';
import { Strings } from '@/constants/strings';

interface Props {
  isOpen: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Destructive ConfirmSheet for commitment deactivation via the swipe-delete action.
 * Uses deactivateCommitment semantics (soft-delete; history preserved).
 * Copy reuses commitmentsDeactivate* strings — same action, same messaging.
 */
export function CommitmentDeleteConfirmSheet({ isOpen, busy, onCancel, onConfirm }: Props) {
  return (
    <ConfirmSheet
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      busy={busy}
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
