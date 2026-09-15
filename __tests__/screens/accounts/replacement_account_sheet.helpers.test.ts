import { AmountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import {
  buildReplacementCommitmentRow,
  resolveMovedToast,
  resolveMoveSheetCopy,
} from '@/modules/accounts/screens/accounts/detail/components/replacement_account_sheet.helpers';
import { makeAccountCommitmentRef } from '@/test_helpers/commitment';

const GYM = makeAccountCommitmentRef({ id: 'com-1', name: 'Gym' });

function refs(count: number) {
  return Array.from({ length: count }, (_, index) =>
    makeAccountCommitmentRef({ id: `com-${index}`, name: `Commitment ${index}` }),
  );
}

describe('buildReplacementCommitmentRow', () => {
  it('reads a fixed amount, the cadence and the next date', () => {
    expect(buildReplacementCommitmentRow(GYM)).toEqual({
      id: 'com-1',
      name: 'Gym',
      amount: '500 EGP',
      cadence: 'Every month',
      nextDate: 'Oct 1',
    });
  });

  it('marks a variable amount with an estimate with the tilde', () => {
    const row = buildReplacementCommitmentRow(
      makeAccountCommitmentRef({ amount_type: AmountType.Variable, amount: 1250 }),
    );

    expect(row.amount).toBe('~1,250 EGP');
  });

  it('reads a variable amount with no estimate as the variable label', () => {
    const row = buildReplacementCommitmentRow(
      makeAccountCommitmentRef({ amount_type: AmountType.Variable, amount: null }),
    );

    expect(row.amount).toBe(Strings.commitmentsAmountVariable);
  });

  it('leaves the date out when no unpaid payment exists', () => {
    expect(
      buildReplacementCommitmentRow(makeAccountCommitmentRef({ next_due_date: null })).nextDate,
    ).toBeUndefined();
  });
});

describe('resolveMoveSheetCopy', () => {
  it('names the one commitment', () => {
    expect(resolveMoveSheetCopy({ commitments: [GYM], accountName: 'CIB' })).toEqual({
      title: 'Move 1 commitment first',
      body: 'Gym is paid from CIB. Pick the account it uses from now on, then CIB is deleted.',
    });
  });

  it('counts two', () => {
    expect(resolveMoveSheetCopy({ commitments: refs(2), accountName: 'CIB' })).toEqual({
      title: 'Move 2 commitments first',
      body: '2 commitments are paid from CIB. Pick the account they use from now on, then CIB is deleted.',
    });
  });

  it('groups a large count', () => {
    expect(resolveMoveSheetCopy({ commitments: refs(1204), accountName: 'CIB' })).toEqual({
      title: 'Move 1,204 commitments first',
      body: '1,204 commitments are paid from CIB. Pick the account they use from now on, then CIB is deleted.',
    });
  });
});

describe('resolveMovedToast', () => {
  it('names the commitment and the account that took it over', () => {
    expect(
      resolveMovedToast({ accountName: 'CIB', commitments: [GYM], replacementName: 'Cash' }),
    ).toBe('CIB deleted. Gym now uses Cash.');
  });

  it('counts several', () => {
    expect(
      resolveMovedToast({ accountName: 'CIB', commitments: refs(2), replacementName: 'Cash' }),
    ).toBe('CIB deleted. 2 commitments now use Cash.');
  });
});
