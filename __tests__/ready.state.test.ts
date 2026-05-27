import { act, renderHook } from '@testing-library/react-native';

import { useReadyScreenState } from '@/modules/onboarding/screens/onboarding/ready/ready.state';

describe('readyState', () => {
  it('starts with completing=false', () => {
    const { result } = renderHook(() => useReadyScreenState());
    expect(result.current.state.completing.value).toBe(false);
  });

  it('setCompleting toggles', () => {
    const { result } = renderHook(() => useReadyScreenState());
    act(() => {
      result.current.setCompleting(true);
    });
    expect(result.current.state.completing.value).toBe(true);
    act(() => {
      result.current.setCompleting(false);
    });
    expect(result.current.state.completing.value).toBe(false);
  });
});
