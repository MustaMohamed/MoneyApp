import { useWelcomeState } from '@/screens/onboarding_v2/welcome/welcome.state';
import { Currency } from '@/constants/enums';

beforeEach(() => useWelcomeState.getState().reset());

describe('useWelcomeState', () => {
  it('starts with selected undefined', () => {
    expect(useWelcomeState.getState().state.selected).toBeUndefined();
  });

  it('setSelected updates selected currency', () => {
    useWelcomeState.getState().setSelected(Currency.EGP);
    expect(useWelcomeState.getState().state.selected).toBe(Currency.EGP);
  });

  it('setSelected can switch currency', () => {
    useWelcomeState.getState().setSelected(Currency.EGP);
    useWelcomeState.getState().setSelected(Currency.USD);
    expect(useWelcomeState.getState().state.selected).toBe(Currency.USD);
  });

  it('reset returns selected to undefined', () => {
    useWelcomeState.getState().setSelected(Currency.EGP);
    useWelcomeState.getState().reset();
    expect(useWelcomeState.getState().state.selected).toBeUndefined();
  });
});
