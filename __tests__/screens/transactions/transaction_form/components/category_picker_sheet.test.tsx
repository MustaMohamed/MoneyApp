import { render, fireEvent } from '@testing-library/react-native';

import { CategoryPickerSheet } from '@/screens/transactions/transaction_form/components/category_picker_sheet';
import type { Category } from '@/database/entities/category.entity';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcons');

function mkCategory(over: Partial<Category>): Category {
  return {
    id: 'c1',
    name: 'Food',
    type: 'expense',
    icon: 'food',
    color: '#F59E0B',
    is_default: 0,
    sort_order: 0,
    created_at: 'now',
    updated_at: 'now',
    ...over,
  } as Category;
}

describe('CategoryPickerSheet', () => {
  const categories: Category[] = [
    mkCategory({ id: 'c1', name: 'Food', icon: 'food' }),
    mkCategory({ id: 'c2', name: 'Transport', icon: 'car' }),
    mkCategory({ id: 'c3', name: 'Bills', icon: 'file-document' }),
  ];

  it('renders each category name when visible', () => {
    const { getByText } = render(
      <CategoryPickerSheet
        visible={true}
        title="Category"
        categories={categories}
        selectedId={undefined}
        onSelect={() => {}}
        onClose={() => {}}
      />,
    );
    expect(getByText('Food')).toBeTruthy();
    expect(getByText('Transport')).toBeTruthy();
    expect(getByText('Bills')).toBeTruthy();
  });

  it('calls onSelect with the chosen category', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <CategoryPickerSheet
        visible={true}
        title="Category"
        categories={categories}
        selectedId={undefined}
        onSelect={onSelect}
        onClose={() => {}}
      />,
    );
    fireEvent.press(getByTestId('category-picker-cell-c2'));
    expect(onSelect).toHaveBeenCalledWith(categories[1]);
  });

  it('marks the selected cell with a check indicator', () => {
    const { getByTestId } = render(
      <CategoryPickerSheet
        visible={true}
        title="Category"
        categories={categories}
        selectedId="c2"
        onSelect={() => {}}
        onClose={() => {}}
      />,
    );
    expect(getByTestId('category-picker-cell-c2-selected')).toBeTruthy();
  });
});
