import { render } from '@testing-library/react-native';
import React from 'react';

import { TypeBadge } from '@/components/ui/type_badge';

describe('TypeBadge', () => {
  it('renders Commitment label', () => {
    const { getByText } = render(<TypeBadge type="commitment" />);
    expect(getByText('Commitment')).toBeTruthy();
  });

  it('renders Goal label', () => {
    const { getByText } = render(<TypeBadge type="goal" />);
    expect(getByText('Goal')).toBeTruthy();
  });

  it('renders Bill label', () => {
    const { getByText } = render(<TypeBadge type="bill" />);
    expect(getByText('Bill')).toBeTruthy();
  });

  it('accepts size prop and renders without crashing', () => {
    const { getByText } = render(<TypeBadge type="commitment" size="md" />);
    expect(getByText('Commitment')).toBeTruthy();
  });

  it('exposes accessibilityLabel matching the type', () => {
    const { getByLabelText } = render(<TypeBadge type="commitment" />);
    expect(getByLabelText('Commitment')).toBeTruthy();
  });
});
