import { useReadyState } from '@/screens/onboarding_v2/ready/ready.state';

beforeEach(() => {
  useReadyState.getState().reset();
});

describe('useReadyState', () => {
  it('initialises with completing = false', () => {
    expect(useReadyState.getState().state.completing).toBe(false);
  });

  it('setCompleting(true) flips completing on', () => {
    useReadyState.getState().setCompleting(true);
    expect(useReadyState.getState().state.completing).toBe(true);
  });

  it('setCompleting(false) flips completing off', () => {
    useReadyState.getState().setCompleting(true);
    useReadyState.getState().setCompleting(false);
    expect(useReadyState.getState().state.completing).toBe(false);
  });

  it('reset() returns completing to false', () => {
    useReadyState.getState().setCompleting(true);
    useReadyState.getState().reset();
    expect(useReadyState.getState().state.completing).toBe(false);
  });
});
