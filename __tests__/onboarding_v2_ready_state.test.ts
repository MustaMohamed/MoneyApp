import { useReadyState } from '@/screens/onboarding_v2/ready/ready.state';

beforeEach(() => useReadyState.getState().reset());

describe('readyState (onboarding_v2)', () => {
  it('starts with completing=false', () => {
    expect(useReadyState.getState().state.completing).toBe(false);
  });

  it('setCompleting toggles true then false', () => {
    useReadyState.getState().setCompleting(true);
    expect(useReadyState.getState().state.completing).toBe(true);
    useReadyState.getState().setCompleting(false);
    expect(useReadyState.getState().state.completing).toBe(false);
  });

  it('reset clears completing', () => {
    useReadyState.getState().setCompleting(true);
    useReadyState.getState().reset();
    expect(useReadyState.getState().state.completing).toBe(false);
  });
});
