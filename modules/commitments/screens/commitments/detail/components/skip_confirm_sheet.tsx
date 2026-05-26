import { ConfirmSheet } from '@/components/ui/confirm_sheet';
import { Strings } from '@/constants/strings';

interface Props {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function SkipConfirmSheet({ isOpen, onCancel, onConfirm }: Props) {
  return (
    <ConfirmSheet
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      title={Strings.commitmentsSkipConfirmTitle}
      body={Strings.commitmentsSkipConfirmBody}
      confirmLabel={Strings.commitmentsSkipConfirmConfirm}
      cancelLabel={Strings.commitmentsSkipConfirmCancel}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
