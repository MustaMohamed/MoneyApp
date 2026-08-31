import { act, renderHook, waitFor } from '@testing-library/react-native';

import { Currency } from '@/constants/enums';
import { useCurrencyScreen } from '@/modules/currency/screens/currency/currency.hook';
import { useCurrencyScreenState } from '@/modules/currency/screens/currency/currency.state';
import { useCurrencyStore } from '@/modules/currency/store/currency.store';
import { useOnboardingStore } from '@/modules/onboarding/store/onboarding.store';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));
jest.mock('@/modules/currency/store/currency.store', () => ({ useCurrencyStore: jest.fn() }));
jest.mock('@/modules/currency/screens/currency/currency.state', () => ({
  useCurrencyScreenState: jest.fn(),
}));
// Mocked for CONTROL of the base, not for safety — the real store's initial
// `baseCurrency` is already `Currency.EGP`. What it buys is the USD footer-note
// row below, which is the one test that fails if the hook hardcodes EGP.
jest.mock('@/modules/onboarding/store/onboarding.store', () => ({
  useOnboardingStore: jest.fn(),
}));

const IMPLAUSIBLE_WARNING = 'This rate is far outside the usual range.';

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
    rateWarning: '',
    saveError: '',
    setFetching: jest.fn(),
    setSaving: jest.fn(),
    setFetchError: jest.fn(),
    setRateWarning: jest.fn(),
    setSaveError: jest.fn(),
    reset: jest.fn(),
  }));
  attachMockSelectorStore(useOnboardingStore as unknown as jest.Mock, () => ({
    baseCurrency: Currency.EGP,
  }));
}

/** The screen state with `setRateWarning` spied; everything else as `setup()`. */
function attachScreenStateWithWarningSpy(setRateWarning: jest.Mock) {
  attachMockSelectorStore(useCurrencyScreenState as unknown as jest.Mock, () => ({
    isFetching: false,
    isSaving: false,
    fetchError: '',
    rateWarning: '',
    saveError: '',
    setFetching: jest.fn(),
    setSaving: jest.fn(),
    setFetchError: jest.fn(),
    setRateWarning,
    setSaveError: jest.fn(),
    reset: jest.fn(),
  }));
}

describe('useCurrencyScreen', () => {
  beforeEach(setup);

  it('renders without throwing', async () => {
    await expect(renderHook(() => useCurrencyScreen())).resolves.toBeDefined();
  });

  it('rate is exposed from store', async () => {
    const { result } = await renderHook(() => useCurrencyScreen());
    expect(result.current.state.rate).toBe(50);
  });

  it('fetchError is exposed from screen state', async () => {
    const { result } = await renderHook(() => useCurrencyScreen());
    expect(result.current.state.fetchError).toBe('');
  });

  it('does not expose isManualPanelOpen (Accordion owns expansion state)', async () => {
    const { result } = await renderHook(() => useCurrencyScreen());
    expect(
      (result.current.state as unknown as Record<string, unknown>).isManualPanelOpen,
    ).toBeUndefined();
  });

  it('does not expose setManualPanelOpen (Accordion owns expansion state)', async () => {
    const { result } = await renderHook(() => useCurrencyScreen());
    expect(
      (result.current as unknown as Record<string, unknown>).setManualPanelOpen,
    ).toBeUndefined();
  });

  it('does not expose goBack (Expo Router stack handles back navigation)', async () => {
    const { result } = await renderHook(() => useCurrencyScreen());
    expect((result.current as unknown as Record<string, unknown>).goBack).toBeUndefined();
  });

  it('formattedDate is exposed from state (null lastFetched → never-fetched string)', async () => {
    const { result } = await renderHook(() => useCurrencyScreen());
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
      rateWarning: '',
      saveError: '',
      setFetching: jest.fn(),
      setSaving: jest.fn(),
      setFetchError: setFetchErrorMock,
      setRateWarning: jest.fn(),
      setSaveError: jest.fn(),
      reset: jest.fn(),
    }));
    attachMockSelectorStore(useCurrencyStore as unknown as jest.Mock, () => ({
      rate: 50,
      lastFetched: null,
      isManualOverride: false,
      fetchRate: jest.fn().mockRejectedValue(new Error('Network error')),
      setManualRate: jest.fn().mockResolvedValue(undefined),
    }));
    const { result } = await renderHook(() => useCurrencyScreen());
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
      rateWarning: '',
      saveError: '',
      setFetching: jest.fn(),
      setSaving: jest.fn(),
      setFetchError: setFetchErrorMock,
      setRateWarning: jest.fn(),
      setSaveError: jest.fn(),
      reset: jest.fn(),
    }));
    attachMockSelectorStore(useCurrencyStore as unknown as jest.Mock, () => ({
      rate: 50,
      lastFetched: null,
      isManualOverride: false,
      fetchRate: jest.fn().mockResolvedValue(undefined),
      setManualRate: jest.fn().mockResolvedValue(undefined),
    }));
    const { result } = await renderHook(() => useCurrencyScreen());
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
    const { result } = await renderHook(() => useCurrencyScreen());

    await act(() => result.current.form.setValue('rate', '50abc'));
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
    const { result } = await renderHook(() => useCurrencyScreen());

    await act(() => result.current.form.setValue('rate', '5,000'));
    await act(async () => result.current.handleSaveManualRate());

    expect(setManualRate).toHaveBeenCalledWith(5000);
  });

  it('contains a manual-rate save failure and exposes a stable error', async () => {
    const setSaveError = jest.fn();
    const setManualRate = jest.fn().mockRejectedValue(new Error('disk failed'));
    attachMockSelectorStore(useCurrencyScreenState as unknown as jest.Mock, () => ({
      isFetching: false,
      isSaving: false,
      fetchError: '',
      rateWarning: '',
      saveError: '',
      setFetching: jest.fn(),
      setSaving: jest.fn(),
      setFetchError: jest.fn(),
      setRateWarning: jest.fn(),
      setSaveError,
      reset: jest.fn(),
    }));
    attachMockSelectorStore(useCurrencyStore as unknown as jest.Mock, () => ({
      rate: 50,
      lastFetched: null,
      isManualOverride: false,
      fetchRate: jest.fn().mockResolvedValue(undefined),
      setManualRate,
    }));
    const { result } = await renderHook(() => useCurrencyScreen());

    await act(() => result.current.form.setValue('rate', '48.5'));
    await act(async () => {
      await result.current.handleSaveManualRate();
    });

    expect(setManualRate).toHaveBeenCalledWith(48.5);
    await waitFor(() =>
      expect(setSaveError).toHaveBeenCalledWith('Could not save rate. Try again.'),
    );
  });
});

describe('useCurrencyScreen — the footer note follows the base currency', () => {
  beforeEach(setup);

  // The one row that fails if the hook hardcodes `Currency.EGP`. A pure-string
  // test of `Strings.currencyFooterNote(...)` would pass with the hook hardcoded
  // and pin nothing, so this asserts the published value.
  it('names US Dollar (USD) when the onboarding store publishes a USD base', async () => {
    attachMockSelectorStore(useOnboardingStore as unknown as jest.Mock, () => ({
      baseCurrency: Currency.USD,
    }));
    const { result } = await renderHook(() => useCurrencyScreen());
    expect(result.current.state.footerNote).toBe(
      'All balances and analytics are shown in US Dollar (USD).',
    );
  });

  // Byte-identical to the constant this key replaced, which is what makes
  // parameterising it a no-op for the entire current population.
  it('is byte-identical to the pre-parameterisation constant at an EGP base', async () => {
    const { result } = await renderHook(() => useCurrencyScreen());
    expect(result.current.state.footerNote).toBe(
      'All balances and analytics are shown in Egyptian Pound (EGP).',
    );
  });
});

describe('useCurrencyScreen — the rate plausibility warning', () => {
  beforeEach(setup);

  // Scenario 22: a rate stored below the band before this ticket surfaces on the
  // next Settings mount, from `defaultValues: { rate: String(rate) }`. No
  // migration, no repair, and no user input.
  it('warns on mount about an already-stored out-of-band rate', async () => {
    const setRateWarning = jest.fn();
    attachScreenStateWithWarningSpy(setRateWarning);
    attachMockSelectorStore(useCurrencyStore as unknown as jest.Mock, () => ({
      rate: 0.0001,
      lastFetched: null,
      isManualOverride: false,
      fetchRate: jest.fn().mockResolvedValue(undefined),
      setManualRate: jest.fn().mockResolvedValue(undefined),
    }));

    await renderHook(() => useCurrencyScreen());

    expect(setRateWarning).toHaveBeenCalledWith(IMPLAUSIBLE_WARNING);
  });

  it('publishes no warning on mount for a rate inside the band', async () => {
    const setRateWarning = jest.fn();
    attachScreenStateWithWarningSpy(setRateWarning);

    await renderHook(() => useCurrencyScreen());

    expect(setRateWarning).toHaveBeenCalledWith('');
    expect(setRateWarning).not.toHaveBeenCalledWith(IMPLAUSIBLE_WARNING);
  });

  // `shouldDirty` is what the Controller's `onChange` does on a real keystroke,
  // and it is the gate that makes the DRAFT the subject rather than the stored
  // rate — which is still a plausible 50 here.
  it('warns about an out-of-band value typed over a plausible stored rate', async () => {
    const setRateWarning = jest.fn();
    attachScreenStateWithWarningSpy(setRateWarning);
    const { result } = await renderHook(() => useCurrencyScreen());

    await act(() => result.current.form.setValue('rate', '0.005', { shouldDirty: true }));

    expect(setRateWarning).toHaveBeenLastCalledWith(IMPLAUSIBLE_WARNING);
  });

  it('clears the warning when the typed value comes back inside the band', async () => {
    const setRateWarning = jest.fn();
    attachScreenStateWithWarningSpy(setRateWarning);
    const { result } = await renderHook(() => useCurrencyScreen());

    await act(() => result.current.form.setValue('rate', '0.005', { shouldDirty: true }));
    await act(() => result.current.form.setValue('rate', '48.85', { shouldDirty: true }));

    expect(setRateWarning).toHaveBeenLastCalledWith('');
  });

  // Scenario 23, and the only cover on the background `refreshRateIfStale` path:
  // the field is never touched, so the store's rate is the subject. This row
  // fails if `rate` leaves the effect's dep array OR if the dirty gate leaves
  // the expression — the second is the more likely edit, because dropping it
  // looks like a simplification and mount still passes without it.
  it('warns when the store rate changes out of band under an untouched field', async () => {
    const setRateWarning = jest.fn();
    attachScreenStateWithWarningSpy(setRateWarning);
    const currencyState = {
      rate: 50,
      lastFetched: null,
      isManualOverride: false,
      fetchRate: jest.fn().mockResolvedValue(undefined),
      setManualRate: jest.fn().mockResolvedValue(undefined),
    };
    attachMockSelectorStore(useCurrencyStore as unknown as jest.Mock, () => currencyState);
    const { rerender } = await renderHook(() => useCurrencyScreen());
    expect(setRateWarning).toHaveBeenLastCalledWith('');

    currencyState.rate = 0.0001;
    await act(() => rerender(undefined));

    expect(setRateWarning).toHaveBeenLastCalledWith(IMPLAUSIBLE_WARNING);
  });
});
