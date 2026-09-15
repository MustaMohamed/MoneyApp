import { Strings } from '@/constants/strings';
import { resolveDeleteWarningBody } from '@/modules/accounts/screens/accounts/detail/components/delete_confirmation.helpers';

const GYM = { id: 'com-1', name: 'Gym' };
const NETFLIX = { id: 'com-2', name: 'Netflix' };
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
    expect(resolveDeleteWarningBody({ transactionCount, activeCommitments })).toBe(expected);
  });

  it('reads the Acceptance sentences for one commitment and a grouped count', () => {
    expect(resolveDeleteWarningBody({ transactionCount: 1204, activeCommitments: [GYM] })).toBe(
      'Its 1,204 transactions stay, labelled Deleted Account. Gym will need another account. Keeping it archived keeps its name on all of them.',
    );
  });
});
