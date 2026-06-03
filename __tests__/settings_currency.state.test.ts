import { act, renderHook } from '@testing-library/react-native';

import { useCurrencyScreenState } from '@/modules/currency/screens/currency/currency.state';

describe('currencyScreenState initial state', () => {
  it('starts with all flags false', () => {
    const { result } = renderHook(() => useCurrencyScreenState());
    const { state } = result.current;

    expect(state.isFetching.value).toBe(false);
    expect(state.isSaving.value).toBe(false);
  });

  it('starts with fetchError as empty string', () => {
    const { result } = renderHook(() => useCurrencyScreenState());

    expect(result.current.state.fetchError.value).toBe('');
  });

  it('does not expose isManualPanelOpen (Accordion owns expansion state)', () => {
    const { result } = renderHook(() => useCurrencyScreenState());

    expect(
      (result.current.state as unknown as Record<string, unknown>).isManualPanelOpen,
    ).toBeUndefined();
  });
});

describe('currencyScreenState setters', () => {
  it('setFetching toggles', () => {
    const { result } = renderHook(() => useCurrencyScreenState());

    act(() => result.current.setFetching(true));
    expect(result.current.state.isFetching.value).toBe(true);

    act(() => result.current.setFetching(false));
    expect(result.current.state.isFetching.value).toBe(false);
  });

  it('setSaving toggles', () => {
    const { result } = renderHook(() => useCurrencyScreenState());

    act(() => result.current.setSaving(true));
    expect(result.current.state.isSaving.value).toBe(true);

    act(() => result.current.setSaving(false));
    expect(result.current.state.isSaving.value).toBe(false);
  });

  it('setFetchError stores the error message', () => {
    const { result } = renderHook(() => useCurrencyScreenState());

    act(() => result.current.setFetchError('Could not update rate. Try again.'));

    expect(result.current.state.fetchError.value).toBe('Could not update rate. Try again.');
  });

  it('setFetchError can be cleared by setting empty string', () => {
    const { result } = renderHook(() => useCurrencyScreenState());

    act(() => {
      result.current.setFetchError('Some error');
      result.current.setFetchError('');
    });

    expect(result.current.state.fetchError.value).toBe('');
  });

  it('does not expose setManualPanelOpen (Accordion owns expansion state)', () => {
    const { result } = renderHook(() => useCurrencyScreenState());

    expect(
      (result.current as unknown as Record<string, unknown>).setManualPanelOpen,
    ).toBeUndefined();
  });
});

describe('currencyScreenState reset', () => {
  it('clears every flag', () => {
    const { result } = renderHook(() => useCurrencyScreenState());

    act(() => {
      result.current.setFetching(true);
      result.current.setSaving(true);
      result.current.reset();
    });

    const { state } = result.current;
    expect(state.isFetching.value).toBe(false);
    expect(state.isSaving.value).toBe(false);
  });

  it('clears fetchError on reset', () => {
    const { result } = renderHook(() => useCurrencyScreenState());

    act(() => {
      result.current.setFetchError('Some error');
      result.current.reset();
    });

    expect(result.current.state.fetchError.value).toBe('');
  });
});
