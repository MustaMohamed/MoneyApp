// Backward-compat re-export; remove when all consumers use `@/modules/categories`.
export { createCategoryStore, useCategoryStore } from '@/modules/categories/store/category.store';
export type {
  Category,
  NewCategoryInput,
  UpdateCategoryInput,
} from '@/modules/categories/store/category.store';
