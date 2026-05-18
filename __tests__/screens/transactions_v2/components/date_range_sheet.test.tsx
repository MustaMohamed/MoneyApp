/**
 * date_range_sheet.test.tsx
 *
 * Regression guard for the Android native-modal-on-mount bug.
 *
 * @react-native-community/datetimepicker with display='default' on Android
 * pops its native modal the instant the component is rendered into the JSX
 * tree — independent of any parent visibility. DateRangeSheet must gate its
 * picker children behind the `visible` prop so they only mount when the
 * sheet is open. If the gate is removed or moved, this test fails.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

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

// Render DateTimePicker as a tagged View so we can find/count it.
jest.mock('@react-native-community/datetimepicker', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) =>
      ReactActual.createElement(View, { testID: 'date-time-picker', ...props }),
  };
});

describe('DateRangeSheet — picker visibility gate', () => {
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
    // One for "From", one for "To".
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
