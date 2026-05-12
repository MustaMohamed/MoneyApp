import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcons');
jest.mock('heroui-native', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

import { BackButton } from '@/components/ui/back_button';

describe('BackButton', () => {
  it('renders the chevron-left icon', () => {
    const { UNSAFE_getAllByType } = render(<BackButton onPress={jest.fn()} />);
    const icons = UNSAFE_getAllByType('MaterialCommunityIcons' as any);
    const chevron = icons.find((el: any) => el.props.name === 'chevron-left');
    expect(chevron).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByRole } = render(<BackButton onPress={onPress} />);
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('has accessibilityRole="button"', () => {
    const { getByRole } = render(<BackButton onPress={jest.fn()} />);
    expect(getByRole('button')).toBeTruthy();
  });

  it('has accessibilityLabel "Go back"', () => {
    const { getByLabelText } = render(<BackButton onPress={jest.fn()} />);
    expect(getByLabelText('Go back')).toBeTruthy();
  });
});
