import { renderHook } from '@testing-library/react-native';

import { useCurrencyScreen } from '@/modules/currency/screens/currency/currency.hook';
import { useCurrencyStore } from '@/modules/currency/store/currency.store';

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));
jest.mock('@/modules/currency/store/currency.store', () => ({ useCurrencyStore: jest.fn() }));
jest.mock('@/modules/currency/screens/currency/currency.state', () => ({
  useCurrencyScreenState: jest.fn((sel: any) =>
    sel({
      state: { isFetching: false, isSaving: false, fetchError: '' },
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

  it('fetchError is exposed from screen state', () => {
    const { result } = renderHook(() => useCurrencyScreen());
    expect(result.current.state.fetchError).toBe('');
  });

  it('does not expose isManualPanelOpen (Accordion owns expansion state)', () => {
    const { result } = renderHook(() => useCurrencyScreen());
    expect(
      (result.current.state as unknown as Record<string, unknown>).isManualPanelOpen,
    ).toBeUndefined();
  });

  it('does not expose setManualPanelOpen (Accordion owns expansion state)', () => {
    const { result } = renderHook(() => useCurrencyScreen());
    expect(
      (result.current as unknown as Record<string, unknown>).setManualPanelOpen,
    ).toBeUndefined();
  });

  it('handleFetchRate sets fetchError on rejection', async () => {
    const setFetchErrorMock = jest.fn();
    const { useCurrencyScreenState } = require('@/modules/currency/screens/currency/currency.state');
    (useCurrencyScreenState as jest.Mock).mockImplementation((sel: any) =>
      sel({
        state: { isFetching: false, isSaving: false, fetchError: '' },
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

  it('handleFetchRate clears fetchError before fetching', async () => {
    const setFetchErrorMock = jest.fn();
    const { useCurrencyScreenState } = require('@/modules/currency/screens/currency/currency.state');
    (useCurrencyScreenState as jest.Mock).mockImplementation((sel: any) =>
      sel({
        state: { isFetching: false, isSaving: false, fetchError: 'old error' },
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
