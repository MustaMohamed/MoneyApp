import { fireEvent, render } from '@testing-library/react-native';

import { SegmentFilter } from '@/components/ui/segment_filter';

jest.mock('@/components/ui/tabs', () => ({
  SegmentedTabs: ({
    segments,
    onValueChange,
    accessibilityLabel,
  }: {
    segments: ReadonlyArray<{ value: string; label: string; accessibilityLabel?: string }>;
    onValueChange: (value: string) => void;
    accessibilityLabel?: string;
  }) => {
    const { Pressable, Text, View } =
      jest.requireActual<typeof import('react-native')>('react-native');
    return (
      <View accessibilityLabel={accessibilityLabel}>
        {segments.map((segment) => (
          <Pressable
            key={segment.value}
            accessibilityRole="tab"
            accessibilityLabel={segment.accessibilityLabel ?? segment.label}
            onPress={() => onValueChange(segment.value)}
          >
            <Text>{segment.label}</Text>
          </Pressable>
        ))}
      </View>
    );
  },
}));

const filters = [
  { value: 'all', label: 'All' },
  { value: 'due', label: 'Due soon', accessibilityLabel: 'Due soon commitments' },
  { value: 'paid', label: 'Paid' },
] as const;

describe('SegmentFilter', () => {
  it('renders every dynamic filter option', () => {
    const { getByLabelText, getByText } = render(
      <SegmentFilter
        selectedFilter="all"
        onSelectedFilterChange={jest.fn()}
        filters={filters}
        accessibilityLabel="Commitment status filter"
      />,
    );

    expect(getByLabelText('Commitment status filter')).toBeTruthy();
    expect(getByText('All')).toBeTruthy();
    expect(getByText('Due soon')).toBeTruthy();
    expect(getByText('Paid')).toBeTruthy();
  });

  it('selects a dynamic filter by value', () => {
    const onSelectedFilterChange = jest.fn();
    const { getByLabelText } = render(
      <SegmentFilter
        selectedFilter="all"
        onSelectedFilterChange={onSelectedFilterChange}
        filters={filters}
        accessibilityLabel="Commitment status filter"
      />,
    );

    fireEvent.press(getByLabelText('Due soon commitments'));
    expect(onSelectedFilterChange).toHaveBeenCalledWith('due');
  });
});
