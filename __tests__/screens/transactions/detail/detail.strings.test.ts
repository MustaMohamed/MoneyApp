import { Strings } from '@/constants/strings';

describe('transaction detail fact rows copy (MA-181)', () => {
  it('ships the fact row labels byte-exact from the Copy note, as written and not in capitals', () => {
    expect({
      account: Strings.detailAccount,
      category: Strings.detailCategory,
      budget: Strings.detailBudget,
      date: Strings.detailDate,
      time: Strings.detailTime,
      rate: Strings.detailExchangeRate,
      amountInEgp: Strings.detailAmountInEgp,
      amountInUsd: Strings.detailAmountInUsd,
      source: Strings.detailSource,
    }).toEqual({
      account: 'Account',
      category: 'Category',
      budget: 'Budget',
      date: 'Date',
      time: 'Time',
      rate: 'Rate',
      amountInEgp: 'Amount in EGP',
      amountInUsd: 'Amount in USD',
      source: 'Source',
    });
  });

  it('stores the note card label as written, for the card to draw in capitals', () => {
    expect(Strings.detailNote).toBe('Note');
  });

  it('labels the Account row of an archived account Archived', () => {
    expect(Strings.detailAccountArchived).toBe('Archived');
  });

  it('names the flat edit action Edit', () => {
    expect(Strings.detailEditButton).toBe('Edit');
  });
});

describe('transaction detail failure copy (MA-182)', () => {
  it('ships the first-load block, the refresh alert and the retry byte-exact from the Copy note', () => {
    expect({
      title: Strings.detailLoadErrorTitle,
      body: Strings.detailLoadErrorDescription,
      refresh: Strings.detailRefreshErrorTitle,
      retry: Strings.detailLoadRetry,
    }).toEqual({
      title: "Couldn't load this transaction",
      body: 'Something went wrong reading your data. The transaction is still there.',
      refresh: "Couldn't refresh this transaction.",
      retry: 'Try again',
    });
  });
});
