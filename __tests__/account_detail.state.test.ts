import { useAccountDetailState } from '@/modules/accounts/screens/accounts/detail/account_detail.state';

describe('accountDetailState initial state', () => {
  beforeEach(() => {
    useAccountDetailState.getState().reset();
  });

  it('starts with all booleans false', () => {
    const state = useAccountDetailState.getState();

    expect(state.isAdjustVisible).toBe(false);
    expect(state.isArchiveVisible).toBe(false);
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
    useAccountDetailState.getState().setAdjustVisible(true);
    useAccountDetailState.getState().setArchiveVisible(true);
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
    expect(state.isAdjustVisible).toBe(false);
    expect(state.isArchiveVisible).toBe(false);
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
