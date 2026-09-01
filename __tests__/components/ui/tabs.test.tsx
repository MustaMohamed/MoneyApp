import { render, within } from '@testing-library/react-native';
import type { ComponentProps, ReactNode } from 'react';

import { SOLID_GOLD_SELECTED_RADIUS, SegmentedTabs } from '@/components/ui/tabs';
import { Colors, Radius } from '@/constants/theme';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');

  function MockMaterialCommunityIcons({
    name,
    color,
  }: {
    name: string;
    color?: string;
    size?: number;
  }) {
    return (
      <Text testID={`tab-icon-${name}`} style={{ color }}>
        {name}
      </Text>
    );
  }

  return MockMaterialCommunityIcons;
});

jest.mock('heroui-native', () => {
  const { Text, View } = jest.requireActual<typeof import('react-native')>('react-native');

  type MockViewProps = ComponentProps<typeof View>;
  type MockTextProps = ComponentProps<typeof Text>;
  type MockRootProps = MockViewProps & {
    value?: string;
    onValueChange?: (value: string) => void;
    variant?: string;
    animation?: string;
  };
  type MockTriggerProps = MockViewProps & {
    value: string;
    isDisabled?: boolean;
    accessibilityLabel?: string;
    children?: ReactNode;
  };

  function Tabs({
    children,
    value: _value,
    onValueChange: _onValueChange,
    ...props
  }: MockRootProps) {
    return (
      <View testID="tabs-root" {...props}>
        {children}
      </View>
    );
  }

  Tabs.List = ({ children, ...props }: MockViewProps) => (
    <View testID="tabs-list" {...props}>
      {children}
    </View>
  );
  Tabs.ScrollView = ({ children, ...props }: MockViewProps) => (
    <View testID="tabs-scroll-view" {...props}>
      {children}
    </View>
  );
  Tabs.Indicator = (props: MockViewProps) => <View testID="tabs-indicator" {...props} />;
  Tabs.Trigger = ({ children, value, isDisabled: _isDisabled, ...props }: MockTriggerProps) => (
    <View testID={`tabs-trigger-${value}`} {...props}>
      {children}
    </View>
  );
  Tabs.Label = ({ children, ...props }: MockTextProps) => <Text {...props}>{children}</Text>;

  return {
    Tabs,
    cn: (...args: unknown[]) => args.filter(Boolean).flat().join(' '),
  };
});

const segments = [
  { value: 'all', label: 'All' },
  { value: 'overdue', label: 'Overdue' },
] as const;

describe('SegmentedTabs', () => {
  it('keeps the active indicator inside the scroll view for scrollable layout', async () => {
    const { getByTestId } = await render(
      <SegmentedTabs
        segments={[...segments]}
        value="all"
        onValueChange={jest.fn()}
        layout="scrollable"
      />,
    );

    expect(within(getByTestId('tabs-scroll-view')).getByTestId('tabs-indicator')).toBeTruthy();
  });

  it('applies a fixed width to every scrollable segment when provided', async () => {
    const { getByTestId } = await render(
      <SegmentedTabs
        segments={[...segments]}
        value="all"
        onValueChange={jest.fn()}
        layout="scrollable"
        segmentWidth={96}
      />,
    );

    expect(getByTestId('tabs-trigger-all')).toMatchObject({ props: { style: { width: 96 } } });
    expect(getByTestId('tabs-trigger-overdue')).toMatchObject({
      props: { style: { width: 96 } },
    });
  });

  it('uses local visible-scroll behavior instead of HeroUI edge alignment', async () => {
    const { getByTestId } = await render(
      <SegmentedTabs
        segments={[...segments]}
        value="overdue"
        onValueChange={jest.fn()}
        layout="scrollable"
        scrollAlign="visible"
        segmentWidth={96}
      />,
    );

    expect(getByTestId('tabs-scroll-view')).toHaveProp('scrollAlign', 'none');
    expect(getByTestId('tabs-scroll-view')).toHaveProp('scrollEventThrottle', 16);
    expect(getByTestId('tabs-scroll-view')).toHaveProp('onScroll', expect.any(Function));
    expect(getByTestId('tabs-scroll-view')).toHaveProp('onLayout', expect.any(Function));
  });

  it('renders compact segments with tighter spacing and a bolder selected label', async () => {
    const { getByTestId, getByText } = await render(
      <SegmentedTabs
        segments={[...segments]}
        value="all"
        onValueChange={jest.fn()}
        layout="scrollable"
        density="compact"
      />,
    );

    expect(getByTestId('tabs-trigger-all')).toHaveProp(
      'className',
      expect.stringContaining('px-1.5'),
    );
    expect(getByTestId('tabs-trigger-all')).toHaveProp('className', expect.stringContaining('h-7'));
    expect(getByTestId('tabs-trigger-all')).toHaveProp(
      'className',
      expect.stringContaining('rounded-full'),
    );
    expect(getByTestId('tabs-trigger-all')).toHaveProp(
      'className',
      expect.stringContaining('gap-0.5'),
    );
    expect(getByText('All')).toHaveProp('className', 'font-inter-bold text-[11px]');
    expect(getByText('Overdue')).toHaveProp('className', 'text-[11px]');
    expect(getByText('Overdue')).not.toHaveProp('className', 'font-inter-bold');
  });

  it('renders optional colored leading icons', async () => {
    const { getByTestId } = await render(
      <SegmentedTabs
        segments={[
          {
            value: 'income',
            label: 'Income',
            icon: { name: 'arrow-down-circle-outline', color: '#4CAF82' },
          },
        ]}
        value="income"
        onValueChange={jest.fn()}
      />,
    );

    expect(getByTestId('tab-icon-arrow-down-circle-outline')).toMatchObject({
      props: { style: { color: '#4CAF82' } },
    });
  });

  it('uses selected label color for selected solid-gold icons', async () => {
    const { getByTestId } = await render(
      <SegmentedTabs
        segments={[
          {
            value: 'all',
            label: 'All',
            icon: { name: 'view-grid', color: '#6B7F99' },
          },
        ]}
        value="all"
        onValueChange={jest.fn()}
        variant="solid-gold"
      />,
    );

    expect(getByTestId('tab-icon-view-grid')).toHaveProp('style', {
      color: Colors.shared.midnightBlue,
    });
  });

  it('paints the selected solid-gold trigger immediately while the indicator settles', async () => {
    const { getByTestId } = await render(
      <SegmentedTabs
        segments={[...segments]}
        value="all"
        onValueChange={jest.fn()}
        layout="scrollable"
        variant="solid-gold"
      />,
    );

    expect(getByTestId('tabs-trigger-all')).toHaveProp('style', {
      backgroundColor: Colors.shared.cairoGold,
      borderRadius: SOLID_GOLD_SELECTED_RADIUS,
    });
    expect(getByTestId('tabs-trigger-overdue')).not.toHaveProp('style');
  });

  it('keeps the solid-gold indicator rounded', async () => {
    const { getByTestId } = await render(
      <SegmentedTabs
        segments={[...segments]}
        value="all"
        onValueChange={jest.fn()}
        layout="scrollable"
        variant="solid-gold"
      />,
    );

    expect(getByTestId('tabs-indicator')).toHaveProp('style', {
      backgroundColor: Colors.shared.cairoGold,
      borderRadius: SOLID_GOLD_SELECTED_RADIUS,
    });
  });

  it('uses a larger compact radius so the selected fill matches the pill border', async () => {
    const { getByTestId } = await render(
      <SegmentedTabs
        segments={[...segments]}
        value="all"
        onValueChange={jest.fn()}
        layout="scrollable"
        variant="solid-gold"
        density="compact"
      />,
    );

    expect(getByTestId('tabs-trigger-all')).toHaveStyle({
      backgroundColor: Colors.shared.cairoGold,
      borderRadius: Radius.lg,
    });
    expect(getByTestId('tabs-indicator')).toHaveStyle({
      backgroundColor: Colors.shared.cairoGold,
      borderRadius: Radius.lg,
    });
  });
});
