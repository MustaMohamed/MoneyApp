import { fireEvent, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import type { PressableProps } from 'react-native';

import {
  FILTER_BADGE_STYLE,
  FILTER_BUTTON_COMPACT_STYLE,
  SEARCH_INPUT_COMPACT_STYLE,
  SEARCH_INPUT_WITH_CLEAR_STYLE,
  SearchFilterRow,
} from '@/components/ui/search_filter_row';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('heroui-native', () => {
  const { Pressable } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    PressableFeedback: ({ children, ...props }: PressableProps & { children?: ReactNode }) => (
      <Pressable {...props}>{children}</Pressable>
    ),
    cn: (...args: Array<string | false | null | undefined>) => args.filter(Boolean).join(' '),
  };
});
jest.mock('@/components/ui/input', () => {
  const ReactLocal = jest.requireActual<typeof import('react')>('react');
  const { TextInput } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    Input: (props: object) => ReactLocal.createElement(TextInput, props),
  };
});

describe('SearchFilterRow', () => {
  it('renders compact input and trailing filter button', () => {
    const { getByLabelText } = render(
      <SearchFilterRow
        value=""
        placeholder="Search items..."
        onChangeText={jest.fn()}
        onClear={jest.fn()}
        onOpenFilter={jest.fn()}
        activeFilterCount={0}
        filterBadgeTestID="shared-filter-badge"
      />,
    );

    expect(SEARCH_INPUT_COMPACT_STYLE).toMatchObject({
      height: FILTER_BUTTON_COMPACT_STYLE.height,
      minHeight: FILTER_BUTTON_COMPACT_STYLE.height,
    });
    expect(getByLabelText('Search items...')).toHaveProp('style', SEARCH_INPUT_COMPACT_STYLE);
    expect(getByLabelText('Filter')).toHaveProp('style', FILTER_BUTTON_COMPACT_STYLE);
  });

  it('shows active badge only when filter count is positive', () => {
    const empty = render(
      <SearchFilterRow
        value=""
        placeholder="Search items..."
        onChangeText={jest.fn()}
        onClear={jest.fn()}
        onOpenFilter={jest.fn()}
        activeFilterCount={0}
        filterBadgeTestID="shared-filter-badge"
      />,
    );
    expect(empty.queryByTestId('shared-filter-badge')).toBeNull();

    const active = render(
      <SearchFilterRow
        value=""
        placeholder="Search items..."
        onChangeText={jest.fn()}
        onClear={jest.fn()}
        onOpenFilter={jest.fn()}
        activeFilterCount={3}
        filterBadgeTestID="shared-filter-badge"
      />,
    );
    expect(active.getByText('3')).toBeTruthy();
    expect(active.getByTestId('shared-filter-badge')).toHaveProp('style', FILTER_BADGE_STYLE);
    expect(active.getByLabelText('Filter, 3 active')).toBeTruthy();
  });

  it('reserves clear-action space only when text is present', () => {
    const active = render(
      <SearchFilterRow
        value="rent"
        placeholder="Search items..."
        onChangeText={jest.fn()}
        onClear={jest.fn()}
        onOpenFilter={jest.fn()}
        activeFilterCount={0}
        filterBadgeTestID="shared-filter-badge"
      />,
    );

    expect(SEARCH_INPUT_COMPACT_STYLE.paddingRight).toBeLessThan(
      SEARCH_INPUT_WITH_CLEAR_STYLE.paddingRight,
    );
    expect(active.getByLabelText('Search items...')).toHaveProp(
      'style',
      SEARCH_INPUT_WITH_CLEAR_STYLE,
    );
    expect(active.getByLabelText('Clear search')).toBeTruthy();
  });

  it('calls search, clear, and filter callbacks', () => {
    const onChangeText = jest.fn();
    const onClear = jest.fn();
    const onOpenFilter = jest.fn();
    const { getByLabelText } = render(
      <SearchFilterRow
        value="rent"
        placeholder="Search items..."
        onChangeText={onChangeText}
        onClear={onClear}
        onOpenFilter={onOpenFilter}
        activeFilterCount={1}
        filterBadgeTestID="shared-filter-badge"
      />,
    );

    fireEvent.changeText(getByLabelText('Search items...'), 'gym');
    expect(onChangeText).toHaveBeenCalledWith('gym');

    fireEvent.press(getByLabelText('Clear search'));
    expect(onClear).toHaveBeenCalled();

    fireEvent.press(getByLabelText('Filter, 1 active'));
    expect(onOpenFilter).toHaveBeenCalled();
  });
});
