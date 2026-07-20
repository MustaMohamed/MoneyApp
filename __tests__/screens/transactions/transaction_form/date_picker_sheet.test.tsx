import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { Platform, View } from 'react-native';

const mockDateTimePicker = jest.fn((props: object) => (
  <View testID="mock-date-time-picker" {...props} />
));

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const ReactLocal = jest.requireActual<typeof import('react')>('react');
  const { View: RNView } = jest.requireActual<typeof import('react-native')>('react-native');
  return (props: object) => ReactLocal.createElement(RNView, props);
});

jest.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true,
  default: (props: object) => mockDateTimePicker(props),
}));

jest.mock('@/components/ui/sheet', () => ({
  Sheet: ({
    isOpen,
    footer,
    children,
  }: {
    isOpen: boolean;
    footer?: React.ReactNode;
    children: React.ReactNode;
  }) => {
    const ReactLocal = jest.requireActual<typeof import('react')>('react');
    const { View: RNView } = jest.requireActual<typeof import('react-native')>('react-native');
    return isOpen
      ? ReactLocal.createElement(RNView, { testID: 'date-picker-sheet' }, children, footer)
      : null;
  },
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ label, ...props }: { label: string }) => {
    const ReactLocal = jest.requireActual<typeof import('react')>('react');
    const { View: RNView } = jest.requireActual<typeof import('react-native')>('react-native');
    return ReactLocal.createElement(RNView, { ...props, accessibilityLabel: label }, label);
  },
}));

import { Strings } from '@/constants/strings';
import { useDatePickerSheetState } from '@/modules/transactions/screens/transactions/transaction_form/components/date_picker_sheet.state';
import {
  DATE_ROW_HEIGHT,
  DateRow,
} from '@/modules/transactions/screens/transactions/transaction_form/components/date_row';

describe('transaction date picker', () => {
  const originalPlatform = Platform.OS;

  function setPlatform(os: 'ios' | 'android') {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: os });
  }

  beforeEach(() => {
    mockDateTimePicker.mockClear();
    useDatePickerSheetState.getState().reset();
  });

  afterAll(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
  });

  it('keeps iOS changes in a draft until Done is pressed', () => {
    setPlatform('ios');
    const onChange = jest.fn();
    const screen = render(<DateRow ownerId="add-1" value="2026-07-10" onChange={onChange} />);

    fireEvent.press(screen.getByTestId('date-row'));
    expect(screen.getByTestId('date-picker-sheet')).toBeTruthy();

    fireEvent(
      screen.getByTestId('date-picker-ios'),
      'change',
      { type: 'set' },
      new Date(2026, 6, 12, 12),
    );

    expect(onChange).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('date-picker-done'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('2026-07-12');
    expect(screen.queryByTestId('date-picker-sheet')).toBeNull();
  });

  it('discards the iOS draft when Cancel is pressed', () => {
    setPlatform('ios');
    const onChange = jest.fn();
    const screen = render(<DateRow ownerId="add-1" value="2026-07-10" onChange={onChange} />);

    fireEvent.press(screen.getByTestId('date-row'));
    fireEvent(
      screen.getByTestId('date-picker-ios'),
      'change',
      { type: 'set' },
      new Date(2026, 6, 12, 12),
    );
    fireEvent.press(screen.getByTestId('date-picker-cancel'));

    expect(onChange).not.toHaveBeenCalled();
    expect(useDatePickerSheetState.getState()).toMatchObject({
      isOpen: false,
      draftDate: '2026-07-10',
    });
  });

  it('applies an Android selection exactly once and dismisses its native picker', () => {
    setPlatform('android');
    const onChange = jest.fn();
    const screen = render(<DateRow ownerId="add-1" value="2026-07-10" onChange={onChange} />);

    fireEvent.press(screen.getByTestId('date-row'));
    expect(screen.getByTestId('date-picker-android')).toBeTruthy();

    fireEvent(
      screen.getByTestId('date-picker-android'),
      'change',
      { type: 'set' },
      new Date(2026, 6, 11, 12),
    );

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('2026-07-11');
    expect(screen.queryByTestId('date-picker-android')).toBeNull();
  });

  it('keeps a fixed compact trigger while the iOS sheet is open', () => {
    setPlatform('ios');
    const screen = render(<DateRow ownerId="add-1" value="2026-07-10" onChange={jest.fn()} />);
    expect(screen.getByTestId('date-row')).toHaveStyle({ height: DATE_ROW_HEIGHT });

    fireEvent.press(screen.getByTestId('date-row'));

    expect(screen.getByTestId('date-row')).toHaveStyle({ height: DATE_ROW_HEIGHT });
    expect(screen.getByTestId('date-picker-done')).toHaveProp(
      'accessibilityLabel',
      Strings.addTxDatePickerDone,
    );
  });

  it('announces the compact date trigger as a button with its selected value', () => {
    setPlatform('ios');
    const screen = render(<DateRow ownerId="add-1" value="2026-07-10" onChange={jest.fn()} />);
    expect(screen.getByTestId('date-row')).toHaveProp('accessibilityRole', 'button');
    expect(screen.getByTestId('date-row')).toHaveProp(
      'accessibilityLabel',
      `${Strings.addTxDateLabel}: July 10, 2026`,
    );
  });

  it('keeps the active owner open when an older form owner unmounts', () => {
    setPlatform('ios');
    const OldAndNewOwners = ({ showOld }: { showOld: boolean }) => (
      <>
        {showOld ? <DateRow ownerId="add-old" value="2026-07-10" onChange={jest.fn()} /> : null}
        <DateRow ownerId="edit-new" value="2026-07-11" onChange={jest.fn()} />
      </>
    );
    const screen = render(<OldAndNewOwners showOld />);

    fireEvent.press(screen.getAllByTestId('date-row')[1]);
    expect(screen.getAllByTestId('date-picker-sheet')).toHaveLength(1);

    screen.rerender(<OldAndNewOwners showOld={false} />);

    expect(screen.getByTestId('date-picker-sheet')).toBeTruthy();
    expect(useDatePickerSheetState.getState().activeOwnerId).toBe('edit-new');
  });
});
