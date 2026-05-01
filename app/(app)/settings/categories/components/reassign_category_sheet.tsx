import { View } from 'react-native';

import type { Category } from '@/store/category.store';

interface ReassignCategorySheetProps {
  visible: boolean;
  categoryName: string;
  options: Category[];
  onConfirm: (toId: string) => Promise<void>;
  onCancel: () => void;
}

export function ReassignCategorySheet(_props: ReassignCategorySheetProps) {
  return <View />;
}
