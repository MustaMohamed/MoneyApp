import { View } from 'react-native';

import type { Category, NewCategoryInput, UpdateCategoryInput } from '@/store/category.store';

interface AddEditCategorySheetProps {
  visible: boolean;
  editingCategory: Category | null;
  activeTab: 'expense' | 'income';
  onClose: () => void;
  onSave: (data: NewCategoryInput | UpdateCategoryInput) => Promise<void>;
}

export function AddEditCategorySheet(_props: AddEditCategorySheetProps) {
  return <View />;
}
