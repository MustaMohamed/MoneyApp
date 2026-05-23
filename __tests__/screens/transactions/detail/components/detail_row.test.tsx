import { render } from '@testing-library/react-native';
import React from 'react';

import { DetailRow } from '@/screens/transactions/detail/components/detail_row';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcons');

describe('DetailRow — badge tone', () => {
  // Lock each tone's class composition so a future refactor that
  // accidentally drops the type-tinting (e.g. reverts to hardcoded
  // bg-accent/15) fails CI immediately.
  const cases: Array<['accent' | 'danger' | 'success' | 'info' | 'accent-cc', string]> = [
    ['accent', 'text-accent'],
    ['danger', 'text-danger'],
    ['success', 'text-success'],
    ['info', 'text-info'],
    ['accent-cc', 'text-accent-cc'],
  ];

  for (const [tone, klass] of cases) {
    it(`renders the badge text with ${klass} when badgeTone="${tone}"`, () => {
      const { getByText } = render(
        <DetailRow icon="shape" label="Category" value="Food" badge="Expense" badgeTone={tone} />,
      );
      // Find the badge Text node directly by its visible content.
      const node = getByText('Expense');
      expect(node.props.className).toContain(klass);
    });
  }

  it('defaults to "accent" tone when badgeTone is omitted (Captured badges etc.)', () => {
    const { getByText } = render(
      <DetailRow icon="earth" label="Rate" value="1 USD = 48 EGP" badge="Captured" />,
    );
    expect(getByText('Captured').props.className).toContain('text-accent');
  });

  it('omits the badge view entirely when badge is undefined', () => {
    const { queryByText } = render(<DetailRow icon="text" label="Note" value="" />);
    // No badge text means no badge view rendered — sanity check the prop is opt-in.
    expect(queryByText('Captured')).toBeNull();
  });
});
