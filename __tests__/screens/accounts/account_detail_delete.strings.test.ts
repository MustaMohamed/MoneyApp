import { Strings } from '@/constants/strings';

describe('delete confirmation copy (E1)', () => {
  it('labels the action and names the account in the title', () => {
    expect(Strings.accountDetailDelete).toBe('Delete account');
    expect(Strings.accountDetailDeleteTitle('CIB')).toBe('Delete CIB?');
  });

  it('titles a blank-named account with the shared label', () => {
    expect(Strings.accountDetailDeleteTitle(Strings.unnamedAccount)).toBe(
      'Delete Unnamed account?',
    );
  });

  it('opens with one string shape per transaction count case', () => {
    expect(Strings.accountDetailDeleteTransactionsNone).toBe(
      'Nothing is recorded on this account.',
    );
    expect(Strings.accountDetailDeleteTransactionsOne).toBe(
      'Its 1 transaction stays, labelled Deleted Account.',
    );
    expect(Strings.accountDetailDeleteTransactionsMany('1,204')).toBe(
      'Its 1,204 transactions stay, labelled Deleted Account.',
    );
  });

  it('names one commitment and counts several', () => {
    expect(Strings.accountDetailDeleteCommitmentOne('Gym')).toBe('Gym will need another account.');
    expect(Strings.accountDetailDeleteCommitmentsMany('2')).toBe(
      '2 commitments will need another account.',
    );
  });

  it('closes on what keeping it archived keeps', () => {
    expect(Strings.accountDetailDeleteClose).toBe(
      'Keeping it archived keeps its name on all of them.',
    );
  });

  it('ships the buttons, the busy label and the toast byte-exact', () => {
    expect(Strings.accountDetailDeleteKeep).toBe('Keep archived');
    expect(Strings.accountDetailDeleteConfirm).toBe('Delete');
    expect(Strings.accountDetailDeleting).toBe('Deleting…');
    expect(Strings.accountDetailDeleted('CIB')).toBe('CIB deleted.');
  });

  it('ships the failure line byte-exact, without apologising', () => {
    expect(Strings.accountDetailDeleteError).toBe(
      "Couldn't delete this account. Nothing was changed.",
    );
    expect(Strings.accountDetailDeleteError).not.toMatch(/sorry|apolog/i);
  });
});
