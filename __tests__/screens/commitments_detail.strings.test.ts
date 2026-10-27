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
      retry: Strings.commitmentsDetailLoadRetry,
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
