import { fireEvent, render } from '@testing-library/react-native';

import {
  FILTER_BADGE_STYLE,
  FILTER_BUTTON_COMPACT_STYLE,
  SEARCH_INPUT_COMPACT_STYLE,
  SearchRow,
} from '@/modules/transactions/screens/transactions/components/search_row';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);

describe('SearchRow', () => {
  it('renders the compact search input and trailing filter button', async () => {
    const { getByLabelText } = await render(
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

  it('shows the active-filter badge only when advanced filters are applied', async () => {
    const empty = await render(
      <SearchRow value="" onChange={jest.fn()} onOpenFilter={jest.fn()} activeFilterCount={0} />,
    );
    expect(empty.queryByText('2')).toBeNull();

    const active = await render(
      <SearchRow value="" onChange={jest.fn()} onOpenFilter={jest.fn()} activeFilterCount={2} />,
    );
    expect(active.getByText('2')).toBeTruthy();
    expect(FILTER_BADGE_STYLE.top).toBeGreaterThanOrEqual(0);
    expect(FILTER_BADGE_STYLE.right).toBeGreaterThanOrEqual(0);
    expect(active.getByTestId('filter-badge')).toBeTruthy();
    expect(active.getByLabelText('Filter, 2 active')).toBeTruthy();
  });

  it('keeps stable search geometry when search has text', async () => {
    const active = await render(
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

  it('routes search changes and clearing through the controlled handler', async () => {
    const onChange = jest.fn();
    const onOpenFilter = jest.fn();
    const { getByLabelText } = await render(
      <SearchRow
        value="coffee"
        onChange={onChange}
        onOpenFilter={onOpenFilter}
        activeFilterCount={1}
      />,
    );

    await fireEvent.changeText(getByLabelText('Search transactions…'), 'rent');
    expect(onChange).toHaveBeenCalledWith('rent');

    await fireEvent.press(getByLabelText('Clear search'));
    expect(onChange).toHaveBeenLastCalledWith('');

    await fireEvent.press(getByLabelText('Filter, 1 active'));
    expect(onOpenFilter).toHaveBeenCalled();
  });
});
