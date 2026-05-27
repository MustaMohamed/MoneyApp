import { useCommitmentFormBodyState } from '@/modules/commitments/screens/commitments/components/commitment_form_body.state';

beforeEach(() => {
  useCommitmentFormBodyState.getState().reset();
});

describe('useCommitmentFormBodyState initial state', () => {
  it('starts with every picker and date picker hidden', () => {
    const s = useCommitmentFormBodyState.getState();
    expect(s.categoryPickerVisible).toBe(false);
    expect(s.accountPickerVisible).toBe(false);
    expect(s.showStartDatePicker).toBe(false);
    expect(s.showEndDatePicker).toBe(false);
  });
});

describe('useCommitmentFormBodyState setters', () => {
  it('setCategoryPickerVisible toggles the category picker', () => {
    useCommitmentFormBodyState.getState().setCategoryPickerVisible(true);
    expect(useCommitmentFormBodyState.getState().categoryPickerVisible).toBe(true);
    useCommitmentFormBodyState.getState().setCategoryPickerVisible(false);
    expect(useCommitmentFormBodyState.getState().categoryPickerVisible).toBe(false);
  });

  it('setAccountPickerVisible toggles the account picker', () => {
    useCommitmentFormBodyState.getState().setAccountPickerVisible(true);
    expect(useCommitmentFormBodyState.getState().accountPickerVisible).toBe(true);
    useCommitmentFormBodyState.getState().setAccountPickerVisible(false);
    expect(useCommitmentFormBodyState.getState().accountPickerVisible).toBe(false);
  });

  it('setShowStartDatePicker toggles the start-date picker', () => {
    useCommitmentFormBodyState.getState().setShowStartDatePicker(true);
    expect(useCommitmentFormBodyState.getState().showStartDatePicker).toBe(true);
    useCommitmentFormBodyState.getState().setShowStartDatePicker(false);
    expect(useCommitmentFormBodyState.getState().showStartDatePicker).toBe(false);
  });

  it('setShowEndDatePicker toggles the end-date picker', () => {
    useCommitmentFormBodyState.getState().setShowEndDatePicker(true);
    expect(useCommitmentFormBodyState.getState().showEndDatePicker).toBe(true);
    useCommitmentFormBodyState.getState().setShowEndDatePicker(false);
    expect(useCommitmentFormBodyState.getState().showEndDatePicker).toBe(false);
  });
});

describe('useCommitmentFormBodyState reset', () => {
  it('returns every field to its initial value', () => {
    useCommitmentFormBodyState.getState().setCategoryPickerVisible(true);
    useCommitmentFormBodyState.getState().setAccountPickerVisible(true);
    useCommitmentFormBodyState.getState().setShowStartDatePicker(true);
    useCommitmentFormBodyState.getState().setShowEndDatePicker(true);
    useCommitmentFormBodyState.getState().reset();
    const s = useCommitmentFormBodyState.getState();
    expect(s.categoryPickerVisible).toBe(false);
    expect(s.accountPickerVisible).toBe(false);
    expect(s.showStartDatePicker).toBe(false);
    expect(s.showEndDatePicker).toBe(false);
  });
});
