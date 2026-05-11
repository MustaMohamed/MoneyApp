import React from 'react';
import { render } from '@testing-library/react-native';
import { Pressable } from '@/components/ui/pressable';
import { Text } from 'react-native';

describe('Pressable', () => {
  it('renders children', () => {
    const { getByText } = render(
      <Pressable>
        <Text>Press me</Text>
      </Pressable>,
    );
    expect(getByText('Press me')).toBeTruthy();
  });

  it('has hitSlop of 44', () => {
    const { getByTestId } = render(
      <Pressable testID="p">
        <Text>x</Text>
      </Pressable>,
    );
    expect(getByTestId('p').props.hitSlop).toBe(44);
  });

  it('accepts accessibility props', () => {
    const { getByTestId } = render(
      <Pressable testID="p" accessibilityRole="button" accessibilityLabel="do thing">
        <Text>x</Text>
      </Pressable>,
    );
    const el = getByTestId('p');
    expect(el.props.accessibilityRole).toBe('button');
    expect(el.props.accessibilityLabel).toBe('do thing');
  });

  it('merges className prop', () => {
    const { getByTestId } = render(
      <Pressable testID="p" className="bg-surfaceEl p-4">
        <Text>x</Text>
      </Pressable>,
    );
    expect(getByTestId('p').props.className).toContain('bg-surfaceEl');
  });
});
