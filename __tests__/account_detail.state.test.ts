import { useAccountDetailState } from '@/modules/accounts/screens/accounts/detail/account_detail.state';

describe('accountDetailState initial state', () => {
  beforeEach(() => {
    useAccountDetailState.getState().reset();
  });

  it('starts with all booleans false', () => {
    const state = useAccountDetailState.getState();

    expect(state.isEditing).toBe(false);
    expect(state.isAdjustVisible).toBe(false);
    expect(state.isArchiveVisible).toBe(false);
    expect(state.isSaving).toBe(false);
    expect(state.isAdjusting).toBe(false);
    expect(state.isArchiving).toBe(false);
    expect(state.isConfirmingBalanceReview).toBe(false);
  });
});

describe('accountDetailState setters', () => {
  beforeEach(() => {
    useAccountDetailState.getState().reset();
  });

  it('setEditing toggles', () => {
    useAccountDetailState.getState().setEditing(true);
    expect(useAccountDetailState.getState().isEditing).toBe(true);

    useAccountDetailState.getState().setEditing(false);
    expect(useAccountDetailState.getState().isEditing).toBe(false);
  });

  it('setAdjustVisible toggles', () => {
    useAccountDetailState.getState().setAdjustVisible(true);
    expect(useAccountDetailState.getState().isAdjustVisible).toBe(true);

    useAccountDetailState.getState().setAdjustVisible(false);
    expect(useAccountDetailState.getState().isAdjustVisible).toBe(false);
  });

  it('setArchiveVisible toggles', () => {
    useAccountDetailState.getState().setArchiveVisible(true);
    expect(useAccountDetailState.getState().isArchiveVisible).toBe(true);
  });

  it('setSaving toggles', () => {
    useAccountDetailState.getState().setSaving(true);
    expect(useAccountDetailState.getState().isSaving).toBe(true);

    useAccountDetailState.getState().setSaving(false);
    expect(useAccountDetailState.getState().isSaving).toBe(false);
  });

  it('setAdjusting toggles', () => {
    useAccountDetailState.getState().setAdjusting(true);
    expect(useAccountDetailState.getState().isAdjusting).toBe(true);

    useAccountDetailState.getState().setAdjusting(false);
    expect(useAccountDetailState.getState().isAdjusting).toBe(false);
  });

  it('setArchiving toggles', () => {
    useAccountDetailState.getState().setArchiving(true);
    expect(useAccountDetailState.getState().isArchiving).toBe(true);

    useAccountDetailState.getState().setArchiving(false);
    expect(useAccountDetailState.getState().isArchiving).toBe(false);
  });

  it('setConfirmingBalanceReview toggles', () => {
    useAccountDetailState.getState().setConfirmingBalanceReview(true);
    expect(useAccountDetailState.getState().isConfirmingBalanceReview).toBe(true);

    useAccountDetailState.getState().setConfirmingBalanceReview(false);
    expect(useAccountDetailState.getState().isConfirmingBalanceReview).toBe(false);
  });
});

describe('accountDetailState reset', () => {
  beforeEach(() => {
    useAccountDetailState.getState().reset();
  });

  it('resets every flag to false', () => {
    useAccountDetailState.getState().setEditing(true);
    useAccountDetailState.getState().setAdjustVisible(true);
    useAccountDetailState.getState().setArchiveVisible(true);
    useAccountDetailState.getState().setSaving(true);
    useAccountDetailState.getState().setAdjusting(true);
    useAccountDetailState.getState().setArchiving(true);
    useAccountDetailState.getState().setConfirmingBalanceReview(true);

    useAccountDetailState.getState().reset();

    const state = useAccountDetailState.getState();
    expect(state.isEditing).toBe(false);
    expect(state.isAdjustVisible).toBe(false);
    expect(state.isArchiveVisible).toBe(false);
    expect(state.isSaving).toBe(false);
    expect(state.isAdjusting).toBe(false);
    expect(state.isArchiving).toBe(false);
    expect(state.isConfirmingBalanceReview).toBe(false);
  });
});
