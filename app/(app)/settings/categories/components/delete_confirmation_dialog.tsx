import { View } from 'react-native';

interface DeleteConfirmationDialogProps {
  visible: boolean;
  categoryName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmationDialog(_props: DeleteConfirmationDialogProps) {
  return <View />;
}
