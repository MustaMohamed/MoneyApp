// backward-compat re-export — remove when all consumers are migrated to @/modules/categories
export { createCategoryStore, useCategoryStore } from '@/modules/categories/store/category.store';
export type {
  Category,
  NewCategoryInput,
  UpdateCategoryInput,
} from '@/modules/categories/store/category.store';
