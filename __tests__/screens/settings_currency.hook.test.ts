import { act, renderHook } from '@testing-library/react-native';

import { Strings } from '@/constants/strings';
import { useCurrencyScreen } from '@/modules/currency/screens/currency/currency.hook';
import { type CurrencyStore, useCurrencyStore } from '@/modules/currency/store/currency.store';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));
jest.mock('@/modules/currency/store/currency.store', () => ({ useCurrencyStore: jest.fn() }));

const mockedUseCurrencyStore = useCurrencyStore as jest.MockedFunction<typeof useCurrencyStore>;

function setup(overrides: Partial<CurrencyStore> = {}) {
  const store = {
    rate: 50,
    lastFetched: null,
    isManualOverride: false,
    fetchRate: jest.fn().mockResolvedValue(undefined),
    setManualRate: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as CurrencyStore;

  mockedUseCurrencyStore.mockReturnValue(store);
  return store;
}

describe('useCurrencyScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setup();
  });

  it('renders without throwing', () => {
    expect(() => renderHook(() => useCurrencyScreen())).not.toThrow();
  });

  it('rate is exposed from store', () => {
    const { result } = renderHook(() => useCurrencyScreen());

    expect(result.current.state.rate).toBe(50);
  });

  it('fetchError is exposed from screen state', () => {
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

    expect(result.current.state.formattedDate).toBe(Strings.currencyNeverFetched);
  });

  it('formats lastFetched from the MobX store field', () => {
    setup({ lastFetched: '2026-06-03T12:00:00.000Z' } as Partial<CurrencyStore>);

    const { result } = renderHook(() => useCurrencyScreen());

    expect(result.current.state.formattedDate).toBe('Jun 3, 2026');
  });

  it('handleFetchRate sets fetchError on rejection', async () => {
    const store = setup({
      fetchRate: jest.fn().mockRejectedValue(new Error('Network error')),
    } as Partial<CurrencyStore>);
    const { result } = renderHook(() => useCurrencyScreen());

    await act(async () => {
      await result.current.handleFetchRate();
    });

    expect(store.fetchRate).toHaveBeenCalledTimes(1);
    expect(result.current.state.fetchError.value).toBe(Strings.currencyFetchError);
    expect(result.current.state.isFetching.value).toBe(false);
  });

  it('handleFetchRate clears a previous fetchError before fetching', async () => {
    const fetchRate = jest
      .fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(undefined);
    setup({ fetchRate } as Partial<CurrencyStore>);
    const { result } = renderHook(() => useCurrencyScreen());

    await act(async () => {
      await result.current.handleFetchRate();
    });
    expect(result.current.state.fetchError.value).toBe(Strings.currencyFetchError);

    await act(async () => {
      await result.current.handleFetchRate();
    });

    expect(result.current.state.fetchError.value).toBe('');
  });
});
