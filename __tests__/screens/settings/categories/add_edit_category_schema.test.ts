import { CategoryType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Category } from '@/modules/categories/entities/category.entity';
import { createCategorySchema } from '@/modules/categories/screens/settings/categories/components/add_edit_category_sheet.schema';

const categoryFixture = (id: string, name: string, type: CategoryType): Category => ({
  id,
  name,
  type,
  icon: 'star',
  color: '#185FA5',
  is_default: 0,
  sort_order: 0,
  budget_group: null,
  created_at: '2026-09-15T00:00:00.000Z',
  updated_at: '2026-09-15T00:00:00.000Z',
});

const FOOD = categoryFixture('food', 'food', CategoryType.Expense);
const SALARY = categoryFixture('salary', 'Salary', CategoryType.Income);
const FIXTURES = [FOOD, SALARY];

function nameErrors(
  name: string,
  categories: Category[],
  type: CategoryType,
  editingId?: string,
): string[] {
  const result = createCategorySchema(categories, type, editingId).safeParse({ name });
  if (result.success) return [];
  return result.error.issues.filter((i) => i.path[0] === 'name').map((i) => i.message);
}

function parsedName(
  name: string,
  categories: Category[],
  type: CategoryType,
  editingId?: string,
): string {
  const result = createCategorySchema(categories, type, editingId).safeParse({ name });
  if (!result.success) throw new Error(result.error.issues.map((i) => i.message).join(', '));
  return result.data.name;
}

describe('createCategorySchema name', () => {
  it('requires a name', () => {
    expect(nameErrors('', [], CategoryType.Expense)).toEqual([Strings.categoriesErrNameRequired]);
  });

  it('requires a name that is only whitespace', () => {
    expect(nameErrors('   ', [], CategoryType.Expense)).toEqual([
      Strings.categoriesErrNameRequired,
    ]);
  });

  it('skips the duplicate check on a blank name when a blank-named category of the type exists', () => {
    const blank = categoryFixture('blank', '', CategoryType.Expense);
    expect(nameErrors('   ', [blank], CategoryType.Expense)).toEqual([
      Strings.categoriesErrNameRequired,
    ]);
  });

  it('refuses a padded name a category of the same type holds in another casing', () => {
    expect(nameErrors(' Food ', FIXTURES, CategoryType.Expense)).toEqual([
      Strings.categoriesErrNameDuplicate,
    ]);
  });

  it('checks duplicates against the type passed in, not another type', () => {
    expect(parsedName(' Food ', FIXTURES, CategoryType.Income)).toBe('Food');
  });

  it('excludes the category being edited from the duplicate check', () => {
    expect(parsedName(' Food ', FIXTURES, CategoryType.Expense, FOOD.id)).toBe('Food');
  });

  it('measures the length limit on the stripped name', () => {
    expect(parsedName(` ${'a'.repeat(50)} `, [], CategoryType.Expense)).toBe('a'.repeat(50));
  });

  it('refuses a stripped name past the length limit with the length message alone', () => {
    expect(nameErrors(` ${'a'.repeat(51)} `, [], CategoryType.Expense)).toEqual([
      Strings.categoriesErrNameTooLong,
    ]);
  });

  it('keeps a name of non-breaking spaces as typed', () => {
    expect(parsedName('  ', [], CategoryType.Expense)).toBe('  ');
  });
});
