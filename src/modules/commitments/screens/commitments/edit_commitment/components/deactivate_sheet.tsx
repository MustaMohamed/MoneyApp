import { ConfirmSheet } from '@/components/ui/confirm_sheet';
import { Strings } from '@/constants/strings';

interface Props {
  isOpen: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeactivateSheet({ isOpen, busy, onCancel, onConfirm }: Props) {
  return (
    <ConfirmSheet
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      busy={busy}
      title={Strings.commitmentsDeactivateTitle}
      body={Strings.commitmentsDeactivateBody}
      confirmLabel={Strings.commitmentsDeactivateConfirm}
      cancelLabel={Strings.commitmentsDeactivateCancel}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
