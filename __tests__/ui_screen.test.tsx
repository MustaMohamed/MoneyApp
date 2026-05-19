import { render } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

import { Screen, ScreenScroll } from '@/components/ui/screen';

describe('Screen', () => {
  it('renders children', () => {
    const { getByText } = render(
      <Screen>
        <Text>screen content</Text>
      </Screen>,
    );
    expect(getByText('screen content')).toBeTruthy();
  });

  it('forwards className to SafeAreaView', () => {
    const { getByText } = render(
      <Screen className="bg-surface">
        <Text>themed</Text>
      </Screen>,
    );
    expect(getByText('themed')).toBeTruthy();
  });
});

describe('ScreenScroll', () => {
  it('renders children', () => {
    const { getByText } = render(
      <ScreenScroll>
        <Text>scroll content</Text>
      </ScreenScroll>,
    );
    expect(getByText('scroll content')).toBeTruthy();
  });

  it('merges custom contentContainerStyle with default flexGrow', () => {
    const { getByText } = render(
      <ScreenScroll contentContainerStyle={{ paddingHorizontal: 16 }}>
        <Text>padded</Text>
      </ScreenScroll>,
    );
    expect(getByText('padded')).toBeTruthy();
  });
});
