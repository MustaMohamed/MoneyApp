// backward-compat re-export — remove when all consumers are migrated to @/modules/categories
export {
  getCategories,
  getCategoriesByType,
  addCategory,
  updateCategory,
  setCategoryGroup,
  deleteCategory,
  reassignCategory,
  getCategoryTransactionCount,
} from '@/modules/categories/database/categories';
