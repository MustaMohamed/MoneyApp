import { act, renderHook } from '@testing-library/react-native';

import { usePaySheetState } from '@/modules/commitments/screens/commitments/detail/components/pay_sheet.state';
import { useCommitmentDetailState } from '@/modules/commitments/screens/commitments/detail/detail.state';

describe('useCommitmentDetailState', () => {
  it('starts with skipConfirmVisible false', () => {
    const { result } = renderHook(() => useCommitmentDetailState());

    expect(result.current.state.skipConfirmVisible.value).toBe(false);
  });

  it('setSkipConfirmVisible updates value', () => {
    const { result } = renderHook(() => useCommitmentDetailState());

    act(() => result.current.setSkipConfirmVisible(true));

    expect(result.current.state.skipConfirmVisible.value).toBe(true);
  });

  it('reset returns to initial state', () => {
    const { result } = renderHook(() => useCommitmentDetailState());

    act(() => {
      result.current.setSkipConfirmVisible(true);
      result.current.reset();
    });

    expect(result.current.state.skipConfirmVisible.value).toBe(false);
  });
});

describe('usePaySheetState', () => {
  beforeEach(() => {
    const { result, unmount } = renderHook(() => usePaySheetState());
    act(() => result.current.reset());
    unmount();
  });

  it('starts with all false', () => {
    const { result } = renderHook(() => usePaySheetState());

    expect(result.current.state.visible.value).toBe(false);
    expect(result.current.state.saving.value).toBe(false);
    expect(result.current.state.accountPickerVisible.value).toBe(false);
    expect(result.current.state.rateOverride.value).toBe(false);
  });

  it('setVisible updates visible', () => {
    const { result } = renderHook(() => usePaySheetState());

    act(() => result.current.setVisible(true));

    expect(result.current.state.visible.value).toBe(true);
  });

  it('shares visibility between opener and sheet hook instances', () => {
    const opener = renderHook(() => usePaySheetState());
    const sheet = renderHook(() => usePaySheetState());

    act(() => opener.result.current.setVisible(true));

    expect(sheet.result.current.state.visible.value).toBe(true);
  });

  it('setSaving updates saving', () => {
    const { result } = renderHook(() => usePaySheetState());

    act(() => result.current.setSaving(true));

    expect(result.current.state.saving.value).toBe(true);
  });

  it('setAccountPickerVisible updates accountPickerVisible', () => {
    const { result } = renderHook(() => usePaySheetState());

    act(() => result.current.setAccountPickerVisible(true));

    expect(result.current.state.accountPickerVisible.value).toBe(true);
  });

  it('setRateOverride updates rateOverride', () => {
    const { result } = renderHook(() => usePaySheetState());

    act(() => result.current.setRateOverride(true));

    expect(result.current.state.rateOverride.value).toBe(true);
  });

  it('reset returns to initial state', () => {
    const { result } = renderHook(() => usePaySheetState());

    act(() => {
      result.current.setVisible(true);
      result.current.setSaving(true);
      result.current.setAccountPickerVisible(true);
      result.current.setRateOverride(true);
      result.current.reset();
    });

    expect(result.current.state.visible.value).toBe(false);
    expect(result.current.state.saving.value).toBe(false);
    expect(result.current.state.accountPickerVisible.value).toBe(false);
    expect(result.current.state.rateOverride.value).toBe(false);
  });
});
