import { useReplacementAccountSheetState } from '@/modules/accounts/screens/accounts/detail/components/replacement_account_sheet.state';

const sheetState = () => useReplacementAccountSheetState.getState();

describe('replacementAccountSheetState', () => {
  beforeEach(() => {
    sheetState().reset();
  });

  it('starts closed, with no selection, not busy and no failure', () => {
    expect(sheetState().isVisible).toBe(false);
    expect(sheetState().replacementAccountId).toBeUndefined();
    expect(sheetState().isMovingAndDeleting).toBe(false);
    expect(sheetState().moveAndDeleteError).toBeUndefined();
  });

  it('opens with the given selection and no leftover failure', () => {
    sheetState().setMoveAndDeleteError('Not deleted');

    sheetState().open('acc-2');

    expect(sheetState().isVisible).toBe(true);
    expect(sheetState().replacementAccountId).toBe('acc-2');
    expect(sheetState().moveAndDeleteError).toBeUndefined();
  });

  it('sets and clears each field', () => {
    sheetState().setVisible(true);
    sheetState().setReplacementAccountId('acc-2');
    sheetState().setMovingAndDeleting(true);
    sheetState().setMoveAndDeleteError('Not deleted');

    expect(sheetState()).toMatchObject({
      isVisible: true,
      replacementAccountId: 'acc-2',
      isMovingAndDeleting: true,
      moveAndDeleteError: 'Not deleted',
    });

    sheetState().setVisible(false);
    sheetState().setReplacementAccountId(undefined);
    sheetState().setMovingAndDeleting(false);
    sheetState().setMoveAndDeleteError(undefined);

    expect(sheetState().isVisible).toBe(false);
    expect(sheetState().replacementAccountId).toBeUndefined();
    expect(sheetState().isMovingAndDeleting).toBe(false);
    expect(sheetState().moveAndDeleteError).toBeUndefined();
  });

  it('reset clears all four', () => {
    sheetState().open('acc-2');
    sheetState().setMovingAndDeleting(true);
    sheetState().setMoveAndDeleteError('Not deleted');

    sheetState().reset();

    expect(sheetState().isVisible).toBe(false);
    expect(sheetState().replacementAccountId).toBeUndefined();
    expect(sheetState().isMovingAndDeleting).toBe(false);
    expect(sheetState().moveAndDeleteError).toBeUndefined();
  });
});
