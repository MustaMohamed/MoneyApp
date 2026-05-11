import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from '@/components/ui/text';

describe('Text', () => {
  it('renders children', () => {
    const { getByText } = render(<Text>Hello</Text>);
    expect(getByText('Hello')).toBeTruthy();
  });

  it('defaults to body variant (font-inter text-text1 text-[14px])', () => {
    const { getByTestId } = render(<Text testID="t">Body</Text>);
    const el = getByTestId('t');
    expect(el.props.className).toContain('font-inter');
    expect(el.props.className).toContain('text-text1');
  });

  it('applies caption variant classes', () => {
    const { getByTestId } = render(
      <Text testID="t" variant="caption">
        Caption
      </Text>,
    );
    const el = getByTestId('t');
    expect(el.props.className).toContain('text-text2');
    expect(el.props.className).toContain('text-[12px]');
  });

  it('applies hint variant classes', () => {
    const { getByTestId } = render(
      <Text testID="t" variant="hint">
        Hint
      </Text>,
    );
    const el = getByTestId('t');
    expect(el.props.className).toContain('text-hint');
  });

  it('applies title variant classes', () => {
    const { getByTestId } = render(
      <Text testID="t" variant="title">
        Title
      </Text>,
    );
    const el = getByTestId('t');
    expect(el.props.className).toContain('font-soraSemi');
    expect(el.props.className).toContain('text-[18px]');
  });

  it('applies hero variant classes', () => {
    const { getByTestId } = render(
      <Text testID="t" variant="hero">
        Hero
      </Text>,
    );
    const el = getByTestId('t');
    expect(el.props.className).toContain('font-soraSemi');
    expect(el.props.className).toContain('text-[28px]');
  });

  it('merges custom className over variant', () => {
    const { getByTestId } = render(
      <Text testID="t" variant="body" className="mt-4">
        Content
      </Text>,
    );
    const el = getByTestId('t');
    expect(el.props.className).toContain('mt-4');
    expect(el.props.className).toContain('font-inter');
  });
});
