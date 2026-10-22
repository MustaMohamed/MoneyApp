import { fireEvent, render } from '@testing-library/react-native';
import { Dimensions } from 'react-native';

import { CHIP_ROW_ROOM_BELOW } from '@/components/ui/account_chips.geometry';
import { SearchFilterRow } from '@/components/ui/search_filter_row';
import {
  resolveSearchFilterRowGeometry,
  resolveSearchRowHitSlop,
} from '@/components/ui/search_filter_row.geometry';
import { HIT_SLOP_UNCLIPPED_STYLE } from '@/constants/theme';
import { SUMMARY_HEADER_MARGIN_BOTTOM } from '@/modules/commitments/screens/commitments/components/summary_header.geometry';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);

const geometry = resolveSearchFilterRowGeometry(Dimensions.get('window').fontScale);

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
        topRoom={CHIP_ROW_ROOM_BELOW}
      />,
    );

    expect(getByLabelText('Search items...')).toHaveProp('accessibilityRole', 'search');
    expect(getByLabelText('Search items...')).toHaveProp('value', '');
    expect(getByLabelText('Search items...')).toHaveProp('style', geometry.inputStyle);
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
        topRoom={CHIP_ROW_ROOM_BELOW}
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
        topRoom={CHIP_ROW_ROOM_BELOW}
      />,
    );
    expect(active.getByText('3')).toHaveProp('allowFontScaling', false);
    expect(active.getByText('3')).toHaveProp('numberOfLines', 1);
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
        topRoom={CHIP_ROW_ROOM_BELOW}
      />,
    );

    expect(active.getByLabelText('Search items...')).toHaveProp('style', geometry.inputStyle);
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
        topRoom={CHIP_ROW_ROOM_BELOW}
      />,
    );

    await fireEvent.changeText(getByLabelText('Search items...'), 'gym');
    expect(onChangeText).toHaveBeenCalledWith('gym');

    await fireEvent.press(getByLabelText('Clear search'));
    expect(onChangeText).toHaveBeenLastCalledWith('');

    await fireEvent.press(getByLabelText('Filter, 1 active'));
    expect(onOpenFilter).toHaveBeenCalled();
  });

  it.each([
    ['no room above the row', 0],
    ['the summary card gap above the row', SUMMARY_HEADER_MARGIN_BOTTOM],
  ])(
    'MA-236: Filter and clear take the touch-floor slop for %s, unclipped, and the clear presses by scale',
    async (_room, topRoom) => {
      const { getByLabelText } = await render(
        <SearchFilterRow
          value="rent"
          placeholder="Search items..."
          onChangeText={jest.fn()}
          onOpenFilter={jest.fn()}
          activeFilterCount={0}
          filterBadgeTestID="shared-filter-badge"
          topRoom={topRoom}
        />,
      );

      const slop = resolveSearchRowHitSlop(geometry.input.height, topRoom);
      expect(getByLabelText('Filter').props.hitSlop).toEqual(slop.filter);
      expect(getByLabelText('Filter')).toHaveStyle(HIT_SLOP_UNCLIPPED_STYLE);
      expect(getByLabelText('Clear search').props.hitSlop).toEqual(slop.clear);
      expect(getByLabelText('Clear search')).toHaveStyle(HIT_SLOP_UNCLIPPED_STYLE);
      expect(getByLabelText('Clear search')).toHaveProp('feedbackVariant', 'scale');
    },
  );
});
