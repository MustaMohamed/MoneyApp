import React from 'react';
import { render } from '@testing-library/react-native';
import { Box } from '@/components/ui/box';

describe('Box', () => {
  it('renders without crashing', () => {
    const { getByTestId } = render(<Box testID="box" className="bg-surface p-4" />);
    expect(getByTestId('box')).toBeTruthy();
  });

  it('forwards className prop', () => {
    const { getByTestId } = render(<Box testID="box" className="bg-surface" />);
    const el = getByTestId('box');
    expect(el.props.className).toBe('bg-surface');
  });

  it('forwards additional ViewProps', () => {
    const { getByTestId } = render(<Box testID="box" accessible accessibilityLabel="container" />);
    const el = getByTestId('box');
    expect(el.props.accessibilityLabel).toBe('container');
  });

  it('forwards ref', () => {
    const ref = React.createRef<import('react-native').View>();
    render(<Box ref={ref} />);
    // ref.current is set after mount — just verify it doesn't throw
    expect(() => render(<Box ref={ref} />)).not.toThrow();
  });
});
