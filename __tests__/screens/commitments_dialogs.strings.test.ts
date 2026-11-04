import { Strings } from '@/constants/strings';

const strings: Record<string, unknown> = Strings;

describe('Skip and Stop dialog copy (MA-224)', () => {
  it('reads the Skip dialog byte-exact', () => {
    expect(Strings.commitmentsSkipConfirmTitle).toBe('Skip this payment?');
    expect(Strings.commitmentsSkipConfirmBody('Rent', 'Thu 1 Oct', '8,000 EGP', 'October')).toBe(
      "Rent · Thu 1 Oct · 8,000 EGP won't count toward October. The commitment keeps going.",
    );
    expect(Strings.commitmentsSkipConfirmCancel).toBe('Cancel');
    expect(Strings.commitmentsSkipConfirmConfirm).toBe('Skip');
    expect(Strings.commitmentsSkipConfirmBusy).toBe('Skipping…');
  });

  it('reads the Stop dialog byte-exact', () => {
    expect(Strings.commitmentsStopConfirmTitle('Rent')).toBe('Stop Rent?');
    expect(Strings.commitmentsStopConfirmUnpaidOne).toBe('Its 1 unpaid payment is removed.');
    expect(Strings.commitmentsStopConfirmUnpaidMany('3')).toBe(
      'Its 3 unpaid payments are removed.',
    );
    expect(Strings.commitmentsStopConfirmPaidOne).toBe('The 1 paid one stays in your history.');
    expect(Strings.commitmentsStopConfirmPaidMany('9')).toBe(
      'The 9 paid ones stay in your history.',
    );
    expect(Strings.commitmentsStopConfirmNothingCharged).toBe('Nothing is charged.');
    expect(Strings.commitmentsStopConfirmCancel).toBe('Cancel');
    expect(Strings.commitmentsStopConfirmConfirm).toBe('Stop');
    expect(Strings.commitmentsStopConfirmBusy).toBe('Stopping…');
    expect(Strings.commitmentsStopError).toBe(
      "Couldn't stop this commitment. Nothing was changed.",
    );
  });

  it('reads the detail Stop button and the stopped toast byte-exact', () => {
    expect(Strings.commitmentsDetailStop).toBe('Stop');
    expect(Strings.commitmentsStoppedToast('Rent')).toBe('Rent stopped');
  });

  it('holds none of the keys the Copy block removes', () => {
    for (const key of [
      'commitmentsDeactivateTitle',
      'commitmentsDeactivateBody',
      'commitmentsDeactivateCancel',
      'commitmentsDeactivateConfirm',
      'commitmentsDeactivateError',
      'commitmentsEmptyTitle',
      'commitmentsEmptySub',
      'commitmentsEmptyCta',
      'commitmentsFieldCustomRecurrence',
    ]) {
      expect(strings[key]).toBeUndefined();
    }
  });
});

describe('Commitments copy sweep (MA-224)', () => {
  const commitmentValues = Object.entries(strings).filter(
    (entry): entry is [string, string] =>
      /commitment/i.test(entry[0]) && typeof entry[1] === 'string',
  );

  it('says no Could not, Please try again, Retry or Deactivate in any commitments string', () => {
    expect(commitmentValues.length).toBeGreaterThan(0);
    const offending = commitmentValues.filter(([, value]) =>
      /Could not|Please try again|Retry|Deactivate/.test(value),
    );

    expect(offending).toEqual([]);
  });

  it('reads no commitments string in Title Case', () => {
    const offending = commitmentValues.filter(([, value]) =>
      /\b[A-Z][a-z]+ [A-Z][a-z]+/.test(value),
    );

    expect(offending).toEqual([]);
  });
});
