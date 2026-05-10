import { useCurrencyStore } from '@/screens/onboarding/currency/currency.store';
import { Currency } from '@/constants/enums';

beforeEach(() => useCurrencyStore.getState().reset());

describe('useCurrencyStore', () => {
  it('starts with selected undefined', () => {
    expect(useCurrencyStore.getState().state.selected).toBeUndefined();
  });

  it('setSelected updates selected', () => {
    useCurrencyStore.getState().setSelected(Currency.EGP);
    expect(useCurrencyStore.getState().state.selected).toBe(Currency.EGP);
  });

  it('setSelected can switch currency', () => {
    useCurrencyStore.getState().setSelected(Currency.EGP);
    useCurrencyStore.getState().setSelected(Currency.USD);
    expect(useCurrencyStore.getState().state.selected).toBe(Currency.USD);
  });

  it('reset returns to initial state', () => {
    useCurrencyStore.getState().setSelected(Currency.EGP);
    useCurrencyStore.getState().reset();
    expect(useCurrencyStore.getState().state.selected).toBeUndefined();
  });
});
