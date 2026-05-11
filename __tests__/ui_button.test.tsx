import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Button } from '@/components/ui/button';

// expo-linear-gradient is not available in Jest — mock it as a transparent View wrapper.
// Per plan known-gotcha: "if Task 11 test fails with `LinearGradient is not a function`,
// add the mock at the top of the test file."
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: require('react-native').View,
}));

describe('Button', () => {
  it('renders label text', () => {
    const { getByText } = render(<Button label="Continue" onPress={() => {}} />);
    expect(getByText('Continue')).toBeTruthy();
  });

  it('defaults to primary variant', () => {
    const { getByRole } = render(<Button label="OK" onPress={() => {}} />);
    expect(getByRole('button')).toBeTruthy();
  });

  it('primary variant wraps in LinearGradient', () => {
    const { UNSAFE_getAllByType } = render(
      <Button variant="primary" label="Primary" onPress={() => {}} />,
    );
    // LinearGradient is mocked as View; primary renders an outer wrapper View (gradient)
    // and an inner Pressable View — UNSAFE_getAllByType(View) returns both.
    // The inner one carries accessibilityRole="button" and no background class (gradient provides it).
    const views = UNSAFE_getAllByType(require('react-native').View);
    const pressableView = views.find((v) => v.props.accessibilityRole === 'button');
    expect(pressableView).toBeTruthy();
    expect(pressableView!.props.className).not.toContain('bg-');
  });

  it('ghost variant applies border classes', () => {
    const { getByRole } = render(<Button variant="ghost" label="Ghost" onPress={() => {}} />);
    const el = getByRole('button');
    expect(el.props.className).toContain('border-border');
    expect(el.props.className).toContain('bg-transparent');
  });

  it('destructive variant applies negative background', () => {
    const { getByRole } = render(
      <Button variant="destructive" label="Delete" onPress={() => {}} />,
    );
    const el = getByRole('button');
    expect(el.props.className).toContain('bg-negative');
  });

  it('has min-height class for all variants', () => {
    const variants = ['primary', 'ghost', 'destructive'] as const;
    variants.forEach((variant) => {
      const { getByRole } = render(<Button variant={variant} label="Test" onPress={() => {}} />);
      expect(getByRole('button').props.className).toContain('min-h-[52px]');
    });
  });

  it('forwards onPress', () => {
    const onPress = jest.fn();
    const { getByRole } = render(<Button label="Press" onPress={onPress} />);
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
