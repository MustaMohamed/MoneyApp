import { render } from '@testing-library/react-native';
import React from 'react';

import { AccountType, Currency, TransactionType } from '@/constants/enums';
import type { Account } from '@/database/entities/account.entity';
import type { Category } from '@/database/entities/category.entity';
import type { Transaction } from '@/database/entities/transaction.entity';
import { TransactionRow } from '@/screens/transactions/components/transaction_row';

jest.mock('react-native-reanimated', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (c: unknown) => c },
    View,
    useSharedValue: () => ({ value: 1 }),
    useAnimatedStyle: () => ({}),
    withTiming: (v: unknown) => v,
  };
});

function mkAccount(p: Partial<Account> = {}): Account {
  return {
    id: 'a1',
    name: 'CIB',
    type: AccountType.Bank,
    currency: Currency.EGP,
    current_balance: 1000,
    opening_balance: 1000,
    is_archived: 0,
    created_at: 'X',
    updated_at: 'X',
    ...p,
  } as Account;
}

function mkCategory(p: Partial<Category> = {}): Category {
  return {
    id: 'c1',
    name: 'Food',
    icon: 'silverware-fork-knife',
    color: '#ffaa66',
    type: 'expense',
    is_archived: 0,
    created_at: 'X',
    updated_at: 'X',
    ...p,
  } as Category;
}

function mkTx(p: Partial<Transaction> = {}): Transaction {
  return {
    id: 't1',
    type: TransactionType.Expense,
    amount: 285,
    currency: Currency.EGP,
    egp_amount: 285,
    exchange_rate: null,
    to_amount: null,
    minimum_payment_snapshot: null,
    account_id: 'a1',
    to_account_id: null,
    category_id: 'c1',
    note: null,
    transaction_date: '2026-05-17',
    transaction_time: '19:14:00',
    commitment_payment_id: null,
    created_at: 'X',
    updated_at: 'X',
    ...p,
  } as Transaction;
}

describe('TransactionRow — left column', () => {
  it('shows category name as the title for expense', () => {
    const { getByText } = render(
      <TransactionRow
        tx={mkTx()}
        account={mkAccount()}
        category={mkCategory()}
        onPress={() => {}}
      />,
    );
    expect(getByText('Food')).toBeTruthy();
  });

  it('falls back to "Uncategorized" when expense has no category', () => {
    const { getByText } = render(
      <TransactionRow tx={mkTx({ category_id: null })} account={mkAccount()} onPress={() => {}} />,
    );
    expect(getByText('Uncategorized')).toBeTruthy();
  });

  it('shows "Transfer" title for transfer with no category', () => {
    const { getByText } = render(
      <TransactionRow
        tx={mkTx({ type: TransactionType.Transfer, category_id: null, to_account_id: 'a2' })}
        account={mkAccount()}
        toAccount={mkAccount({ id: 'a2', name: 'QNB Reserve' })}
        onPress={() => {}}
      />,
    );
    expect(getByText('Transfer')).toBeTruthy();
  });

  it('shows "CC Payment" title for cc_payment type', () => {
    const { getByText } = render(
      <TransactionRow
        tx={mkTx({ type: TransactionType.CCPayment, category_id: null, to_account_id: 'a3' })}
        account={mkAccount()}
        toAccount={mkAccount({ id: 'a3', name: 'Visa Credit' })}
        onPress={() => {}}
      />,
    );
    expect(getByText('CC Payment')).toBeTruthy();
  });

  it('renders the italic note line when present', () => {
    const { getByText } = render(
      <TransactionRow
        tx={mkTx({ note: 'Talabat — family dinner' })}
        account={mkAccount()}
        category={mkCategory()}
        onPress={() => {}}
      />,
    );
    expect(getByText('Talabat — family dinner')).toBeTruthy();
  });

  it('omits the note line when note is null', () => {
    const { queryByText } = render(
      <TransactionRow
        tx={mkTx()}
        account={mkAccount()}
        category={mkCategory()}
        onPress={() => {}}
      />,
    );
    // No specific text to find; just assert that a generic note placeholder is absent.
    expect(queryByText(/^"/)).toBeNull();
  });

  it('shows account name for expense/income', () => {
    const { getByText } = render(
      <TransactionRow
        tx={mkTx()}
        account={mkAccount()}
        category={mkCategory()}
        onPress={() => {}}
      />,
    );
    expect(getByText('CIB')).toBeTruthy();
  });

  it('shows FROM → TO for transfer', () => {
    const { getByText } = render(
      <TransactionRow
        tx={mkTx({ type: TransactionType.Transfer, category_id: null, to_account_id: 'a2' })}
        account={mkAccount()}
        toAccount={mkAccount({ id: 'a2', name: 'QNB Reserve' })}
        onPress={() => {}}
      />,
    );
    expect(getByText('CIB → QNB Reserve')).toBeTruthy();
  });

  it('renders TypeBadge when commitment_payment_id is set', () => {
    const { getByLabelText } = render(
      <TransactionRow
        tx={mkTx({ commitment_payment_id: 'cp1' })}
        account={mkAccount()}
        category={mkCategory()}
        onPress={() => {}}
      />,
    );
    expect(getByLabelText('Commitment')).toBeTruthy();
  });
});

describe('TransactionRow — right column', () => {
  it('shows signed native amount + currency code', () => {
    const { getByText } = render(
      <TransactionRow
        tx={mkTx()}
        account={mkAccount()}
        category={mkCategory()}
        onPress={() => {}}
      />,
    );
    expect(getByText('−285 EGP')).toBeTruthy();
  });

  it('shows + prefix for income', () => {
    const { getByText } = render(
      <TransactionRow
        tx={mkTx({ type: TransactionType.Income, amount: 25000, egp_amount: 25000 })}
        account={mkAccount()}
        category={mkCategory({ name: 'Salary' })}
        onPress={() => {}}
      />,
    );
    expect(getByText('+25,000 EGP')).toBeTruthy();
  });

  it('omits sign prefix for transfer', () => {
    const { getByText } = render(
      <TransactionRow
        tx={mkTx({
          type: TransactionType.Transfer,
          category_id: null,
          to_account_id: 'a2',
          amount: 5000,
          egp_amount: 5000,
        })}
        account={mkAccount()}
        toAccount={mkAccount({ id: 'a2', name: 'QNB Reserve' })}
        onPress={() => {}}
      />,
    );
    expect(getByText('5,000 EGP')).toBeTruthy();
  });

  it('shows EGP equivalent + rate when currency is USD (expense uses ≈)', () => {
    const { getByText } = render(
      <TransactionRow
        tx={mkTx({ currency: Currency.USD, amount: 9.99, egp_amount: 488, exchange_rate: 48.85 })}
        account={mkAccount()}
        category={mkCategory({ name: 'Subscriptions' })}
        onPress={() => {}}
      />,
    );
    expect(getByText('−9.99 USD')).toBeTruthy();
    expect(getByText(/≈ 488 EGP/)).toBeTruthy();
    expect(getByText(/@ 48.85/)).toBeTruthy();
  });

  it('shows → prefix on EGP equivalent for cross-currency transfer', () => {
    const { getByText } = render(
      <TransactionRow
        tx={mkTx({
          type: TransactionType.Transfer,
          category_id: null,
          to_account_id: 'a2',
          currency: Currency.USD,
          amount: 100,
          egp_amount: 4885,
          to_amount: 4885,
          exchange_rate: 48.85,
        })}
        account={mkAccount({ name: 'Wise USD', currency: Currency.USD })}
        toAccount={mkAccount({ id: 'a2', name: 'CIB' })}
        onPress={() => {}}
      />,
    );
    expect(getByText('100 USD')).toBeTruthy();
    expect(getByText(/→ 4,885 EGP/)).toBeTruthy();
  });

  it('omits the EGP-equivalent line when currency is EGP', () => {
    const { queryByText } = render(
      <TransactionRow
        tx={mkTx()}
        account={mkAccount()}
        category={mkCategory()}
        onPress={() => {}}
      />,
    );
    expect(queryByText(/≈/)).toBeNull();
    expect(queryByText(/@ /)).toBeNull();
  });

  it('shows time in 12h format', () => {
    const { getByText } = render(
      <TransactionRow
        tx={mkTx()}
        account={mkAccount()}
        category={mkCategory()}
        onPress={() => {}}
      />,
    );
    expect(getByText('7:14 PM')).toBeTruthy();
  });
});

describe('TransactionRow — type-color contract', () => {
  // The list rows mirror §7's four-type colour system so a glance at the
  // transactions list tells you the same story as the Add Transaction
  // tabs / AmountHero. These tests lock the mapping in case someone
  // tweaks amountColorClass back to the old gold-accent fallback.
  const cases: Array<[TransactionType, string]> = [
    [TransactionType.Expense, 'text-danger'],
    [TransactionType.Income, 'text-success'],
    [TransactionType.Transfer, 'text-info'],
    [TransactionType.CCPayment, 'text-accent-cc'],
  ];

  for (const [type, klass] of cases) {
    it(`amount is rendered with ${klass} for ${type}`, () => {
      const { getByText } = render(
        <TransactionRow
          tx={mkTx({
            type,
            // Transfer + CC Payment need to_account_id so the row renders without warnings.
            category_id:
              type === TransactionType.Expense || type === TransactionType.Income ? 'c1' : null,
            to_account_id:
              type === TransactionType.Transfer || type === TransactionType.CCPayment ? 'a2' : null,
            amount: 100,
            egp_amount: 100,
          })}
          account={mkAccount()}
          toAccount={mkAccount({ id: 'a2', name: 'Other' })}
          category={mkCategory()}
          onPress={() => {}}
        />,
      );
      // The amount text node — find by content via signPrefix + amount + currency.
      // For Transfer/CC there is no sign prefix; for Expense '−', Income '+'.
      const prefix =
        type === TransactionType.Expense ? '−' : type === TransactionType.Income ? '+' : '';
      const amountNode = getByText(`${prefix}100 EGP`);
      expect(amountNode.props.className).toContain(klass);
    });
  }
});

describe('TransactionRow — note row layout', () => {
  it('renders the note on its own row (not inline with the title block)', () => {
    // The note moved out of the narrow middle column to a full-width row
    // below the icon/title/amount block, so long notes get the whole row
    // to wrap up to 2 lines instead of being truncated by ellipsis.
    const { getByText } = render(
      <TransactionRow
        tx={mkTx({
          note: 'Very long restaurant tab from team lunch on Wednesday at the new place downtown',
        })}
        account={mkAccount()}
        category={mkCategory()}
        onPress={() => {}}
      />,
    );
    const noteNode = getByText(
      'Very long restaurant tab from team lunch on Wednesday at the new place downtown',
    );
    // Two lines max — wraps instead of single-line ellipsis truncation.
    expect(noteNode.props.numberOfLines).toBe(2);
  });

  it('renders the note BELOW the header row (positional contract)', () => {
    // Structural lock: the note Text must be a sibling AFTER the 3-column
    // header row inside the outer Animated.View — never a child of the
    // middle column (which would put it between the title and the account
    // context line, i.e. "on top" of the amount row visually).
    //
    // We assert this by walking the rendered JSON tree: the Animated.View
    // (the row container) must have its note as a later child than the
    // header-row View that contains the title text "Food".
    const tree = render(
      <TransactionRow
        tx={mkTx({ note: 'inline-note-marker-xyz' })}
        account={mkAccount()}
        category={mkCategory({ name: 'Food' })}
        onPress={() => {}}
      />,
    ).toJSON();

    // Walk the tree; collect ordered text strings encountered.
    const sequence: string[] = [];
    const visit = (node: unknown): void => {
      if (node == null) return;
      if (Array.isArray(node)) {
        node.forEach(visit);
        return;
      }
      if (typeof node === 'string') {
        sequence.push(node);
        return;
      }
      if (typeof node === 'object' && node !== null && 'children' in node) {
        visit((node as { children: unknown }).children);
      }
    };
    visit(tree);

    const titleIdx = sequence.indexOf('Food');
    const amountIdx = sequence.findIndex((s) => s.includes('285'));
    const noteIdx = sequence.indexOf('inline-note-marker-xyz');

    // Note must come AFTER both the title and the amount in source order
    // (header row first, note row after) — guaranteeing the visual layout
    // top → bottom is: title/ctx + amount, THEN note.
    expect(noteIdx).toBeGreaterThan(titleIdx);
    expect(noteIdx).toBeGreaterThan(amountIdx);
  });
});
