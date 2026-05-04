import { createCurrencyScreenState } from '@/screens/settings/currency/currency.state';

jest.mock('zustand', () => ({ create: jest.requireActual('zustand').create }));

describe('currencyScreenState initial state', () => {
  it('starts with all flags false', () => {
    const store = createCurrencyScreenState();
    const s = store.getState().state;
    expect(s.isManualPanelOpen).toBe(false);
    expect(s.isFetching).toBe(false);
    expect(s.isSaving).toBe(false);
  });
});

describe('currencyScreenState setters', () => {
  it('setManualPanelOpen toggles', () => {
    const store = createCurrencyScreenState();
    store.getState().setManualPanelOpen(true);
    expect(store.getState().state.isManualPanelOpen).toBe(true);
    store.getState().setManualPanelOpen(false);
    expect(store.getState().state.isManualPanelOpen).toBe(false);
  });

  it('setFetching toggles', () => {
    const store = createCurrencyScreenState();
    store.getState().setFetching(true);
    expect(store.getState().state.isFetching).toBe(true);
    store.getState().setFetching(false);
    expect(store.getState().state.isFetching).toBe(false);
  });

  it('setSaving toggles', () => {
    const store = createCurrencyScreenState();
    store.getState().setSaving(true);
    expect(store.getState().state.isSaving).toBe(true);
    store.getState().setSaving(false);
    expect(store.getState().state.isSaving).toBe(false);
  });
});

describe('currencyScreenState reset', () => {
  it('clears every flag', () => {
    const store = createCurrencyScreenState();
    store.getState().setManualPanelOpen(true);
    store.getState().setFetching(true);
    store.getState().setSaving(true);
    store.getState().reset();
    const s = store.getState().state;
    expect(s.isManualPanelOpen).toBe(false);
    expect(s.isFetching).toBe(false);
    expect(s.isSaving).toBe(false);
  });
});
