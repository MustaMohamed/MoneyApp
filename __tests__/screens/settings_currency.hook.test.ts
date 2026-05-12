import { renderHook } from '@testing-library/react-native';

import { useCurrencyStore } from '@/store/currency.store';
import { useCurrencyScreen } from '@/screens/settings/currency/currency.hook';

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));
jest.mock('@/store/currency.store', () => ({ useCurrencyStore: jest.fn() }));
jest.mock('@/screens/settings/currency/currency.state', () => ({
  useCurrencyScreenState: jest.fn((sel: any) =>
    sel({
      state: { isManualPanelOpen: false, isFetching: false, isSaving: false, fetchError: '' },
      setManualPanelOpen: jest.fn(),
      setFetching: jest.fn(),
      setSaving: jest.fn(),
      setFetchError: jest.fn(),
      reset: jest.fn(),
    }),
  ),
}));

function setup() {
  (useCurrencyStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({
      state: { rate: 50, lastFetched: null, isManualOverride: false },
      fetchRate: jest.fn().mockResolvedValue(undefined),
      setManualRate: jest.fn().mockResolvedValue(undefined),
    }),
  );
}

describe('useCurrencyScreen', () => {
  beforeEach(setup);

  it('renders without throwing', () => {
    expect(() => renderHook(() => useCurrencyScreen())).not.toThrow();
  });

  it('rate is exposed from store', () => {
    const { result } = renderHook(() => useCurrencyScreen());
    expect(result.current.state.rate).toBe(50);
  });

  it('fetchError is exposed from screen state (Task 9)', () => {
    const { result } = renderHook(() => useCurrencyScreen());
    expect(result.current.state.fetchError).toBe('');
  });

  it('handleFetchRate sets fetchError on rejection (Task 9)', async () => {
    const setFetchErrorMock = jest.fn();
    const { useCurrencyScreenState } = require('@/screens/settings/currency/currency.state');
    (useCurrencyScreenState as jest.Mock).mockImplementation((sel: any) =>
      sel({
        state: { isManualPanelOpen: false, isFetching: false, isSaving: false, fetchError: '' },
        setManualPanelOpen: jest.fn(),
        setFetching: jest.fn(),
        setSaving: jest.fn(),
        setFetchError: setFetchErrorMock,
        reset: jest.fn(),
      }),
    );
    (useCurrencyStore as unknown as jest.Mock).mockImplementation((sel: any) =>
      sel({
        state: { rate: 50, lastFetched: null, isManualOverride: false },
        fetchRate: jest.fn().mockRejectedValue(new Error('Network error')),
        setManualRate: jest.fn().mockResolvedValue(undefined),
      }),
    );
    const { result } = renderHook(() => useCurrencyScreen());
    await result.current.handleFetchRate();
    expect(setFetchErrorMock).toHaveBeenCalledWith('Could not update rate. Try again.');
  });

  it('handleFetchRate clears fetchError before fetching (Task 9)', async () => {
    const setFetchErrorMock = jest.fn();
    const { useCurrencyScreenState } = require('@/screens/settings/currency/currency.state');
    (useCurrencyScreenState as jest.Mock).mockImplementation((sel: any) =>
      sel({
        state: { isManualPanelOpen: false, isFetching: false, isSaving: false, fetchError: 'old error' },
        setManualPanelOpen: jest.fn(),
        setFetching: jest.fn(),
        setSaving: jest.fn(),
        setFetchError: setFetchErrorMock,
        reset: jest.fn(),
      }),
    );
    (useCurrencyStore as unknown as jest.Mock).mockImplementation((sel: any) =>
      sel({
        state: { rate: 50, lastFetched: null, isManualOverride: false },
        fetchRate: jest.fn().mockResolvedValue(undefined),
        setManualRate: jest.fn().mockResolvedValue(undefined),
      }),
    );
    const { result } = renderHook(() => useCurrencyScreen());
    await result.current.handleFetchRate();
    // First call should clear the error
    expect(setFetchErrorMock).toHaveBeenCalledWith('');
  });
});
