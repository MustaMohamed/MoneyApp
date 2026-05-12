import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { Strings } from '@/constants/strings';

import { EmptyState } from '@/components/ui/empty_state';

// String key tests stay at top
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

// Component render tests
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcons');
jest.mock('heroui-native', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

describe('EmptyState component', () => {
  describe('accounts variant', () => {
    it('renders headline and description', () => {
      const { getByText } = render(<EmptyState variant="accounts" />);
      expect(getByText('No accounts yet')).toBeTruthy();
      expect(getByText('Add your first account to start tracking your money.')).toBeTruthy();
    });

    it('renders CTA button with label', () => {
      const { getByText } = render(<EmptyState variant="accounts" />);
      expect(getByText('Add Account')).toBeTruthy();
    });

    it('calls onAction when CTA is pressed', () => {
      const onAction = jest.fn();
      const { getByText } = render(<EmptyState variant="accounts" onAction={onAction} />);
      fireEvent.press(getByText('Add Account'));
      expect(onAction).toHaveBeenCalledTimes(1);
    });
  });

  describe('transactions variant', () => {
    it('renders headline and description', () => {
      const { getByText } = render(<EmptyState variant="transactions" />);
      expect(getByText('No transactions yet')).toBeTruthy();
      expect(
        getByText('Your transactions will appear here once you start adding them.'),
      ).toBeTruthy();
    });

    it('renders CTA button with label', () => {
      const { getByText } = render(<EmptyState variant="transactions" />);
      expect(getByText('Add Transaction')).toBeTruthy();
    });
  });

  describe('commitments variant', () => {
    it('renders headline and description', () => {
      const { getByText } = render(<EmptyState variant="commitments" />);
      expect(getByText('No commitments yet')).toBeTruthy();
    });

    it('renders CTA button with label', () => {
      const { getByText } = render(<EmptyState variant="commitments" />);
      expect(getByText('Add Commitment')).toBeTruthy();
    });
  });

  describe('filtered variant', () => {
    it('renders headline and description', () => {
      const { getByText } = render(<EmptyState variant="filtered" />);
      expect(getByText('No results')).toBeTruthy();
      expect(getByText('Try adjusting your filters.')).toBeTruthy();
    });

    it('renders "Clear Filters" text button (not gradient CTA)', () => {
      const { getByText, queryByTestId } = render(<EmptyState variant="filtered" />);
      expect(getByText('Clear Filters')).toBeTruthy();
      expect(queryByTestId('empty-state-cta-gradient')).toBeNull();
    });

    it('calls onAction when Clear Filters is pressed', () => {
      const onAction = jest.fn();
      const { getByText } = render(<EmptyState variant="filtered" onAction={onAction} />);
      fireEvent.press(getByText('Clear Filters'));
      expect(onAction).toHaveBeenCalledTimes(1);
    });
  });

  it('does not throw when onAction is not provided', () => {
    expect(() => render(<EmptyState variant="accounts" />)).not.toThrow();
  });
});
