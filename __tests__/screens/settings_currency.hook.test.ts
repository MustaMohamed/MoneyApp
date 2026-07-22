import { act, renderHook } from '@testing-library/react-native';

import { useCurrencyScreen } from '@/modules/currency/screens/currency/currency.hook';
import { useCurrencyScreenState } from '@/modules/currency/screens/currency/currency.state';
import { useCurrencyStore } from '@/modules/currency/store/currency.store';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));
jest.mock('@/modules/currency/store/currency.store', () => ({ useCurrencyStore: jest.fn() }));
jest.mock('@/modules/currency/screens/currency/currency.state', () => ({
  useCurrencyScreenState: jest.fn(),
}));

function setup() {
  attachMockSelectorStore(useCurrencyStore as unknown as jest.Mock, () => ({
    rate: 50,
    lastFetched: null,
    isManualOverride: false,
    fetchRate: jest.fn().mockResolvedValue(undefined),
    setManualRate: jest.fn().mockResolvedValue(undefined),
  }));
  attachMockSelectorStore(useCurrencyScreenState as unknown as jest.Mock, () => ({
    isFetching: false,
    isSaving: false,
    fetchError: '',
    setFetching: jest.fn(),
    setSaving: jest.fn(),
    setFetchError: jest.fn(),
    reset: jest.fn(),
  }));
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

  it('does not expose goBack (Expo Router stack handles back navigation)', () => {
    const { result } = renderHook(() => useCurrencyScreen());
    expect((result.current as unknown as Record<string, unknown>).goBack).toBeUndefined();
  });

  it('formattedDate is exposed from state (null lastFetched → never-fetched string)', () => {
    const { result } = renderHook(() => useCurrencyScreen());
    expect(typeof result.current.state.formattedDate).toBe('string');
    expect(result.current.state.formattedDate.length).toBeGreaterThan(0);
  });

  it('handleFetchRate sets fetchError on rejection', async () => {
    const setFetchErrorMock = jest.fn();
    const {
      useCurrencyScreenState,
    } = require('@/modules/currency/screens/currency/currency.state');
    attachMockSelectorStore(useCurrencyScreenState as unknown as jest.Mock, () => ({
      isFetching: false,
      isSaving: false,
      fetchError: '',
      setFetching: jest.fn(),
      setSaving: jest.fn(),
      setFetchError: setFetchErrorMock,
      reset: jest.fn(),
    }));
    attachMockSelectorStore(useCurrencyStore as unknown as jest.Mock, () => ({
      rate: 50,
      lastFetched: null,
      isManualOverride: false,
      fetchRate: jest.fn().mockRejectedValue(new Error('Network error')),
      setManualRate: jest.fn().mockResolvedValue(undefined),
    }));
    const { result } = renderHook(() => useCurrencyScreen());
    await result.current.handleFetchRate();
    expect(setFetchErrorMock).toHaveBeenCalledWith('Could not update rate. Try again.');
  });

  it('handleFetchRate clears fetchError before fetching', async () => {
    const setFetchErrorMock = jest.fn();
    const {
      useCurrencyScreenState,
    } = require('@/modules/currency/screens/currency/currency.state');
    attachMockSelectorStore(useCurrencyScreenState as unknown as jest.Mock, () => ({
      isFetching: false,
      isSaving: false,
      fetchError: 'old error',
      setFetching: jest.fn(),
      setSaving: jest.fn(),
      setFetchError: setFetchErrorMock,
      reset: jest.fn(),
    }));
    attachMockSelectorStore(useCurrencyStore as unknown as jest.Mock, () => ({
      rate: 50,
      lastFetched: null,
      isManualOverride: false,
      fetchRate: jest.fn().mockResolvedValue(undefined),
      setManualRate: jest.fn().mockResolvedValue(undefined),
    }));
    const { result } = renderHook(() => useCurrencyScreen());
    await result.current.handleFetchRate();
    // First call should clear the error
    expect(setFetchErrorMock).toHaveBeenCalledWith('');
  });

  it('rejects malformed manual rate prefixes without saving', async () => {
    const setManualRate = jest.fn().mockResolvedValue(undefined);
    attachMockSelectorStore(useCurrencyStore as unknown as jest.Mock, () => ({
      rate: 50,
      lastFetched: null,
      isManualOverride: false,
      fetchRate: jest.fn().mockResolvedValue(undefined),
      setManualRate,
    }));
    const { result } = renderHook(() => useCurrencyScreen());

    act(() => result.current.form.setValue('rate', '50abc'));
    await act(async () => result.current.handleSaveManualRate());

    expect(setManualRate).not.toHaveBeenCalled();
  });

  it('normalizes a formatted manual rate before saving', async () => {
    const setManualRate = jest.fn().mockResolvedValue(undefined);
    attachMockSelectorStore(useCurrencyStore as unknown as jest.Mock, () => ({
      rate: 50,
      lastFetched: null,
      isManualOverride: false,
      fetchRate: jest.fn().mockResolvedValue(undefined),
      setManualRate,
    }));
    const { result } = renderHook(() => useCurrencyScreen());

    act(() => result.current.form.setValue('rate', '5,000'));
    await act(async () => result.current.handleSaveManualRate());

    expect(setManualRate).toHaveBeenCalledWith(5000);
  });
});
