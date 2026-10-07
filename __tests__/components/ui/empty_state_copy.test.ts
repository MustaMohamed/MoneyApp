import { resolveEmptyStateCopy } from '@/components/ui/empty_state';
import { Strings } from '@/constants/strings';

describe('resolveEmptyStateCopy', () => {
  it('names the month and offers the link back on an empty month away from the current one', () => {
    expect(
      resolveEmptyStateCopy({
        variant: 'transactionsMonth',
        monthName: 'August',
        showsBackLink: true,
      }),
    ).toStrictEqual({
      headline: 'Nothing recorded in August',
      description: 'Add a transaction dated in August, or pick another month.',
      ctaLabel: undefined,
      clearLabel: 'Back to this month',
    });
  });

  it('keeps both month lines and drops the link when the link is off', () => {
    expect(
      resolveEmptyStateCopy({
        variant: 'transactionsMonth',
        monthName: 'August',
        showsBackLink: false,
      }),
    ).toStrictEqual({
      headline: 'Nothing recorded in August',
      description: 'Add a transaction dated in August, or pick another month.',
      ctaLabel: undefined,
      clearLabel: undefined,
    });
  });

  it('keeps Clear Filters as the filtered block link, with no button', () => {
    expect(resolveEmptyStateCopy({ variant: 'filtered' })).toStrictEqual({
      headline: Strings.emptyFilteredHeadline,
      description: Strings.emptyFilteredDescription,
      ctaLabel: undefined,
      clearLabel: 'Clear Filters',
    });
  });

  it('keeps the add button on the no-transactions block, with no link', () => {
    expect(resolveEmptyStateCopy({ variant: 'transactions' })).toStrictEqual({
      headline: Strings.emptyTransactionsHeadline,
      description: Strings.emptyTransactionsDescription,
      ctaLabel: Strings.emptyTransactionsCta,
      clearLabel: undefined,
    });
  });

  it.each([
    [1, 'Your 1 archived account is below. Unarchive it, or add a new account.'],
    [2, 'Your 2 archived accounts are below. Unarchive one, or add a new account.'],
  ])('counts %i archived in the archived-only description', (archivedCount, description) => {
    expect(resolveEmptyStateCopy({ variant: 'accountsArchivedOnly', archivedCount })).toStrictEqual(
      {
        headline: Strings.emptyAccountsArchivedOnlyHeadline,
        description,
        ctaLabel: Strings.emptyAccountsCta,
        clearLabel: undefined,
      },
    );
  });
});
