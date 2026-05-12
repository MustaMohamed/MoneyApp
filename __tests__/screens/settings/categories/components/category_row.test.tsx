/**
 * CategoryRow tests
 *
 * Covers:
 * 1. isLast=false (default) — bottom divider border IS rendered (borderBottomWidth 1)
 * 2. isLast=true — bottom divider border is NOT rendered (borderBottomWidth 0)
 * 3. isLast omitted — defaults to false (borderBottomWidth 1)
 * 4. is_default=1 — lock icon shown, edit AND delete buttons are hidden
 * 5. is_default=0 — edit AND delete buttons are shown, no lock icon
 * 6. Any is_default=1 category (not just "Other" IDs) is protected from edit/delete
 *
 * Strategy: query the row container via UNSAFE_getAllByType(View), take the first
 * one (the outer row View), and inspect its flattened style array.
 * StyleSheet.flatten is used to resolve registered style IDs to plain objects.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { render } from '@testing-library/react-native';

import { CategoryRow } from '@/screens/settings/categories/components/category_row';
import type { Category } from '@/store/category.store';
import { CategoryType } from '@/constants/enums';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcons');

const makeCategory = (overrides: Partial<Category> = {}): Category => ({
  id: 'cat-001',
  name: 'Food & Drink',
  icon: 'food',
  color: '#4CAF82',
  type: CategoryType.Expense,
  is_default: 0,
  sort_order: 1,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

/** Flatten the style prop (may be an array of StyleSheet IDs or plain objects) */
function flattenStyle(style: unknown): Partial<Record<string, unknown>> {
  return (StyleSheet.flatten(style as Parameters<typeof StyleSheet.flatten>[0]) as Partial<Record<string, unknown>>) ?? {};
}

describe('CategoryRow — isLast prop', () => {
  it('renders the bottom divider (borderBottomWidth 1) when isLast is false', () => {
    const { UNSAFE_getAllByType } = render(
      <CategoryRow
        category={makeCategory()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        isLast={false}
      />,
    );

    const outerRow = UNSAFE_getAllByType(View)[0];
    const flat = flattenStyle(outerRow.props.style);
    expect(flat.borderBottomWidth).toBe(1);
  });

  it('hides the bottom divider (borderBottomWidth 0) when isLast is true', () => {
    const { UNSAFE_getAllByType } = render(
      <CategoryRow
        category={makeCategory()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        isLast={true}
      />,
    );

    const outerRow = UNSAFE_getAllByType(View)[0];
    const flat = flattenStyle(outerRow.props.style);
    expect(flat.borderBottomWidth).toBe(0);
  });

  it('defaults to showing the divider (borderBottomWidth 1) when isLast is omitted', () => {
    const { UNSAFE_getAllByType } = render(
      <CategoryRow
        category={makeCategory()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    const outerRow = UNSAFE_getAllByType(View)[0];
    const flat = flattenStyle(outerRow.props.style);
    expect(flat.borderBottomWidth).toBe(1);
  });
});

describe('CategoryRow — is_default protection gate', () => {
  it('shows edit and delete buttons when is_default=0', () => {
    const { getByAccessibilityHint: _a, queryByLabelText, queryAllByRole } = render(
      <CategoryRow
        category={makeCategory({ is_default: 0 })}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    const buttons = queryAllByRole('button');
    const editBtn = queryByLabelText('Edit category');
    const deleteBtn = queryByLabelText('Delete category');

    expect(buttons.length).toBeGreaterThanOrEqual(2);
    expect(editBtn).not.toBeNull();
    expect(deleteBtn).not.toBeNull();
  });

  it('hides edit and delete buttons when is_default=1', () => {
    const { queryByLabelText } = render(
      <CategoryRow
        category={makeCategory({ is_default: 1 })}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    expect(queryByLabelText('Edit category')).toBeNull();
    expect(queryByLabelText('Delete category')).toBeNull();
  });

  it('hides edit and delete for a seeded "Groceries" category (is_default=1, not just "Other" IDs)', () => {
    const { queryByLabelText } = render(
      <CategoryRow
        category={makeCategory({ id: 'cat_groceries', name: 'Groceries', is_default: 1 })}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    expect(queryByLabelText('Edit category')).toBeNull();
    expect(queryByLabelText('Delete category')).toBeNull();
  });

  it('hides edit and delete for cat_other_expense (is_default=1)', () => {
    const { queryByLabelText } = render(
      <CategoryRow
        category={makeCategory({ id: 'cat_other_expense', name: 'Other', is_default: 1 })}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    expect(queryByLabelText('Edit category')).toBeNull();
    expect(queryByLabelText('Delete category')).toBeNull();
  });

  it('hides edit and delete for cat_other_income (is_default=1)', () => {
    const { queryByLabelText } = render(
      <CategoryRow
        category={makeCategory({ id: 'cat_other_income', name: 'Other Income', is_default: 1 })}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    expect(queryByLabelText('Edit category')).toBeNull();
    expect(queryByLabelText('Delete category')).toBeNull();
  });

  it('shows edit and delete for a custom category with the same name as a default (is_default=0)', () => {
    const { queryByLabelText } = render(
      <CategoryRow
        category={makeCategory({ id: 'custom-001', name: 'Groceries', is_default: 0 })}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    expect(queryByLabelText('Edit category')).not.toBeNull();
    expect(queryByLabelText('Delete category')).not.toBeNull();
  });
});
