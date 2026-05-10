import { useSecurityStore } from '@/screens/onboarding/security/security.store';
import { SecurityChoice } from '@/constants/enums';

beforeEach(() => useSecurityStore.getState().reset());

describe('useSecurityStore', () => {
  it('starts with selected undefined', () => {
    expect(useSecurityStore.getState().state.selected).toBeUndefined();
  });

  it('setSelected updates selected', () => {
    useSecurityStore.getState().setSelected(SecurityChoice.Pin);
    expect(useSecurityStore.getState().state.selected).toBe(SecurityChoice.Pin);
  });

  it('setSelected can switch choice', () => {
    useSecurityStore.getState().setSelected(SecurityChoice.Pin);
    useSecurityStore.getState().setSelected(SecurityChoice.Biometric);
    expect(useSecurityStore.getState().state.selected).toBe(SecurityChoice.Biometric);
  });

  it('reset returns to initial state', () => {
    useSecurityStore.getState().setSelected(SecurityChoice.Skip);
    useSecurityStore.getState().reset();
    expect(useSecurityStore.getState().state.selected).toBeUndefined();
  });
});
