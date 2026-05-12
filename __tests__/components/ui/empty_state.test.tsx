import { Strings } from '@/constants/strings';

describe('EmptyState strings', () => {
  it('has all accounts variant copy keys', () => {
    expect(Strings.emptyAccountsHeadline).toBe('No accounts yet');
    expect(Strings.emptyAccountsDescription).toBe(
      'Add your first account to start tracking your money.',
    );
    expect(Strings.emptyAccountsCta).toBe('Add Account');
  });

  it('has all transactions variant copy keys', () => {
    expect(Strings.emptyTransactionsHeadline).toBe('No transactions yet');
    expect(Strings.emptyTransactionsDescription).toBe(
      'Your transactions will appear here once you start adding them.',
    );
    expect(Strings.emptyTransactionsCta).toBe('Add Transaction');
  });

  it('has all commitments variant copy keys', () => {
    expect(Strings.emptyCommitmentsHeadline).toBe('No commitments yet');
    expect(Strings.emptyCommitmentsDescription).toBe(
      'Track bills, subscriptions, and recurring payments here.',
    );
    expect(Strings.emptyCommitmentsCta).toBe('Add Commitment');
  });

  it('has all filtered variant copy keys', () => {
    expect(Strings.emptyFilteredHeadline).toBe('No results');
    expect(Strings.emptyFilteredDescription).toBe('Try adjusting your filters.');
    expect(Strings.emptyFilteredClearCta).toBe('Clear Filters');
  });
});
