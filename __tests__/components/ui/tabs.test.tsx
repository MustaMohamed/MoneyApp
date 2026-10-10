import { render, within } from '@testing-library/react-native';
import type { ComponentProps, ReactNode } from 'react';
import { Dimensions, StyleSheet } from 'react-native';

import {
  SOLID_GOLD_SELECTED_RADIUS,
  SOLID_GOLD_TRACK_RADIUS,
  SegmentedTabs,
} from '@/components/ui/tabs';
import {
  TABS_LIST_PADDING,
  resolveSegmentedTabsGeometry,
  resolveTabsScrollSlopInset,
  type TabsTriggerHitSlop,
} from '@/components/ui/tabs.geometry';
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

const TRIGGER_HIT_SLOP = { top: 7, bottom: 10 };
const UNDER_PADDING_HIT_SLOP = { top: 1, bottom: 2 };

function scrollSlopInset(triggerHitSlop: TabsTriggerHitSlop): TabsTriggerHitSlop {
  const inset = resolveTabsScrollSlopInset(triggerHitSlop);
  if (inset === undefined) {
    throw new Error('resolveTabsScrollSlopInset returned no inset for a set slop');
  }
  return inset;
}

describe('SegmentedTabs', () => {
  it('keeps the active indicator inside the scroll view for scrollable layout', async () => {
    const { getByTestId, getByText } = await render(
      <SegmentedTabs
        segments={[...segments]}
        value="all"
        onValueChange={jest.fn()}
        layout="scrollable"
      />,
    );

    expect(within(getByTestId('tabs-scroll-view')).getByTestId('tabs-indicator')).toBeTruthy();
    expect(getByText('Overdue')).not.toHaveStyle({ color: Colors.dark.text2 });
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
    const { getByText } = await render(
      <SegmentedTabs
        segments={[...segments]}
        value="all"
        onValueChange={jest.fn()}
        layout="scrollable"
        density="compact"
      />,
    );

    const compactLabel = resolveSegmentedTabsGeometry(Dimensions.get('window').fontScale).compact
      .label;
    expect(getByText('All')).toHaveStyle(compactLabel);
    expect(getByText('All')).toHaveProp('allowFontScaling', false);
    expect(getByText('All')).toHaveProp('numberOfLines', 1);
    // Weight has no style form here: the family class is its only expression (ui.md § Fonts), so these two stay on className (tests.md:28).
    expect(getByText('All')).toHaveProp('className', 'font-inter-bold');
    expect(getByText('Overdue')).toHaveStyle(compactLabel);
    expect(getByText('Overdue')).not.toHaveProp('className', 'font-inter-bold');
    expect(getByText('Overdue')).toHaveStyle({ color: Colors.dark.text2 });
    expect(getByText('All')).not.toHaveStyle({ color: Colors.dark.text2 });
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
    expect(getByTestId('tabs-trigger-all')).toHaveStyle({
      height: resolveSegmentedTabsGeometry(Dimensions.get('window').fontScale).compact
        .triggerHeight,
    });
    expect(getByTestId('tabs-indicator')).toHaveStyle({
      backgroundColor: Colors.shared.cairoGold,
      borderRadius: Radius.lg,
    });
  });

  it('MA-109: a trigger hit slop grows a scrollable row by its resolved inset, and a row without one or a fixed row keeps its styles', async () => {
    const { getByTestId, rerender } = await render(
      <SegmentedTabs
        segments={[...segments]}
        value="all"
        onValueChange={jest.fn()}
        layout="scrollable"
      />,
    );

    const bareScrollView = getByTestId('tabs-scroll-view');
    const bareScrollContentStyle: unknown =
      StyleSheet.flatten(bareScrollView.props.contentContainerStyle) ?? {};
    expect(bareScrollContentStyle).not.toHaveProperty('paddingTop');
    expect(bareScrollContentStyle).not.toHaveProperty('paddingBottom');
    const bareScrollStyle: unknown = StyleSheet.flatten(bareScrollView.props.style) ?? {};
    expect(bareScrollStyle).not.toHaveProperty('marginTop');
    expect(bareScrollStyle).not.toHaveProperty('marginBottom');
    expect(getByTestId('tabs-trigger-all').props.hitSlop).toBeUndefined();
    expect(getByTestId('tabs-trigger-overdue').props.hitSlop).toBeUndefined();

    const expectGrownScrollBox = async (triggerHitSlop: TabsTriggerHitSlop) => {
      await rerender(
        <SegmentedTabs
          segments={[...segments]}
          value="all"
          onValueChange={jest.fn()}
          layout="scrollable"
          triggerHitSlop={triggerHitSlop}
        />,
      );

      const inset = scrollSlopInset(triggerHitSlop);
      const scrollView = getByTestId('tabs-scroll-view');
      expect(scrollView).toHaveStyle({ marginTop: -inset.top, marginBottom: -inset.bottom });
      expect(StyleSheet.flatten(scrollView.props.contentContainerStyle)).toMatchObject({
        paddingTop: inset.top,
        paddingBottom: inset.bottom,
      });
      expect(getByTestId('tabs-indicator')).toHaveStyle({ top: inset.top });
      expect(getByTestId('tabs-trigger-all').props.hitSlop).toBe(triggerHitSlop);
      expect(getByTestId('tabs-trigger-overdue').props.hitSlop).toBe(triggerHitSlop);
    };

    await expectGrownScrollBox(TRIGGER_HIT_SLOP);
    await expectGrownScrollBox(UNDER_PADDING_HIT_SLOP);

    await rerender(
      <SegmentedTabs
        segments={[...segments]}
        value="all"
        onValueChange={jest.fn()}
        layout="scrollable"
        variant="solid-gold"
        triggerHitSlop={TRIGGER_HIT_SLOP}
      />,
    );

    const inset = scrollSlopInset(TRIGGER_HIT_SLOP);
    const innerTrackRadius = SOLID_GOLD_TRACK_RADIUS - TABS_LIST_PADDING;
    expect(getByTestId('tabs-scroll-view')).toHaveStyle({
      marginTop: -inset.top,
      marginBottom: -inset.bottom,
      borderTopLeftRadius: innerTrackRadius + inset.top,
      borderTopRightRadius: innerTrackRadius + inset.top,
      borderBottomLeftRadius: innerTrackRadius + inset.bottom,
      borderBottomRightRadius: innerTrackRadius + inset.bottom,
    });
    expect(getByTestId('tabs-indicator')).toHaveStyle({ top: inset.top });

    const listStyle = {
      height: resolveSegmentedTabsGeometry(Dimensions.get('window').fontScale).compact.listHeight,
    };
    await rerender(
      <SegmentedTabs
        segments={[...segments]}
        value="all"
        onValueChange={jest.fn()}
        layout="fixed"
        variant="solid-gold"
        density="compact"
        listStyle={listStyle}
      />,
    );

    const fixedListStyle: unknown = getByTestId('tabs-list').props.style;
    const fixedSelectedStyle: unknown = getByTestId('tabs-trigger-all').props.style;
    const fixedIdleStyle: unknown = getByTestId('tabs-trigger-overdue').props.style;
    const fixedIndicatorStyle: unknown = getByTestId('tabs-indicator').props.style;

    await rerender(
      <SegmentedTabs
        segments={[...segments]}
        value="all"
        onValueChange={jest.fn()}
        layout="fixed"
        variant="solid-gold"
        density="compact"
        listStyle={listStyle}
        triggerHitSlop={TRIGGER_HIT_SLOP}
      />,
    );

    expect(getByTestId('tabs-list')).toHaveStyle(listStyle);
    expect(getByTestId('tabs-list').props.style).toEqual(fixedListStyle);
    expect(getByTestId('tabs-indicator').props.style).toEqual(fixedIndicatorStyle);
    expect(getByTestId('tabs-trigger-all').props.style).toEqual(fixedSelectedStyle);
    expect(getByTestId('tabs-trigger-overdue').props.style).toEqual(fixedIdleStyle);
    expect(getByTestId('tabs-trigger-all').props.hitSlop).toBe(TRIGGER_HIT_SLOP);
    expect(getByTestId('tabs-trigger-overdue').props.hitSlop).toBe(TRIGGER_HIT_SLOP);
  });
});
