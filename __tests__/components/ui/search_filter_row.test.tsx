import { fireEvent, render } from '@testing-library/react-native';
import { Dimensions } from 'react-native';

import { SearchFilterRow } from '@/components/ui/search_filter_row';
import { resolveSearchFilterRowGeometry } from '@/components/ui/search_filter_row.geometry';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);

const geometry = resolveSearchFilterRowGeometry(Dimensions.get('window').fontScale);
const inputStyle = { ...geometry.input, ...geometry.inputText };

describe('SearchFilterRow', () => {
  it('renders compact input and trailing filter button', async () => {
    const { getByLabelText } = await render(
      <SearchFilterRow
        value=""
        placeholder="Search items..."
        onChangeText={jest.fn()}
        onOpenFilter={jest.fn()}
        activeFilterCount={0}
        filterBadgeTestID="shared-filter-badge"
      />,
    );

    expect(geometry.input).toMatchObject({
      height: geometry.filterButton.height,
      minHeight: geometry.filterButton.height,
    });
    expect(getByLabelText('Search items...')).toHaveProp('accessibilityRole', 'search');
    expect(getByLabelText('Search items...')).toHaveProp('value', '');
    expect(getByLabelText('Search items...')).toHaveProp('style', inputStyle);
    expect(getByLabelText('Filter')).toHaveProp('style', geometry.filterButton);
  });

  it('shows active badge only when filter count is positive', async () => {
    const empty = await render(
      <SearchFilterRow
        value=""
        placeholder="Search items..."
        onChangeText={jest.fn()}
        onOpenFilter={jest.fn()}
        activeFilterCount={0}
        filterBadgeTestID="shared-filter-badge"
      />,
    );
    expect(empty.queryByTestId('shared-filter-badge')).toBeNull();

    const active = await render(
      <SearchFilterRow
        value=""
        placeholder="Search items..."
        onChangeText={jest.fn()}
        onOpenFilter={jest.fn()}
        activeFilterCount={3}
        filterBadgeTestID="shared-filter-badge"
      />,
    );
    expect(active.getByText('3')).toBeTruthy();
    expect(active.getByTestId('shared-filter-badge')).toHaveProp('style', geometry.badge);
    expect(active.getByLabelText('Filter, 3 active')).toBeTruthy();
  });

  it('keeps stable search geometry when the clear action is present', async () => {
    const active = await render(
      <SearchFilterRow
        value="rent"
        placeholder="Search items..."
        onChangeText={jest.fn()}
        onOpenFilter={jest.fn()}
        activeFilterCount={0}
        filterBadgeTestID="shared-filter-badge"
      />,
    );

    expect(active.getByLabelText('Search items...')).toHaveProp('style', inputStyle);
    expect(active.getByLabelText('Clear search')).toBeTruthy();
  });

  it('routes typing and clearing through the controlled change callback', async () => {
    const onChangeText = jest.fn();
    const onOpenFilter = jest.fn();
    const { getByLabelText } = await render(
      <SearchFilterRow
        value="rent"
        placeholder="Search items..."
        onChangeText={onChangeText}
        onOpenFilter={onOpenFilter}
        activeFilterCount={1}
        filterBadgeTestID="shared-filter-badge"
      />,
    );

    await fireEvent.changeText(getByLabelText('Search items...'), 'gym');
    expect(onChangeText).toHaveBeenCalledWith('gym');

    await fireEvent.press(getByLabelText('Clear search'));
    expect(onChangeText).toHaveBeenLastCalledWith('');

    await fireEvent.press(getByLabelText('Filter, 1 active'));
    expect(onOpenFilter).toHaveBeenCalled();
  });
});
