import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Strings } from '@/constants/strings';
import { StartupError } from '@/modules/navigation/components/startup_error';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);

describe('StartupError', () => {
  it('fills the screen and retries through one explicit action', () => {
    const onRetry = jest.fn();
    render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <StartupError onRetry={onRetry} />
      </SafeAreaProvider>,
    );

    expect(screen.getByTestId('startup-error')).toHaveStyle({ flex: 1 });
    expect(screen.getByText(Strings.startupErrorTitle)).toBeTruthy();
    expect(screen.getByText(Strings.startupErrorDescription)).toBeTruthy();

    fireEvent.press(screen.getByLabelText(Strings.startupErrorRetry));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('keeps the same presentation while retry is running', () => {
    render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <StartupError isRetrying onRetry={jest.fn()} />
      </SafeAreaProvider>,
    );

    expect(screen.getByText(Strings.startupErrorTitle)).toBeTruthy();
    expect(screen.getByText('Loading...')).toBeTruthy();
  });
});
