import { fireEvent, render } from '@testing-library/react-native';

import {
  FILTER_BADGE_STYLE,
  FILTER_BUTTON_COMPACT_STYLE,
  SEARCH_INPUT_COMPACT_STYLE,
  SearchRow,
} from '@/modules/transactions/screens/transactions/components/search_row';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);

describe('SearchRow', () => {
  it('renders the compact search input and trailing filter button', () => {
    const { getByLabelText } = render(
      <SearchRow value="" onChange={jest.fn()} onOpenFilter={jest.fn()} activeFilterCount={0} />,
    );

    expect(typeof SEARCH_INPUT_COMPACT_STYLE.height).toBe('number');
    expect(SEARCH_INPUT_COMPACT_STYLE).toMatchObject({
      height: FILTER_BUTTON_COMPACT_STYLE.height,
      minHeight: FILTER_BUTTON_COMPACT_STYLE.height,
    });
    expect(typeof FILTER_BUTTON_COMPACT_STYLE.height).toBe('number');
    expect(typeof FILTER_BUTTON_COMPACT_STYLE.width).toBe('number');
    expect(typeof FILTER_BUTTON_COMPACT_STYLE.borderRadius).toBe('number');
    expect(getByLabelText('Search transactions…')).toHaveProp('accessibilityRole', 'search');
    expect(getByLabelText('Search transactions…')).toHaveProp('style', SEARCH_INPUT_COMPACT_STYLE);
    expect(getByLabelText('Filter')).toHaveProp('style', FILTER_BUTTON_COMPACT_STYLE);
  });

  it('shows the active-filter badge only when advanced filters are applied', () => {
    const empty = render(
      <SearchRow value="" onChange={jest.fn()} onOpenFilter={jest.fn()} activeFilterCount={0} />,
    );
    expect(empty.queryByText('2')).toBeNull();

    const active = render(
      <SearchRow value="" onChange={jest.fn()} onOpenFilter={jest.fn()} activeFilterCount={2} />,
    );
    expect(active.getByText('2')).toBeTruthy();
    expect(FILTER_BADGE_STYLE.top).toBeGreaterThanOrEqual(0);
    expect(FILTER_BADGE_STYLE.right).toBeGreaterThanOrEqual(0);
    expect(active.getByTestId('filter-badge')).toBeTruthy();
    expect(active.getByLabelText('Filter, 2 active')).toBeTruthy();
  });

  it('keeps stable search geometry when search has text', () => {
    const active = render(
      <SearchRow
        value="coffee"
        onChange={jest.fn()}
        onOpenFilter={jest.fn()}
        activeFilterCount={0}
      />,
    );

    expect(active.getByLabelText('Search transactions…')).toHaveProp(
      'style',
      SEARCH_INPUT_COMPACT_STYLE,
    );
  });

  it('routes search changes and clearing through the controlled handler', () => {
    const onChange = jest.fn();
    const onOpenFilter = jest.fn();
    const { getByLabelText } = render(
      <SearchRow
        value="coffee"
        onChange={onChange}
        onOpenFilter={onOpenFilter}
        activeFilterCount={1}
      />,
    );

    fireEvent.changeText(getByLabelText('Search transactions…'), 'rent');
    expect(onChange).toHaveBeenCalledWith('rent');

    fireEvent.press(getByLabelText('Clear search'));
    expect(onChange).toHaveBeenLastCalledWith('');

    fireEvent.press(getByLabelText('Filter, 1 active'));
    expect(onOpenFilter).toHaveBeenCalled();
  });
});
