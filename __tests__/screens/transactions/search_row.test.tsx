import { fireEvent, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import type { PressableProps } from 'react-native';

import {
  FILTER_BUTTON_COMPACT_STYLE,
  SEARCH_INPUT_COMPACT_STYLE,
  SearchRow,
} from '@/modules/transactions/screens/transactions/components/search_row';

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

describe('SearchRow', () => {
  it('renders the compact search input and trailing filter button', () => {
    const { getByLabelText } = render(
      <SearchRow
        value=""
        onChange={jest.fn()}
        onClear={jest.fn()}
        onOpenFilter={jest.fn()}
        activeFilterCount={0}
      />,
    );

    expect(SEARCH_INPUT_COMPACT_STYLE).toMatchObject({ height: expect.any(Number) });
    expect(FILTER_BUTTON_COMPACT_STYLE).toMatchObject({
      height: expect.any(Number),
      width: expect.any(Number),
      borderRadius: expect.any(Number),
    });
    expect(getByLabelText('Search transactions…').props.style).toEqual(SEARCH_INPUT_COMPACT_STYLE);
    expect(getByLabelText('Filter').props.style).toEqual(FILTER_BUTTON_COMPACT_STYLE);
  });

  it('shows the active-filter badge only when advanced filters are applied', () => {
    const empty = render(
      <SearchRow
        value=""
        onChange={jest.fn()}
        onClear={jest.fn()}
        onOpenFilter={jest.fn()}
        activeFilterCount={0}
      />,
    );
    expect(empty.queryByText('2')).toBeNull();

    const active = render(
      <SearchRow
        value=""
        onChange={jest.fn()}
        onClear={jest.fn()}
        onOpenFilter={jest.fn()}
        activeFilterCount={2}
      />,
    );
    expect(active.getByText('2')).toBeTruthy();
    expect(active.getByLabelText('Filter, 2 active')).toBeTruthy();
  });

  it('calls search, clear, and open-filter handlers', () => {
    const onChange = jest.fn();
    const onClear = jest.fn();
    const onOpenFilter = jest.fn();
    const { getByLabelText } = render(
      <SearchRow
        value="coffee"
        onChange={onChange}
        onClear={onClear}
        onOpenFilter={onOpenFilter}
        activeFilterCount={1}
      />,
    );

    fireEvent.changeText(getByLabelText('Search transactions…'), 'rent');
    expect(onChange).toHaveBeenCalledWith('rent');

    fireEvent.press(getByLabelText('Clear search'));
    expect(onClear).toHaveBeenCalled();

    fireEvent.press(getByLabelText('Filter, 1 active'));
    expect(onOpenFilter).toHaveBeenCalled();
  });
});
