import { ConfirmDialog } from '@/components/ui/confirm_dialog';
import { Strings } from '@/constants/strings';

interface DeleteConfirmationDialogProps {
  visible: boolean;
  categoryName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmationDialog({
  visible,
  categoryName,
  onConfirm,
  onCancel,
}: DeleteConfirmationDialogProps) {
  return (
    <ConfirmDialog
      visible={visible}
      destructive
      title={Strings.categoriesDeleteTitle}
      body={Strings.categoriesDeleteBody(categoryName)}
      confirmLabel={Strings.categoriesDeleteConfirm}
      cancelLabel={Strings.categoriesDeleteCancel}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
