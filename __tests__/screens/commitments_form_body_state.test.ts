import { act, renderHook } from '@testing-library/react-native';

import { useCommitmentFormBodyState } from '@/modules/commitments/screens/commitments/components/commitment_form_body.state';

describe('useCommitmentFormBodyState initial state', () => {
  it('starts with every picker and date picker hidden', () => {
    const { result } = renderHook(() => useCommitmentFormBodyState());

    expect(result.current.state.categoryPickerVisible.value).toBe(false);
    expect(result.current.state.accountPickerVisible.value).toBe(false);
    expect(result.current.state.showStartDatePicker.value).toBe(false);
    expect(result.current.state.showEndDatePicker.value).toBe(false);
  });
});

describe('useCommitmentFormBodyState setters', () => {
  it('setCategoryPickerVisible toggles the category picker', () => {
    const { result } = renderHook(() => useCommitmentFormBodyState());

    act(() => result.current.setCategoryPickerVisible(true));
    expect(result.current.state.categoryPickerVisible.value).toBe(true);

    act(() => result.current.setCategoryPickerVisible(false));
    expect(result.current.state.categoryPickerVisible.value).toBe(false);
  });

  it('setAccountPickerVisible toggles the account picker', () => {
    const { result } = renderHook(() => useCommitmentFormBodyState());

    act(() => result.current.setAccountPickerVisible(true));
    expect(result.current.state.accountPickerVisible.value).toBe(true);

    act(() => result.current.setAccountPickerVisible(false));
    expect(result.current.state.accountPickerVisible.value).toBe(false);
  });

  it('setShowStartDatePicker toggles the start-date picker', () => {
    const { result } = renderHook(() => useCommitmentFormBodyState());

    act(() => result.current.setShowStartDatePicker(true));
    expect(result.current.state.showStartDatePicker.value).toBe(true);

    act(() => result.current.setShowStartDatePicker(false));
    expect(result.current.state.showStartDatePicker.value).toBe(false);
  });

  it('setShowEndDatePicker toggles the end-date picker', () => {
    const { result } = renderHook(() => useCommitmentFormBodyState());

    act(() => result.current.setShowEndDatePicker(true));
    expect(result.current.state.showEndDatePicker.value).toBe(true);

    act(() => result.current.setShowEndDatePicker(false));
    expect(result.current.state.showEndDatePicker.value).toBe(false);
  });
});

describe('useCommitmentFormBodyState reset', () => {
  it('returns every field to its initial value', () => {
    const { result } = renderHook(() => useCommitmentFormBodyState());

    act(() => {
      result.current.setCategoryPickerVisible(true);
      result.current.setAccountPickerVisible(true);
      result.current.setShowStartDatePicker(true);
      result.current.setShowEndDatePicker(true);
      result.current.reset();
    });

    expect(result.current.state.categoryPickerVisible.value).toBe(false);
    expect(result.current.state.accountPickerVisible.value).toBe(false);
    expect(result.current.state.showStartDatePicker.value).toBe(false);
    expect(result.current.state.showEndDatePicker.value).toBe(false);
  });
});
