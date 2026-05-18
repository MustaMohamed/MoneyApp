/**
 * date_range_sheet.test.tsx
 *
 * Two regression suites for the Android picker:
 *
 * 1. iOS gate (display="inline"): the picker children must not mount while
 *    the sheet is closed, but mount inline when it's open. iOS uses an
 *    in-place calendar, so always-mounted-while-visible is safe.
 *
 * 2. Android imperative pattern (display="default"): the native modal pops
 *    the instant the picker renders. Continuously mounting it traps the
 *    user in a re-pop loop after cancel. Android must tap a date button to
 *    mount the picker, and unmount it on every onChange — whether the user
 *    confirmed ("set") or canceled ("dismissed").
 */
import React from 'react';
import { Platform } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';

import { DateRangeSheet } from '@/screens/transactions_v2/components/date_range_sheet';

// Render Sheet as a plain View so children are queryable.
jest.mock('@/components/ui/sheet', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const Sheet = (props: { children: React.ReactNode; footer?: React.ReactNode }) =>
    ReactActual.createElement(View, null, props.children, props.footer ?? null);
  Sheet.Body = ({ children }: { children: React.ReactNode }) =>
    ReactActual.createElement(View, null, children);
  return { Sheet };
});

// Stub Button so the footer renders something predictable.
jest.mock('@/components/ui/button', () => {
  const ReactActual = jest.requireActual('react');
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    Button: ({ label, onPress }: { label: string; onPress?: () => void }) =>
      ReactActual.createElement(
        Pressable,
        { onPress },
        ReactActual.createElement(Text, null, label),
      ),
  };
});

// Render DateTimePicker as a tagged View so we can find/count it and
// invoke onChange imperatively for Android event simulation.
jest.mock('@react-native-community/datetimepicker', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) =>
      ReactActual.createElement(View, { testID: 'date-time-picker', ...props }),
  };
});

function setPlatformOS(os: 'ios' | 'android'): void {
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
}

describe('DateRangeSheet', () => {
  describe('iOS (display="inline") — picker visibility gate', () => {
    beforeAll(() => setPlatformOS('ios'));

    it('does NOT mount DateTimePicker children when visible=false', () => {
      const { queryAllByTestId } = render(
        <DateRangeSheet visible={false} onClose={() => {}} onConfirm={() => {}} />,
      );
      expect(queryAllByTestId('date-time-picker')).toHaveLength(0);
    });

    it('mounts both DateTimePicker children when visible=true', () => {
      const { queryAllByTestId } = render(
        <DateRangeSheet visible={true} onClose={() => {}} onConfirm={() => {}} />,
      );
      // One inline calendar for "From", one for "To".
      expect(queryAllByTestId('date-time-picker')).toHaveLength(2);
    });

    it('unmounts DateTimePicker children when visible flips from true to false', () => {
      const { queryAllByTestId, rerender } = render(
        <DateRangeSheet visible={true} onClose={() => {}} onConfirm={() => {}} />,
      );
      expect(queryAllByTestId('date-time-picker')).toHaveLength(2);

      rerender(<DateRangeSheet visible={false} onClose={() => {}} onConfirm={() => {}} />);
      expect(queryAllByTestId('date-time-picker')).toHaveLength(0);
    });
  });

  describe('Android (display="default") — imperative picker pattern', () => {
    beforeAll(() => setPlatformOS('android'));
    afterAll(() => setPlatformOS('ios'));

    it('does NOT mount any DateTimePicker when sheet first opens (button-driven)', () => {
      const { queryAllByTestId } = render(
        <DateRangeSheet visible={true} onClose={() => {}} onConfirm={() => {}} />,
      );
      // Triggers render, but no picker until user taps a date button.
      expect(queryAllByTestId('date-range-from-trigger')).toHaveLength(1);
      expect(queryAllByTestId('date-range-to-trigger')).toHaveLength(1);
      expect(queryAllByTestId('date-time-picker')).toHaveLength(0);
    });

    it('mounts the From picker when From trigger is pressed', () => {
      const { getByTestId, queryAllByTestId } = render(
        <DateRangeSheet visible={true} onClose={() => {}} onConfirm={() => {}} />,
      );
      fireEvent.press(getByTestId('date-range-from-trigger'));
      expect(queryAllByTestId('date-time-picker')).toHaveLength(1);
    });

    it('unmounts the picker when onChange fires with type="dismissed" (cancel)', () => {
      const { getByTestId, queryAllByTestId } = render(
        <DateRangeSheet visible={true} onClose={() => {}} onConfirm={() => {}} />,
      );
      fireEvent.press(getByTestId('date-range-from-trigger'));
      expect(queryAllByTestId('date-time-picker')).toHaveLength(1);

      const picker = getByTestId('date-time-picker');
      const onChange = picker.props.onChange as (e: { type: string }, d?: Date) => void;
      act(() => onChange({ type: 'dismissed' }, undefined));

      expect(queryAllByTestId('date-time-picker')).toHaveLength(0);
    });

    it('unmounts the picker when onChange fires with type="set" (confirm)', () => {
      const { getByTestId, queryAllByTestId } = render(
        <DateRangeSheet visible={true} onClose={() => {}} onConfirm={() => {}} />,
      );
      fireEvent.press(getByTestId('date-range-from-trigger'));
      expect(queryAllByTestId('date-time-picker')).toHaveLength(1);

      const picker = getByTestId('date-time-picker');
      const onChange = picker.props.onChange as (e: { type: string }, d?: Date) => void;
      act(() => onChange({ type: 'set' }, new Date('2026-04-15')));

      expect(queryAllByTestId('date-time-picker')).toHaveLength(0);
    });

    it('mounts the To picker when To trigger is pressed (independent of From)', () => {
      const { getByTestId, queryAllByTestId } = render(
        <DateRangeSheet visible={true} onClose={() => {}} onConfirm={() => {}} />,
      );
      fireEvent.press(getByTestId('date-range-to-trigger'));
      expect(queryAllByTestId('date-time-picker')).toHaveLength(1);
    });
  });
});
