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
    expect(state.balanceReviewError).toBeUndefined();
    expect(state.isDeleteVisible).toBe(false);
    expect(state.isDeleting).toBe(false);
    expect(state.deleteError).toBeUndefined();
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

  it('sets and clears the balance review error', () => {
    useAccountDetailState.getState().setBalanceReviewError('Try again');
    expect(useAccountDetailState.getState().balanceReviewError).toBe('Try again');

    useAccountDetailState.getState().setBalanceReviewError(undefined);
    expect(useAccountDetailState.getState().balanceReviewError).toBeUndefined();
  });

  it('setUnarchiving toggles', () => {
    useAccountDetailState.getState().setUnarchiving(true);
    expect(useAccountDetailState.getState().isUnarchiving).toBe(true);

    useAccountDetailState.getState().setUnarchiving(false);
    expect(useAccountDetailState.getState().isUnarchiving).toBe(false);
  });

  it('sets and clears the unarchive error', () => {
    useAccountDetailState.getState().setUnarchiveError('Not restored');
    expect(useAccountDetailState.getState().unarchiveError).toBe('Not restored');

    useAccountDetailState.getState().setUnarchiveError(undefined);
    expect(useAccountDetailState.getState().unarchiveError).toBeUndefined();
  });

  it('setDeleteVisible toggles', () => {
    useAccountDetailState.getState().setDeleteVisible(true);
    expect(useAccountDetailState.getState().isDeleteVisible).toBe(true);

    useAccountDetailState.getState().setDeleteVisible(false);
    expect(useAccountDetailState.getState().isDeleteVisible).toBe(false);
  });

  it('setDeleting toggles', () => {
    useAccountDetailState.getState().setDeleting(true);
    expect(useAccountDetailState.getState().isDeleting).toBe(true);

    useAccountDetailState.getState().setDeleting(false);
    expect(useAccountDetailState.getState().isDeleting).toBe(false);
  });

  it('sets and clears the delete error', () => {
    useAccountDetailState.getState().setDeleteError('Not deleted');
    expect(useAccountDetailState.getState().deleteError).toBe('Not deleted');

    useAccountDetailState.getState().setDeleteError(undefined);
    expect(useAccountDetailState.getState().deleteError).toBeUndefined();
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
    useAccountDetailState.getState().setBalanceReviewError('Try again');
    useAccountDetailState.getState().setUnarchiving(true);
    useAccountDetailState.getState().setUnarchiveError('Not restored');
    useAccountDetailState.getState().setDeleteVisible(true);
    useAccountDetailState.getState().setDeleting(true);
    useAccountDetailState.getState().setDeleteError('Not deleted');

    useAccountDetailState.getState().reset();

    const state = useAccountDetailState.getState();
    expect(state.isEditing).toBe(false);
    expect(state.isAdjustVisible).toBe(false);
    expect(state.isArchiveVisible).toBe(false);
    expect(state.isSaving).toBe(false);
    expect(state.isAdjusting).toBe(false);
    expect(state.isArchiving).toBe(false);
    expect(state.isConfirmingBalanceReview).toBe(false);
    expect(state.balanceReviewError).toBeUndefined();
    expect(state.isUnarchiving).toBe(false);
    expect(state.unarchiveError).toBeUndefined();
    expect(state.isDeleteVisible).toBe(false);
    expect(state.isDeleting).toBe(false);
    expect(state.deleteError).toBeUndefined();
  });
});

describe('accountDetailState replacement sheet', () => {
  beforeEach(() => {
    useAccountDetailState.getState().reset();
  });

  it('starts closed, with no selection, not busy and no failure', () => {
    const state = useAccountDetailState.getState();

    expect(state.isReplacementVisible).toBe(false);
    expect(state.replacementAccountId).toBeUndefined();
    expect(state.isMovingAndDeleting).toBe(false);
    expect(state.moveAndDeleteError).toBeUndefined();
  });

  it('sets and clears each field', () => {
    const detail = useAccountDetailState.getState();
    detail.setReplacementVisible(true);
    detail.setReplacementAccountId('acc-2');
    detail.setMovingAndDeleting(true);
    detail.setMoveAndDeleteError('Not deleted');

    expect(useAccountDetailState.getState()).toMatchObject({
      isReplacementVisible: true,
      replacementAccountId: 'acc-2',
      isMovingAndDeleting: true,
      moveAndDeleteError: 'Not deleted',
    });

    detail.setReplacementVisible(false);
    detail.setReplacementAccountId(undefined);
    detail.setMovingAndDeleting(false);
    detail.setMoveAndDeleteError(undefined);

    const cleared = useAccountDetailState.getState();
    expect(cleared.isReplacementVisible).toBe(false);
    expect(cleared.replacementAccountId).toBeUndefined();
    expect(cleared.isMovingAndDeleting).toBe(false);
    expect(cleared.moveAndDeleteError).toBeUndefined();
  });

  it('reset clears all four', () => {
    const detail = useAccountDetailState.getState();
    detail.setReplacementVisible(true);
    detail.setReplacementAccountId('acc-2');
    detail.setMovingAndDeleting(true);
    detail.setMoveAndDeleteError('Not deleted');

    detail.reset();

    const state = useAccountDetailState.getState();
    expect(state.isReplacementVisible).toBe(false);
    expect(state.replacementAccountId).toBeUndefined();
    expect(state.isMovingAndDeleting).toBe(false);
    expect(state.moveAndDeleteError).toBeUndefined();
  });
});
