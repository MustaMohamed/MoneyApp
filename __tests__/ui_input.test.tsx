import React from 'react';
import { render } from '@testing-library/react-native';
import { Input } from '@/components/ui/input';

describe('Input', () => {
  it('renders without crashing', () => {
    const { getByTestId } = render(<Input testID="input" />);
    expect(getByTestId('input')).toBeTruthy();
  });

  it('applies normal border class when hasError is false', () => {
    const { getByTestId } = render(<Input testID="input" hasError={false} />);
    const el = getByTestId('input');
    expect(el.props.className).toContain('border-border');
    expect(el.props.className).not.toContain('border-negative');
  });

  it('applies error border class when hasError is true', () => {
    const { getByTestId } = render(<Input testID="input" hasError />);
    const el = getByTestId('input');
    expect(el.props.className).toContain('border-negative');
    expect(el.props.className).not.toContain('border-border');
  });

  it('uses text2 hex for placeholderTextColor', () => {
    const { getByTestId } = render(<Input testID="input" placeholder="Enter value" />);
    // placeholderTextColor is set to #6B7F99 (text2) — verify the prop is present
    expect(getByTestId('input').props.placeholderTextColor).toBe('#6B7F99');
  });

  it('forwards TextInput props (value, onChangeText)', () => {
    const onChangeText = jest.fn();
    const { getByTestId } = render(
      <Input testID="input" value="hello" onChangeText={onChangeText} />,
    );
    const el = getByTestId('input');
    expect(el.props.value).toBe('hello');
  });

  it('merges additional className', () => {
    const { getByTestId } = render(<Input testID="input" className="w-full" />);
    expect(getByTestId('input').props.className).toContain('w-full');
  });
});
