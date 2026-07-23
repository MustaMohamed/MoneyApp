import { createCurrencyScreenState } from '@/modules/currency/screens/currency/currency.state';

jest.mock('zustand', () => ({ create: jest.requireActual('zustand').create }));

describe('currencyScreenState initial state', () => {
  it('starts with all flags false', () => {
    const store = createCurrencyScreenState();
    const s = store.getState();
    expect(s.isFetching).toBe(false);
    expect(s.isSaving).toBe(false);
  });

  it('starts with fetchError as empty string', () => {
    const store = createCurrencyScreenState();
    expect(store.getState().fetchError).toBe('');
  });

  it('starts with saveError as empty string', () => {
    const store = createCurrencyScreenState();
    expect(store.getState().saveError).toBe('');
  });

  it('does not expose isManualPanelOpen (Accordion owns expansion state)', () => {
    const store = createCurrencyScreenState();
    expect(
      (store.getState() as unknown as Record<string, unknown>).isManualPanelOpen,
    ).toBeUndefined();
  });
});

describe('currencyScreenState setters', () => {
  it('setFetching toggles', () => {
    const store = createCurrencyScreenState();
    store.getState().setFetching(true);
    expect(store.getState().isFetching).toBe(true);
    store.getState().setFetching(false);
    expect(store.getState().isFetching).toBe(false);
  });

  it('setSaving toggles', () => {
    const store = createCurrencyScreenState();
    store.getState().setSaving(true);
    expect(store.getState().isSaving).toBe(true);
    store.getState().setSaving(false);
    expect(store.getState().isSaving).toBe(false);
  });

  it('setFetchError stores the error message', () => {
    const store = createCurrencyScreenState();
    store.getState().setFetchError('Could not update rate. Try again.');
    expect(store.getState().fetchError).toBe('Could not update rate. Try again.');
  });

  it('setFetchError can be cleared by setting empty string', () => {
    const store = createCurrencyScreenState();
    store.getState().setFetchError('Some error');
    store.getState().setFetchError('');
    expect(store.getState().fetchError).toBe('');
  });

  it('setSaveError stores and clears the error message', () => {
    const store = createCurrencyScreenState();
    store.getState().setSaveError('Could not save rate. Try again.');
    expect(store.getState().saveError).toBe('Could not save rate. Try again.');

    store.getState().setSaveError('');
    expect(store.getState().saveError).toBe('');
  });

  it('does not expose setManualPanelOpen (Accordion owns expansion state)', () => {
    const store = createCurrencyScreenState();
    expect(
      (store.getState() as unknown as Record<string, unknown>).setManualPanelOpen,
    ).toBeUndefined();
  });
});

describe('currencyScreenState reset', () => {
  it('clears every flag', () => {
    const store = createCurrencyScreenState();
    store.getState().setFetching(true);
    store.getState().setSaving(true);
    store.getState().reset();
    const s = store.getState();
    expect(s.isFetching).toBe(false);
    expect(s.isSaving).toBe(false);
  });

  it('clears fetch and save errors on reset', () => {
    const store = createCurrencyScreenState();
    store.getState().setFetchError('Some error');
    store.getState().setSaveError('Save error');
    store.getState().reset();
    expect(store.getState().fetchError).toBe('');
    expect(store.getState().saveError).toBe('');
  });
});
