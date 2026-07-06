import { fireEvent, render } from '@testing-library/react-native';

import { SegmentFilter } from '@/components/ui/segment_filter';

jest.mock('@/components/ui/tabs', () => ({
  SegmentedTabs: ({
    segments,
    onValueChange,
    accessibilityLabel,
    segmentWidth,
    scrollAlign,
    density,
  }: {
    segments: ReadonlyArray<{
      value: string;
      label: string;
      accessibilityLabel?: string;
      icon?: { name: string; color: string };
    }>;
    onValueChange: (value: string) => void;
    accessibilityLabel?: string;
    segmentWidth?: number;
    scrollAlign?: string;
    density?: string;
  }) => {
    const { Pressable, Text, View } =
      jest.requireActual<typeof import('react-native')>('react-native');
    return (
      <View accessibilityLabel={accessibilityLabel} testID="segment-filter-tabs">
        <Text testID={segmentWidth ? 'segment-filter-width-set' : 'segment-filter-width-missing'}>
          {String(segmentWidth)}
        </Text>
        <Text testID="segment-filter-scroll-align">{scrollAlign}</Text>
        <Text testID="segment-filter-density">{density}</Text>
        {segments.map((segment) => (
          <Pressable
            key={segment.value}
            accessibilityRole="tab"
            accessibilityLabel={segment.accessibilityLabel ?? segment.label}
            onPress={() => onValueChange(segment.value)}
          >
            {segment.icon ? (
              <Text testID={`segment-icon-${segment.value}`}>{segment.icon.name}</Text>
            ) : null}
            <Text>{segment.label}</Text>
          </Pressable>
        ))}
      </View>
    );
  },
}));

const filters = [
  { value: 'all', label: 'All' },
  {
    value: 'due',
    label: 'Due soon',
    accessibilityLabel: 'Due soon commitments',
    icon: { name: 'calendar-clock-outline', color: '#D4A44C' },
  },
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

  it('forwards icon metadata and equal segment width to the shared tabs', () => {
    const { getByTestId, getByText } = render(
      <SegmentFilter
        selectedFilter="all"
        onSelectedFilterChange={jest.fn()}
        filters={filters}
        accessibilityLabel="Commitment status filter"
      />,
    );

    expect(getByTestId('segment-filter-width-set')).toBeTruthy();
    expect(getByTestId('segment-filter-density')).toHaveTextContent('compact');
    expect(getByText('calendar-clock-outline')).toBeTruthy();
  });

  it('requests minimum scrolling to keep the selected filter visible', () => {
    const { getByText } = render(
      <SegmentFilter
        selectedFilter="paid"
        onSelectedFilterChange={jest.fn()}
        filters={filters}
        accessibilityLabel="Commitment status filter"
      />,
    );

    expect(getByText('visible')).toBeTruthy();
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
