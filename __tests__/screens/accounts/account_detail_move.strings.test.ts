import { Strings } from '@/constants/strings';

describe('replacement account copy (E2, E3)', () => {
  it('names the no-replacement case in the confirmation, one shape per count', () => {
    expect(Strings.accountDetailDeleteCommitmentOneNoReplacement('Gym')).toBe(
      'Gym will need an account before its next payment.',
    );
    expect(Strings.accountDetailDeleteCommitmentsManyNoReplacement('2')).toBe(
      '2 commitments will need an account before their next payments.',
    );
  });

  it('titles the sheet by count', () => {
    expect(Strings.accountDetailMoveTitleOne).toBe('Move 1 commitment first');
    expect(Strings.accountDetailMoveTitleMany('2')).toBe('Move 2 commitments first');
  });

  it('names the commitment for one and counts several in the body', () => {
    expect(Strings.accountDetailMoveBodyOne('Gym', 'CIB')).toBe(
      'Gym is paid from CIB. Pick the account it uses from now on, then CIB is deleted.',
    );
    expect(Strings.accountDetailMoveBodyMany('1,204', 'CIB')).toBe(
      '1,204 commitments are paid from CIB. Pick the account they use from now on, then CIB is deleted.',
    );
  });

  it('joins a listed commitment’s amount, cadence and next date, dropping a missing date', () => {
    expect(Strings.accountDetailMoveCommitmentCaption('500 EGP', 'Every month', 'Oct 1')).toBe(
      '500 EGP · Every month · Oct 1',
    );
    expect(Strings.accountDetailMoveCommitmentCaption('500 EGP', 'Every month')).toBe(
      '500 EGP · Every month',
    );
  });

  it('ships the confirm label and the toast per count byte-exact', () => {
    expect(Strings.accountDetailMoveAndDelete).toBe('Move and delete');
    expect(Strings.accountDetailDeletedMovedOne('CIB', 'Gym', 'Cash')).toBe(
      'CIB deleted. Gym now uses Cash.',
    );
    expect(Strings.accountDetailDeletedMovedMany('CIB', '2', 'Cash')).toBe(
      'CIB deleted. 2 commitments now use Cash.',
    );
  });

  it('reuses the cancel label and the failure line, which never apologises', () => {
    expect(Strings.accountDetailCancel).toBe('Cancel');
    expect(Strings.accountDetailDeleteError).toBe(
      "Couldn't delete this account. Nothing was changed.",
    );
    expect(Strings.accountDetailDeleteError).not.toMatch(/sorry|apolog/i);
  });
});
