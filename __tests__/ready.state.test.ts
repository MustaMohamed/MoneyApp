import { useReadyState } from '@/modules/onboarding/screens/onboarding/ready/ready.state';

beforeEach(() => useReadyState.getState().reset());

describe('readyState', () => {
  it('starts with completing=false', () => {
    expect(useReadyState.getState().completing).toBe(false);
  });

  it('setCompleting toggles', () => {
    useReadyState.getState().setCompleting(true);
    expect(useReadyState.getState().completing).toBe(true);
    useReadyState.getState().setCompleting(false);
    expect(useReadyState.getState().completing).toBe(false);
  });

  it('reset clears completing', () => {
    useReadyState.getState().setCompleting(true);
    useReadyState.getState().reset();
    expect(useReadyState.getState().completing).toBe(false);
  });
});
