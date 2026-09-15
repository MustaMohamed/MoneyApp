import { useEffect, useId, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { INITIAL_PICKER_ENTRY, useCommitmentFormBodyState } from './commitment_form_body.state';

export function useCommitmentFormBodyPickers() {
  const owner = useId();
  const { categoryPickerVisible, accountPickerVisible, showStartDatePicker, showEndDatePicker } =
    useCommitmentFormBodyState(useShallow((s) => s.entries[owner] ?? INITIAL_PICKER_ENTRY));
  const claim = useCommitmentFormBodyState.getState().claim;
  const release = useCommitmentFormBodyState.getState().release;

  useEffect(() => {
    claim(owner);
    return () => release(owner);
  }, [owner, claim, release]);

  const setters = useMemo(() => {
    const state = useCommitmentFormBodyState.getState();
    return {
      setCategoryPickerVisible: (v: boolean) => state.setCategoryPickerVisible(owner, v),
      setAccountPickerVisible: (v: boolean) => state.setAccountPickerVisible(owner, v),
      setShowStartDatePicker: (v: boolean) => state.setShowStartDatePicker(owner, v),
      setShowEndDatePicker: (v: boolean) => state.setShowEndDatePicker(owner, v),
    };
  }, [owner]);

  return {
    state: { categoryPickerVisible, accountPickerVisible, showStartDatePicker, showEndDatePicker },
    ...setters,
  };
}
