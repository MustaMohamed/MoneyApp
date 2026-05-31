// Public API — store, UI components, shared types only.
// CategoryRepository is internal; access category data through the store.
export { useCategoryStore, createCategoryStore } from './store/category.store';
export type { Category, NewCategoryInput, UpdateCategoryInput } from './store/category.store';
export { CategoryPickerSheet } from './components/category_picker_sheet';
