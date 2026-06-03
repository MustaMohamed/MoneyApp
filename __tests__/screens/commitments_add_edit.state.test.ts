import { act, renderHook } from '@testing-library/react-native';

import { useAddCommitmentState } from '@/modules/commitments/screens/commitments/add_commitment/add_commitment.state';
import { useEditCommitmentState } from '@/modules/commitments/screens/commitments/edit_commitment/edit_commitment.state';

describe('useAddCommitmentState', () => {
  it('starts with saving false', () => {
    const { result } = renderHook(() => useAddCommitmentState());

    expect(result.current.state.saving.value).toBe(false);
  });

  it('setSaving updates saving', () => {
    const { result } = renderHook(() => useAddCommitmentState());

    act(() => result.current.setSaving(true));

    expect(result.current.state.saving.value).toBe(true);
  });

  it('reset returns to initial state', () => {
    const { result } = renderHook(() => useAddCommitmentState());

    act(() => {
      result.current.setSaving(true);
      result.current.reset();
    });

    expect(result.current.state.saving.value).toBe(false);
  });
});

describe('useEditCommitmentState', () => {
  it('starts with saving false and deactivateDialogVisible false', () => {
    const { result } = renderHook(() => useEditCommitmentState());

    expect(result.current.state.saving.value).toBe(false);
    expect(result.current.state.deactivateDialogVisible.value).toBe(false);
  });

  it('setSaving updates saving', () => {
    const { result } = renderHook(() => useEditCommitmentState());

    act(() => result.current.setSaving(true));

    expect(result.current.state.saving.value).toBe(true);
  });

  it('setDeactivateDialogVisible updates deactivateDialogVisible', () => {
    const { result } = renderHook(() => useEditCommitmentState());

    act(() => result.current.setDeactivateDialogVisible(true));

    expect(result.current.state.deactivateDialogVisible.value).toBe(true);
  });

  it('reset returns to initial state', () => {
    const { result } = renderHook(() => useEditCommitmentState());

    act(() => {
      result.current.setSaving(true);
      result.current.setDeactivateDialogVisible(true);
      result.current.reset();
    });

    expect(result.current.state.saving.value).toBe(false);
    expect(result.current.state.deactivateDialogVisible.value).toBe(false);
  });
});
