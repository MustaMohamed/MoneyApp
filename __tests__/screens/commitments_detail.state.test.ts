import { usePaySheetState } from '@/modules/commitments/screens/commitments/detail/components/pay_sheet.state';
import { useCommitmentDetailState } from '@/modules/commitments/screens/commitments/detail/detail.state';

beforeEach(() => {
  useCommitmentDetailState.getState().reset();
  usePaySheetState.getState().reset();
});

describe('useCommitmentDetailState', () => {
  it('starts with skipConfirmVisible false', () => {
    expect(useCommitmentDetailState.getState().skipConfirmVisible).toBe(false);
  });

  it('setSkipConfirmVisible updates value', () => {
    useCommitmentDetailState.getState().setSkipConfirmVisible(true);
    expect(useCommitmentDetailState.getState().skipConfirmVisible).toBe(true);
  });

  it('reset returns to initial state', () => {
    useCommitmentDetailState.getState().setSkipConfirmVisible(true);
    useCommitmentDetailState.getState().reset();
    expect(useCommitmentDetailState.getState().skipConfirmVisible).toBe(false);
  });
});

describe('usePaySheetState', () => {
  it('starts with all false', () => {
    const s = usePaySheetState.getState();
    expect(s.visible).toBe(false);
    expect(s.saving).toBe(false);
    expect(s.accountPickerVisible).toBe(false);
  });

  it('setVisible updates visible', () => {
    usePaySheetState.getState().setVisible(true);
    expect(usePaySheetState.getState().visible).toBe(true);
  });

  it('setSaving updates saving', () => {
    usePaySheetState.getState().setSaving(true);
    expect(usePaySheetState.getState().saving).toBe(true);
  });

  it('setAccountPickerVisible updates accountPickerVisible', () => {
    usePaySheetState.getState().setAccountPickerVisible(true);
    expect(usePaySheetState.getState().accountPickerVisible).toBe(true);
  });

  it('reset returns to initial state', () => {
    usePaySheetState.getState().setVisible(true);
    usePaySheetState.getState().reset();
    expect(usePaySheetState.getState().visible).toBe(false);
  });
});
