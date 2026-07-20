import { fireEvent, render } from '@testing-library/react-native';

import { Strings } from '@/constants/strings';
import { DetailLoadError } from '@/modules/transactions/screens/transactions/detail/components/detail_load_error';

describe('DetailLoadError', () => {
  it('renders a retryable first-load failure', () => {
    const retry = jest.fn();
    const screen = render(<DetailLoadError onRetry={retry} />);

    expect(screen.getByText(Strings.detailLoadErrorTitle)).toBeTruthy();
    fireEvent.press(screen.getByText(Strings.detailLoadRetry));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('renders the compact refresh copy without changing loaded content ownership', () => {
    const screen = render(<DetailLoadError floating onRetry={jest.fn()} />);

    expect(screen.getByText(Strings.detailRefreshErrorTitle)).toBeTruthy();
  });
});
