import { act, fireEvent, render } from '@testing-library/react-native';
import { useEffect, type ReactNode } from 'react';
import { Dimensions, Text, View } from 'react-native';

import { MonthFilter } from '@/components/ui/month_filter';
import {
  MONTH_PICKER_CELL_GAP,
  resolveMonthPillGeometry,
  resolveMonthStepHitSlop,
  resolveMonthYearStepHitSlop,
} from '@/components/ui/month_filter.geometry';
import type { MonthStepSide } from '@/components/ui/month_filter.geometry';
import { Strings } from '@/constants/strings';
import { HIT_SLOP_UNCLIPPED_STYLE, Size, touchFloorHitSlop } from '@/constants/theme';

const ROW_HIT_SLOP = { top: 9, bottom: 5 };

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('@gorhom/bottom-sheet', () => ({
  BottomSheetFooter: ({ children }: { children: ReactNode }) => children,
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/components/ui/sheet', () => ({
  Sheet: ({ isOpen, title, children }: { isOpen: boolean; title: string; children: ReactNode }) => {
    const { Text, View } = jest.requireActual<typeof import('react-native')>('react-native');
    if (!isOpen) return null;
    return (
      <View>
        <Text>{title}</Text>
        {children}
      </View>
    );
  },
}));

describe('MonthFilter', () => {
  it('uses compact controls inside the filter rail', async () => {
    const { getByTestId, getByText } = await render(
      <MonthFilter selectedMonth="2026-08" onSelectedMonthChange={jest.fn()} />,
    );

    const pill = resolveMonthPillGeometry(Dimensions.get('window').fontScale);
    expect(getByTestId('month-filter-open')).toHaveStyle({ height: pill.height });
    expect(getByText('August 2026')).toHaveStyle(pill.label);
    expect(getByText('August 2026')).toHaveProp('allowFontScaling', false);
    expect(getByText('August 2026')).toHaveProp('numberOfLines', 1);
  });

  it('shows the selected month without the extra label', async () => {
    const { getByText, queryByText } = await render(
      <MonthFilter selectedMonth="2026-08" onSelectedMonthChange={jest.fn()} />,
    );

    expect(getByText('August 2026')).toBeTruthy();
    expect(queryByText(Strings.monthFilterLabel)).toBeNull();
  });

  it('changes to the previous and next month from the step buttons', async () => {
    const onSelectedMonthChange = jest.fn();
    const { getByLabelText, rerender } = await render(
      <MonthFilter selectedMonth="2026-01" onSelectedMonthChange={onSelectedMonthChange} />,
    );

    await fireEvent.press(getByLabelText(Strings.monthFilterPreviousA11y));
    expect(onSelectedMonthChange).toHaveBeenCalledWith('2025-12');

    await rerender(
      <MonthFilter selectedMonth="2026-12" onSelectedMonthChange={onSelectedMonthChange} />,
    );

    await fireEvent.press(getByLabelText(Strings.monthFilterNextA11y));
    expect(onSelectedMonthChange).toHaveBeenCalledWith('2027-01');
  });

  it('opens the picker and changes to the selected month', async () => {
    const onSelectedMonthChange = jest.fn();
    const { getByLabelText, getByText, queryByText } = await render(
      <MonthFilter selectedMonth="2026-08" onSelectedMonthChange={onSelectedMonthChange} />,
    );

    await fireEvent.press(getByLabelText(Strings.monthFilterOpenA11y('August 2026')));
    expect(getByText(Strings.monthPickerTitle)).toBeTruthy();

    await fireEvent.press(getByLabelText('Nov 2026'));

    expect(onSelectedMonthChange).toHaveBeenCalledWith('2026-11');
    expect(queryByText(Strings.monthPickerTitle)).toBeNull();
  });

  it('changes picker year before selecting a month', async () => {
    const onSelectedMonthChange = jest.fn();
    const { getByLabelText, getByText } = await render(
      <MonthFilter selectedMonth="2026-08" onSelectedMonthChange={onSelectedMonthChange} />,
    );

    await fireEvent.press(getByLabelText(Strings.monthFilterOpenA11y('August 2026')));
    await fireEvent.press(getByLabelText(Strings.monthPickerNextYearA11y));

    expect(getByText('2027')).toBeTruthy();

    await fireEvent.press(getByLabelText('Feb 2027'));
    expect(onSelectedMonthChange).toHaveBeenCalledWith('2027-02');
  });

  it('MA-109, MA-242: a row slop reaches the pill and both step buttons only when its caller sets one; the year arrows and cells take the touch-floor slop, the arrows from the year row layout', async () => {
    const { getByLabelText, getByTestId, rerender } = await render(
      <MonthFilter selectedMonth="2026-08" onSelectedMonthChange={jest.fn()} />,
    );

    const pillHeight = resolveMonthPillGeometry(Dimensions.get('window').fontScale).height;
    expect(getByTestId('month-filter-open').props.hitSlop).toBeUndefined();
    expect(getByTestId('month-filter-previous').props.hitSlop).toEqual(
      resolveMonthStepHitSlop(undefined, pillHeight, 'previous'),
    );
    expect(getByTestId('month-filter-next').props.hitSlop).toEqual(
      resolveMonthStepHitSlop(undefined, pillHeight, 'next'),
    );
    expect(getByTestId('month-filter-previous')).toHaveStyle(HIT_SLOP_UNCLIPPED_STYLE);
    expect(getByTestId('month-filter-next')).toHaveStyle(HIT_SLOP_UNCLIPPED_STYLE);

    await rerender(
      <MonthFilter
        selectedMonth="2026-08"
        onSelectedMonthChange={jest.fn()}
        rowHitSlop={ROW_HIT_SLOP}
      />,
    );

    expect(getByTestId('month-filter-open').props.hitSlop).toEqual(ROW_HIT_SLOP);
    expect(getByTestId('month-filter-previous').props.hitSlop).toEqual(
      resolveMonthStepHitSlop(ROW_HIT_SLOP, pillHeight, 'previous'),
    );
    expect(getByTestId('month-filter-next').props.hitSlop).toEqual(
      resolveMonthStepHitSlop(ROW_HIT_SLOP, pillHeight, 'next'),
    );
    expect(getByTestId('month-filter-previous')).toHaveStyle(HIT_SLOP_UNCLIPPED_STYLE);
    expect(getByTestId('month-filter-next')).toHaveStyle(HIT_SLOP_UNCLIPPED_STYLE);

    await fireEvent.press(getByLabelText(Strings.monthFilterOpenA11y('August 2026')));

    const yearArrows: ReadonlyArray<[MonthStepSide, string]> = [
      ['previous', Strings.monthPickerPreviousYearA11y],
      ['next', Strings.monthPickerNextYearA11y],
    ];
    for (const [side, label] of yearArrows) {
      expect(getByLabelText(label).props.hitSlop).toEqual(
        resolveMonthYearStepHitSlop(undefined, side),
      );
      expect(getByLabelText(label)).toHaveStyle({ width: expect.any(Number) });
      expect(getByLabelText(label)).toHaveStyle(HIT_SLOP_UNCLIPPED_STYLE);
    }

    const halfCellGap = MONTH_PICKER_CELL_GAP / 2;
    for (const label of ['Feb 2026', 'Nov 2026']) {
      expect(getByLabelText(label).props.hitSlop).toEqual({
        top: halfCellGap,
        bottom: halfCellGap,
        left: halfCellGap,
        right: halfCellGap,
      });
      expect(getByLabelText(label)).toHaveStyle(HIT_SLOP_UNCLIPPED_STYLE);
    }

    const yearRowHeight =
      Size.monthYearStepTrack + 2 * touchFloorHitSlop(Size.monthYearStepTrack).top;
    expect(resolveMonthYearStepHitSlop(yearRowHeight, 'next')).not.toEqual(
      resolveMonthYearStepHitSlop(undefined, 'next'),
    );
    await fireEvent(getByTestId('month-picker-year-row'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 300, height: yearRowHeight } },
    });

    for (const [side, label] of yearArrows) {
      expect(getByLabelText(label).props.hitSlop).toEqual(
        resolveMonthYearStepHitSlop(yearRowHeight, side),
      );
    }
  });
});

describe('Sheet body mount (MA-273)', () => {
  const heroui = jest.requireMock<{ BottomSheet: object }>('heroui-native');
  const { Sheet } =
    jest.requireActual<typeof import('@/components/ui/sheet')>('@/components/ui/sheet');
  const setupBottomSheet = heroui.BottomSheet;
  const bodyMounted = jest.fn();
  let settleClose: (() => void) | undefined;

  // The setup mock's root draws nothing closed, which would hide a body the shared sheet mounts.
  const Root = ({ children }: { children: ReactNode }) => <>{children}</>;
  const Content = ({
    children,
    onClose,
    footerComponent,
  }: {
    children: ReactNode;
    onClose: () => void;
    footerComponent?: (props: object) => ReactNode;
  }) => {
    settleClose = onClose;
    return (
      <View>
        {children}
        {footerComponent?.({})}
      </View>
    );
  };

  function Body() {
    useEffect(() => {
      bodyMounted();
    }, []);
    return <Text testID="sheet-body">Body</Text>;
  }

  const sheetAt = (isOpen: boolean) => (
    <Sheet isOpen={isOpen} onOpenChange={jest.fn()} title="Title" footer={<Text>Footer</Text>}>
      <Body />
    </Sheet>
  );

  beforeAll(() => {
    heroui.BottomSheet = Object.assign(Root, setupBottomSheet, { Content });
  });

  afterAll(() => {
    heroui.BottomSheet = setupBottomSheet;
  });

  beforeEach(() => {
    bodyMounted.mockClear();
    settleClose = undefined;
  });

  it('holds the body back until the first open, and keeps it through a settled close and a reopen', async () => {
    const { getByTestId, getByText, queryByTestId, rerender } = await render(sheetAt(false));

    expect(getByText('Title')).toBeTruthy();
    expect(getByText('Footer')).toBeTruthy();
    expect(queryByTestId('sheet-body')).toBeNull();
    expect(bodyMounted).not.toHaveBeenCalled();

    await rerender(sheetAt(true));

    expect(getByTestId('sheet-body')).toBeTruthy();
    expect(bodyMounted).toHaveBeenCalledTimes(1);

    await rerender(sheetAt(false));
    await act(() => {
      settleClose?.();
    });

    expect(getByTestId('sheet-body')).toBeTruthy();
    expect(bodyMounted).toHaveBeenCalledTimes(1);

    await rerender(sheetAt(true));

    expect(getByTestId('sheet-body')).toBeTruthy();
    expect(bodyMounted).toHaveBeenCalledTimes(1);
  });
});
