import { fireEvent, render } from '@testing-library/react-native';

import {
  COMMITMENT_FILTER_BADGE_STYLE,
  COMMITMENT_FILTER_BUTTON_STYLE,
  COMMITMENT_SEARCH_INPUT_STYLE,
  CommitmentSearchRow,
} from '@/modules/commitments/screens/commitments/components/search_row';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);

describe('CommitmentSearchRow', () => {
  it('renders compact input and trailing filter button with matching height', () => {
    const { getByLabelText } = render(
      <CommitmentSearchRow
        value=""
        onChange={jest.fn()}
        onClear={jest.fn()}
        onOpenFilter={jest.fn()}
        activeFilterCount={0}
      />,
    );

    expect(COMMITMENT_SEARCH_INPUT_STYLE).toMatchObject({
      height: COMMITMENT_FILTER_BUTTON_STYLE.height,
      minHeight: COMMITMENT_FILTER_BUTTON_STYLE.height,
    });
    expect(getByLabelText('Search commitments…')).toHaveProp('accessibilityRole', 'search');
    expect(getByLabelText('Search commitments…')).toHaveProp(
      'style',
      COMMITMENT_SEARCH_INPUT_STYLE,
    );
    expect(getByLabelText('Filter')).toHaveProp('style', COMMITMENT_FILTER_BUTTON_STYLE);
  });

  it('shows the active filter badge only when advanced filters are applied', () => {
    const empty = render(
      <CommitmentSearchRow
        value=""
        onChange={jest.fn()}
        onClear={jest.fn()}
        onOpenFilter={jest.fn()}
        activeFilterCount={0}
      />,
    );
    expect(empty.queryByText('2')).toBeNull();

    const active = render(
      <CommitmentSearchRow
        value=""
        onChange={jest.fn()}
        onClear={jest.fn()}
        onOpenFilter={jest.fn()}
        activeFilterCount={2}
      />,
    );
    expect(COMMITMENT_FILTER_BADGE_STYLE.top).toBeGreaterThanOrEqual(0);
    expect(COMMITMENT_FILTER_BADGE_STYLE.right).toBeGreaterThanOrEqual(0);
    expect(active.getByText('2')).toBeTruthy();
    expect(active.getByTestId('commitment-filter-badge')).toBeTruthy();
    expect(active.getByLabelText('Filter, 2 active')).toBeTruthy();
  });

  it('keeps stable search geometry when search has text', () => {
    const active = render(
      <CommitmentSearchRow
        value="rent"
        onChange={jest.fn()}
        onClear={jest.fn()}
        onOpenFilter={jest.fn()}
        activeFilterCount={0}
      />,
    );

    expect(active.getByLabelText('Search commitments…')).toHaveProp(
      'style',
      COMMITMENT_SEARCH_INPUT_STYLE,
    );
  });

  it('calls search, clear, and open-filter handlers', () => {
    const onChange = jest.fn();
    const onClear = jest.fn();
    const onOpenFilter = jest.fn();
    const { getByLabelText } = render(
      <CommitmentSearchRow
        value="rent"
        onChange={onChange}
        onClear={onClear}
        onOpenFilter={onOpenFilter}
        activeFilterCount={1}
      />,
    );

    fireEvent.changeText(getByLabelText('Search commitments…'), 'gym');
    expect(onChange).toHaveBeenCalledWith('gym');

    fireEvent.press(getByLabelText('Clear search'));
    expect(onClear).toHaveBeenCalled();

    fireEvent.press(getByLabelText('Filter, 1 active'));
    expect(onOpenFilter).toHaveBeenCalled();
  });
});
