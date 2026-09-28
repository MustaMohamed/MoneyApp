import { fireEvent, render } from '@testing-library/react-native';
import { Dimensions } from 'react-native';

import { resolveSearchFilterRowGeometry } from '@/components/ui/search_filter_row.geometry';
import { CommitmentSearchRow } from '@/modules/commitments/screens/commitments/components/search_row';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);

const geometry = resolveSearchFilterRowGeometry(Dimensions.get('window').fontScale);
const inputStyle = { ...geometry.input, ...geometry.inputText };

describe('CommitmentSearchRow', () => {
  it('renders compact input and trailing filter button with matching height', async () => {
    const { getByLabelText } = await render(
      <CommitmentSearchRow
        value=""
        onChange={jest.fn()}
        onOpenFilter={jest.fn()}
        activeFilterCount={0}
      />,
    );

    expect(geometry.input).toMatchObject({
      height: geometry.filterButton.height,
      minHeight: geometry.filterButton.height,
    });
    expect(getByLabelText('Search commitments…')).toHaveProp('accessibilityRole', 'search');
    expect(getByLabelText('Search commitments…')).toHaveProp('style', inputStyle);
    expect(getByLabelText('Filter')).toHaveProp('style', geometry.filterButton);
  });

  it('shows the active filter badge only when advanced filters are applied', async () => {
    const empty = await render(
      <CommitmentSearchRow
        value=""
        onChange={jest.fn()}
        onOpenFilter={jest.fn()}
        activeFilterCount={0}
      />,
    );
    expect(empty.queryByText('2')).toBeNull();

    const active = await render(
      <CommitmentSearchRow
        value=""
        onChange={jest.fn()}
        onOpenFilter={jest.fn()}
        activeFilterCount={2}
      />,
    );
    expect(geometry.badge.top).toBeGreaterThanOrEqual(0);
    expect(geometry.badge.right).toBeGreaterThanOrEqual(0);
    expect(active.getByText('2')).toBeTruthy();
    expect(active.getByTestId('commitment-filter-badge')).toBeTruthy();
    expect(active.getByLabelText('Filter, 2 active')).toBeTruthy();
  });

  it('keeps stable search geometry when search has text', async () => {
    const active = await render(
      <CommitmentSearchRow
        value="rent"
        onChange={jest.fn()}
        onOpenFilter={jest.fn()}
        activeFilterCount={0}
      />,
    );

    expect(active.getByLabelText('Search commitments…')).toHaveProp('style', inputStyle);
  });

  it('routes search changes and clearing through the controlled handler', async () => {
    const onChange = jest.fn();
    const onOpenFilter = jest.fn();
    const { getByLabelText } = await render(
      <CommitmentSearchRow
        value="rent"
        onChange={onChange}
        onOpenFilter={onOpenFilter}
        activeFilterCount={1}
      />,
    );

    await fireEvent.changeText(getByLabelText('Search commitments…'), 'gym');
    expect(onChange).toHaveBeenCalledWith('gym');

    await fireEvent.press(getByLabelText('Clear search'));
    expect(onChange).toHaveBeenLastCalledWith('');

    await fireEvent.press(getByLabelText('Filter, 1 active'));
    expect(onOpenFilter).toHaveBeenCalled();
  });
});
