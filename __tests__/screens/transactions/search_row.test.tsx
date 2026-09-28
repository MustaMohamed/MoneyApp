import { fireEvent, render } from '@testing-library/react-native';
import { Dimensions } from 'react-native';

import { resolveSearchFilterRowGeometry } from '@/components/ui/search_filter_row.geometry';
import { SearchRow } from '@/modules/transactions/screens/transactions/components/search_row';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);

const geometry = resolveSearchFilterRowGeometry(Dimensions.get('window').fontScale);
const inputStyle = { ...geometry.input, ...geometry.inputText };

describe('SearchRow', () => {
  it('renders the compact search input and trailing filter button', async () => {
    const { getByLabelText } = await render(
      <SearchRow value="" onChange={jest.fn()} onOpenFilter={jest.fn()} activeFilterCount={0} />,
    );

    expect(typeof geometry.input.height).toBe('number');
    expect(geometry.input).toMatchObject({
      height: geometry.filterButton.height,
      minHeight: geometry.filterButton.height,
    });
    expect(typeof geometry.filterButton.height).toBe('number');
    expect(typeof geometry.filterButton.width).toBe('number');
    expect(typeof geometry.filterButton.borderRadius).toBe('number');
    expect(getByLabelText('Search transactions')).toHaveProp('accessibilityRole', 'search');
    expect(getByLabelText('Search transactions')).toHaveProp('style', inputStyle);
    expect(getByLabelText('Filter')).toHaveProp('style', geometry.filterButton);
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
    expect(geometry.badge.top).toBeGreaterThanOrEqual(0);
    expect(geometry.badge.right).toBeGreaterThanOrEqual(0);
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

    expect(active.getByLabelText('Search transactions')).toHaveProp('style', inputStyle);
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

    await fireEvent.changeText(getByLabelText('Search transactions'), 'rent');
    expect(onChange).toHaveBeenCalledWith('rent');

    await fireEvent.press(getByLabelText('Clear search'));
    expect(onChange).toHaveBeenLastCalledWith('');

    await fireEvent.press(getByLabelText('Filter, 1 active'));
    expect(onOpenFilter).toHaveBeenCalled();
  });
});
