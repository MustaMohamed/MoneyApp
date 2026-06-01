import { act, renderHook } from '@testing-library/react-native';

import { useAccountDetailState } from '@/modules/accounts/screens/accounts/detail/account_detail.state';

describe('accountDetailState initial state', () => {
  it('starts with all booleans false', () => {
    const { result } = renderHook(() => useAccountDetailState());
    const { state } = result.current;
    expect(state.isEditing.value).toBe(false);
    expect(state.isAdjustVisible.value).toBe(false);
    expect(state.isArchiveVisible.value).toBe(false);
    expect(state.isSaving.value).toBe(false);
    expect(state.isAdjusting.value).toBe(false);
    expect(state.isArchiving.value).toBe(false);
  });
});

describe('accountDetailState setters', () => {
  it('setEditing toggles', () => {
    const { result } = renderHook(() => useAccountDetailState());
    act(() => result.current.setEditing(true));
    expect(result.current.state.isEditing.value).toBe(true);
    act(() => result.current.setEditing(false));
    expect(result.current.state.isEditing.value).toBe(false);
  });

  it('setAdjustVisible toggles', () => {
    const { result } = renderHook(() => useAccountDetailState());
    act(() => result.current.setAdjustVisible(true));
    expect(result.current.state.isAdjustVisible.value).toBe(true);
    act(() => result.current.setAdjustVisible(false));
    expect(result.current.state.isAdjustVisible.value).toBe(false);
  });

  it('setArchiveVisible toggles', () => {
    const { result } = renderHook(() => useAccountDetailState());
    act(() => result.current.setArchiveVisible(true));
    expect(result.current.state.isArchiveVisible.value).toBe(true);
  });

  it('setSaving toggles', () => {
    const { result } = renderHook(() => useAccountDetailState());
    act(() => result.current.setSaving(true));
    expect(result.current.state.isSaving.value).toBe(true);
    act(() => result.current.setSaving(false));
    expect(result.current.state.isSaving.value).toBe(false);
  });

  it('setAdjusting toggles', () => {
    const { result } = renderHook(() => useAccountDetailState());
    act(() => result.current.setAdjusting(true));
    expect(result.current.state.isAdjusting.value).toBe(true);
    act(() => result.current.setAdjusting(false));
    expect(result.current.state.isAdjusting.value).toBe(false);
  });

  it('setArchiving toggles', () => {
    const { result } = renderHook(() => useAccountDetailState());
    act(() => result.current.setArchiving(true));
    expect(result.current.state.isArchiving.value).toBe(true);
    act(() => result.current.setArchiving(false));
    expect(result.current.state.isArchiving.value).toBe(false);
  });
});

describe('accountDetailState reset', () => {
  it('resets every flag to false', () => {
    const { result } = renderHook(() => useAccountDetailState());
    act(() => {
      result.current.setEditing(true);
      result.current.setAdjustVisible(true);
      result.current.setArchiveVisible(true);
      result.current.setSaving(true);
      result.current.setAdjusting(true);
      result.current.setArchiving(true);
    });

    act(() => result.current.reset());

    const { state } = result.current;
    expect(state.isEditing.value).toBe(false);
    expect(state.isAdjustVisible.value).toBe(false);
    expect(state.isArchiveVisible.value).toBe(false);
    expect(state.isSaving.value).toBe(false);
    expect(state.isAdjusting.value).toBe(false);
    expect(state.isArchiving.value).toBe(false);
  });
});
