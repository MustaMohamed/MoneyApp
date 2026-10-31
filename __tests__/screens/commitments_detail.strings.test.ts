import { Strings } from '@/constants/strings';

describe('commitment detail state copy (MA-216)', () => {
  it('ships the header, edit pencil and skeleton labels byte-exact from the Copy note', () => {
    expect({
      header: Strings.commitmentsDetailHeader,
      editAccessibility: Strings.commitmentsDetailEditAccessibility,
      loading: Strings.commitmentsDetailLoadingA11y,
    }).toEqual({
      header: 'Commitment',
      editAccessibility: 'Edit commitment',
      loading: 'Loading commitment',
    });
  });

  it('ships the not-found title and body byte-exact', () => {
    expect({
      title: Strings.commitmentsDetailNotFoundTitle,
      body: Strings.commitmentsDetailNotFoundBody,
    }).toEqual({
      title: 'This commitment is gone',
      body: 'It no longer exists.',
    });
  });

  it('ships the first-load failure byte-exact, its retry reading Try again', () => {
    expect({
      title: Strings.commitmentsDetailLoadErrorTitle,
      description: Strings.commitmentsDetailLoadErrorDescription,
      retry: Strings.commitmentsLoadRetry,
    }).toEqual({
      title: "Couldn't load this commitment.",
      description: 'Something went wrong reading your data. Nothing was changed.',
      retry: 'Try again',
    });
  });

  it('ships the refresh failure title byte-exact', () => {
    expect(Strings.commitmentsDetailRefreshErrorTitle).toBe("Couldn't refresh this commitment.");
  });
});

describe('commitment detail fact copy (MA-261)', () => {
  it('ships the Repeats, Started and Ends labels and the Never value byte-exact', () => {
    expect({
      repeats: Strings.commitmentsDetailRepeats,
      started: Strings.commitmentsDetailStarted,
      ends: Strings.commitmentsDetailEnds,
      never: Strings.commitmentsEndsNever,
    }).toEqual({
      repeats: 'Repeats',
      started: 'Started',
      ends: 'Ends',
      never: 'Never',
    });
  });
});

describe('commitment detail This cycle copy (MA-262)', () => {
  it('ships the card overline, the actions and the settled day lines byte-exact', () => {
    expect({
      overline: Strings.commitmentsDetailCurrentCycle,
      pay: Strings.commitmentsMarkAsPaid,
      skip: Strings.commitmentsSkip,
      viewTransaction: Strings.commitmentsViewTransaction,
      paidLate: Strings.commitmentsCyclePaidLine('4 days late'),
      paidOnTheDay: Strings.commitmentsCyclePaidLine('on the day'),
      skippedEarly: Strings.commitmentsCycleSkippedLine('1 day early'),
    }).toEqual({
      overline: 'This cycle',
      pay: 'Pay',
      skip: 'Skip',
      viewTransaction: 'View transaction',
      paidLate: 'paid · 4 days late',
      paidOnTheDay: 'paid · on the day',
      skippedEarly: 'skipped · 1 day early',
    });
  });
});

describe('commitment detail lifecycle copy (MA-266)', () => {
  it('ships the Stopped and Ended cadence badges byte-exact', () => {
    expect({
      stopped: Strings.commitmentsCadenceStopped,
      ended: Strings.commitmentsCadenceEnded,
    }).toEqual({
      stopped: 'Stopped',
      ended: 'Ended',
    });
  });
});

describe('swipe and toast copy (MA-215)', () => {
  it('ships the swipe tiles byte-exact', () => {
    expect({ pay: Strings.swipePay, skip: Strings.swipeSkip }).toEqual({
      pay: 'Pay',
      skip: 'Skip',
    });
  });

  it('ships the toast after Pay byte-exact', () => {
    expect(Strings.commitmentsPaidToast('Rent', '8,000 EGP')).toBe('Rent paid · 8,000 EGP');
  });

  it('ships the toast after Skip and its action byte-exact', () => {
    expect({
      skipped: Strings.commitmentsSkippedToast('Rent'),
      undo: Strings.commitmentsUndoAction,
    }).toEqual({ skipped: 'Rent skipped', undo: 'Undo' });
  });

  it('ships the skip and undo failures byte-exact', () => {
    expect({
      skip: Strings.commitmentsSkipError,
      undo: Strings.commitmentsUndoSkipError,
    }).toEqual({
      skip: "Couldn't skip this payment. Nothing was changed.",
      undo: "Couldn't undo this skip. Nothing was changed.",
    });
  });
});

describe('commitment detail Payments copy (MA-265)', () => {
  it('ships the card title byte-exact', () => {
    expect(Strings.commitmentsDetailPaymentHistory).toBe('Payments');
  });

  it('ships the pay sheet cycle line byte-exact', () => {
    expect(Strings.commitmentsPayCycleLead('Thu 1 Oct 2026')).toBe('Thu 1 Oct 2026 · ');
  });
});
