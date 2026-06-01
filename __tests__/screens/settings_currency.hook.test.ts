import { signal } from '@preact/signals-react';
import { renderHook } from '@testing-library/react-native';

import { useCurrencyScreen } from '@/modules/currency/screens/currency/currency.hook';
import { useCurrencyScreenState } from '@/modules/currency/screens/currency/currency.state';
import { useCurrencyStore } from '@/modules/currency/store/currency.store';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));
jest.mock('@/modules/currency/store/currency.store', () => ({ useCurrencyStore: jest.fn() }));
jest.mock('@/modules/currency/screens/currency/currency.state', () => ({
  useCurrencyScreenState: jest.fn(),
}));

function setup() {
  (useCurrencyStore as unknown as jest.Mock).mockReturnValue({
    state: {
      rate: signal(50),
      lastFetched: signal<string | null>(null),
      isManualOverride: signal(false),
      rateUpdatedAt: signal<string | null>(null),
    },
    fetchRate: jest.fn().mockResolvedValue(undefined),
    setManualRate: jest.fn().mockResolvedValue(undefined),
  });
  (useCurrencyScreenState as unknown as jest.Mock).mockReturnValue({
    state: {
      isFetching: signal(false),
      isSaving: signal(false),
      fetchError: signal(''),
    },
    setFetching: jest.fn(),
    setSaving: jest.fn(),
    setFetchError: jest.fn(),
    reset: jest.fn(),
  });
}

describe('useCurrencyScreen', () => {
  beforeEach(setup);

  it('renders without throwing', () => {
    expect(() => renderHook(() => useCurrencyScreen())).not.toThrow();
  });

  it('rate is exposed from store as a signal', () => {
    const { result } = renderHook(() => useCurrencyScreen());
    expect(result.current.state.rate.value).toBe(50);
  });

  it('fetchError is exposed from screen state as a signal', () => {
    const { result } = renderHook(() => useCurrencyScreen());
    expect(result.current.state.fetchError.value).toBe('');
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

  it('does not expose goBack (Expo Router stack handles back navigation)', () => {
    const { result } = renderHook(() => useCurrencyScreen());
    expect((result.current as unknown as Record<string, unknown>).goBack).toBeUndefined();
  });

  it('formattedDate is exposed from state (null lastFetched -> never-fetched string)', () => {
    const { result } = renderHook(() => useCurrencyScreen());
    expect(typeof result.current.state.formattedDate).toBe('string');
    expect(result.current.state.formattedDate.length).toBeGreaterThan(0);
  });

  it('handleFetchRate sets fetchError on rejection', async () => {
    const setFetchErrorMock = jest.fn();
    (useCurrencyScreenState as unknown as jest.Mock).mockReturnValue({
      state: {
        isFetching: signal(false),
        isSaving: signal(false),
        fetchError: signal(''),
      },
      setFetching: jest.fn(),
      setSaving: jest.fn(),
      setFetchError: setFetchErrorMock,
      reset: jest.fn(),
    });
    (useCurrencyStore as unknown as jest.Mock).mockReturnValue({
      state: {
        rate: signal(50),
        lastFetched: signal<string | null>(null),
        isManualOverride: signal(false),
        rateUpdatedAt: signal<string | null>(null),
      },
      fetchRate: jest.fn().mockRejectedValue(new Error('Network error')),
      setManualRate: jest.fn().mockResolvedValue(undefined),
    });
    const { result } = renderHook(() => useCurrencyScreen());
    await result.current.handleFetchRate();
    expect(setFetchErrorMock).toHaveBeenCalledWith('Could not update rate. Try again.');
  });

  it('handleFetchRate clears fetchError before fetching', async () => {
    const setFetchErrorMock = jest.fn();
    (useCurrencyScreenState as unknown as jest.Mock).mockReturnValue({
      state: {
        isFetching: signal(false),
        isSaving: signal(false),
        fetchError: signal('old error'),
      },
      setFetching: jest.fn(),
      setSaving: jest.fn(),
      setFetchError: setFetchErrorMock,
      reset: jest.fn(),
    });
    (useCurrencyStore as unknown as jest.Mock).mockReturnValue({
      state: {
        rate: signal(50),
        lastFetched: signal<string | null>(null),
        isManualOverride: signal(false),
        rateUpdatedAt: signal<string | null>(null),
      },
      fetchRate: jest.fn().mockResolvedValue(undefined),
      setManualRate: jest.fn().mockResolvedValue(undefined),
    });
    const { result } = renderHook(() => useCurrencyScreen());
    await result.current.handleFetchRate();
    expect(setFetchErrorMock).toHaveBeenCalledWith('');
  });
});
