import { Strings } from '@/constants/strings';
import { resolveDeleteWarningBody } from '@/modules/accounts/screens/accounts/detail/components/delete_confirmation.helpers';
import { makeAccountCommitmentRef } from '@/test_helpers/commitment';

const GYM = makeAccountCommitmentRef({ id: 'com-1', name: 'Gym' });
const NETFLIX = makeAccountCommitmentRef({ id: 'com-2', name: 'Netflix' });
const CLOSE = Strings.accountDetailDeleteClose;

describe('resolveDeleteWarningBody', () => {
  it.each([
    [
      'nothing recorded and no commitment, the none sentence alone',
      0,
      [],
      Strings.accountDetailDeleteTransactionsNone,
    ],
    [
      'nothing recorded but one commitment, which keeps the close',
      0,
      [GYM],
      `${Strings.accountDetailDeleteTransactionsNone} ${Strings.accountDetailDeleteCommitmentOne('Gym')} ${CLOSE}`,
    ],
    ['one transaction', 1, [], `${Strings.accountDetailDeleteTransactionsOne} ${CLOSE}`],
    ['two transactions', 2, [], `${Strings.accountDetailDeleteTransactionsMany('2')} ${CLOSE}`],
    [
      'one commitment, named in the middle',
      3,
      [GYM],
      `${Strings.accountDetailDeleteTransactionsMany('3')} ${Strings.accountDetailDeleteCommitmentOne('Gym')} ${CLOSE}`,
    ],
    [
      'several commitments, counted in the middle',
      3,
      [GYM, NETFLIX],
      `${Strings.accountDetailDeleteTransactionsMany('3')} ${Strings.accountDetailDeleteCommitmentsMany('2')} ${CLOSE}`,
    ],
    [
      'a grouped transaction count',
      1204,
      [],
      `${Strings.accountDetailDeleteTransactionsMany('1,204')} ${CLOSE}`,
    ],
  ])('%s', (_label, transactionCount, activeCommitments, expected) => {
    expect(
      resolveDeleteWarningBody({
        transactionCount,
        activeCommitments,
        hasReplacementAccount: true,
      }),
    ).toBe(expected);
  });

  it('reads the Acceptance sentences for one commitment and a grouped count', () => {
    expect(
      resolveDeleteWarningBody({
        transactionCount: 1204,
        activeCommitments: [GYM],
        hasReplacementAccount: true,
      }),
    ).toBe(
      'Its 1,204 transactions stay, labelled Deleted Account. Gym will need another account. Keeping it archived keeps its name on all of them.',
    );
  });
});

describe('resolveDeleteWarningBody with no active account to take the commitments', () => {
  it.each([
    [
      'one commitment, named',
      [GYM],
      `${Strings.accountDetailDeleteTransactionsMany('3')} ${Strings.accountDetailDeleteCommitmentOneNoReplacement('Gym')} ${CLOSE}`,
    ],
    [
      'two commitments, counted',
      [GYM, NETFLIX],
      `${Strings.accountDetailDeleteTransactionsMany('3')} ${Strings.accountDetailDeleteCommitmentsManyNoReplacement('2')} ${CLOSE}`,
    ],
  ])('%s', (_label, activeCommitments, expected) => {
    expect(
      resolveDeleteWarningBody({
        transactionCount: 3,
        activeCommitments,
        hasReplacementAccount: false,
      }),
    ).toBe(expected);
  });

  it('reads the Acceptance sentence for one commitment', () => {
    expect(
      resolveDeleteWarningBody({
        transactionCount: 1,
        activeCommitments: [GYM],
        hasReplacementAccount: false,
      }),
    ).toBe(
      'Its 1 transaction stays, labelled Deleted Account. Gym will need an account before its next payment. Keeping it archived keeps its name on all of them.',
    );
  });

  it('leaves an account with no commitment on the plain sentences', () => {
    expect(
      resolveDeleteWarningBody({
        transactionCount: 2,
        activeCommitments: [],
        hasReplacementAccount: false,
      }),
    ).toBe(`${Strings.accountDetailDeleteTransactionsMany('2')} ${CLOSE}`);
  });
});
