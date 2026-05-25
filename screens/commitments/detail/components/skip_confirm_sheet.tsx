import { ConfirmSheet } from '@/components/ui/confirm_sheet';
import { Strings } from '@/constants/strings';

interface Props {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function SkipConfirmSheet({ visible, onCancel, onConfirm }: Props) {
  return (
    <ConfirmSheet
      visible={visible}
      title={Strings.commitmentsSkipConfirmTitle}
      body={Strings.commitmentsSkipConfirmBody}
      confirmLabel={Strings.commitmentsSkipConfirmConfirm}
      cancelLabel={Strings.commitmentsSkipConfirmCancel}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
