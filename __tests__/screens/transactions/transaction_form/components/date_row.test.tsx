import { act, render, fireEvent } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { DateRow } from '@/screens/transactions/transaction_form/components/date_row';

// Render DateTimePicker as a plain View so onChange can be invoked directly
// without hitting the native module's event-wrapper (which reads .timestamp
// and crashes in the Jest environment). This matches the pattern used in
// date_range_sheet.test.tsx (§6 reference implementation).
jest.mock('@react-native-community/datetimepicker', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => ReactActual.createElement(View, { ...props }),
  };
});

function setPlatformOS(os: 'ios' | 'android') {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
}

describe('DateRow', () => {
  describe('iOS', () => {
    beforeAll(() => setPlatformOS('ios'));

    it('renders the formatted date value', () => {
      const { getByText } = render(<DateRow value="2026-05-18" onChange={() => {}} />);
      expect(getByText('May 18, 2026')).toBeTruthy();
    });

    it('mounts the iOS spinner picker after the row is pressed', () => {
      const { getByTestId, queryByTestId } = render(
        <DateRow value="2026-05-18" onChange={() => {}} />,
      );
      expect(queryByTestId('date-picker-ios')).toBeNull();
      fireEvent.press(getByTestId('date-row'));
      expect(getByTestId('date-picker-ios')).toBeTruthy();
    });

    it('calls onChange with YYYY-MM-DD when iOS picker emits a date', () => {
      const onChange = jest.fn();
      const { getByTestId } = render(<DateRow value="2026-05-18" onChange={onChange} />);
      fireEvent.press(getByTestId('date-row'));
      const picker = getByTestId('date-picker-ios');
      act(() => picker.props.onChange({ type: 'set' }, new Date('2026-06-01T12:00:00Z')));
      expect(onChange).toHaveBeenCalledWith('2026-06-01');
    });
  });

  describe('Android', () => {
    beforeAll(() => setPlatformOS('android'));

    it('does NOT auto-mount the picker on initial render', () => {
      const { queryByTestId } = render(<DateRow value="2026-05-18" onChange={() => {}} />);
      expect(queryByTestId('date-picker-android')).toBeNull();
    });

    it('mounts picker after trigger press', () => {
      const { getByTestId } = render(<DateRow value="2026-05-18" onChange={() => {}} />);
      fireEvent.press(getByTestId('date-row'));
      expect(getByTestId('date-picker-android')).toBeTruthy();
    });

    it('unmounts picker after onChange fires (event.type=set)', () => {
      const onChange = jest.fn();
      const { getByTestId, queryByTestId } = render(
        <DateRow value="2026-05-18" onChange={onChange} />,
      );
      fireEvent.press(getByTestId('date-row'));
      const picker = getByTestId('date-picker-android');
      act(() => picker.props.onChange({ type: 'set' }, new Date('2026-06-01T12:00:00Z')));
      expect(onChange).toHaveBeenCalledWith('2026-06-01');
      expect(queryByTestId('date-picker-android')).toBeNull();
    });

    it('unmounts picker on dismiss (event.type=dismissed) without calling onChange', () => {
      const onChange = jest.fn();
      const { getByTestId, queryByTestId } = render(
        <DateRow value="2026-05-18" onChange={onChange} />,
      );
      fireEvent.press(getByTestId('date-row'));
      const picker = getByTestId('date-picker-android');
      act(() => picker.props.onChange({ type: 'dismissed' }, undefined));
      expect(onChange).not.toHaveBeenCalled();
      expect(queryByTestId('date-picker-android')).toBeNull();
    });
  });
});
