import { Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Account } from '@/database/entities/account.entity';
import type { Category } from '@/database/entities/category.entity';
import type { Transaction } from '@/database/entities/transaction.entity';
import { formatTransactionTitle } from '@/utils/format_transaction_title';

const baseTx: Transaction = {
  id: 'tx-1',
  type: TransactionType.Expense,
  amount: 50,
  currency: Currency.EGP,
  egp_amount: 50,
  exchange_rate: null,
  to_amount: null,
  minimum_payment_snapshot: null,
  account_id: 'acc-cib',
  to_account_id: null,
  category_id: 'cat_food',
  note: null,
  transaction_date: '2026-05-01',
  transaction_time: '14:30:00',
  created_at: '2026-05-01T14:30:00.000Z',
  updated_at: '2026-05-01T14:30:00.000Z',
};

const accCib: Account = { id: 'acc-cib', name: 'CIB Savings' } as Account;
const accVf: Account = { id: 'acc-vf', name: 'Vodafone Cash' } as Account;
const catFood: Category = { id: 'cat_food', name: 'Food & Dining' } as Category;

describe('formatTransactionTitle — expense / income', () => {
  it('uses note when present', () => {
    const out = formatTransactionTitle({
      tx: { ...baseTx, note: 'Lunch with team' },
      account: accCib,
      category: catFood,
    });
    expect(out.title).toBe('Lunch with team');
    expect(out.subtitle).toBe('CIB Savings · 2:30 PM');
  });

  it('falls back to category name when note is empty', () => {
    const out = formatTransactionTitle({
      tx: { ...baseTx, note: '   ' },
      account: accCib,
      category: catFood,
    });
    expect(out.title).toBe('Food & Dining');
  });

  it('falls back to "Uncategorized" when both note and category are missing', () => {
    const out = formatTransactionTitle({
      tx: { ...baseTx, note: null, category_id: null },
      account: accCib,
    });
    expect(out.title).toBe(Strings.uncategorized);
  });

  it('subtitle uses "Unknown account" when account is missing', () => {
    const out = formatTransactionTitle({
      tx: baseTx,
      category: catFood,
    });
    expect(out.subtitle).toBe('Unknown account · 2:30 PM');
  });

  it('income behaves like expense', () => {
    const out = formatTransactionTitle({
      tx: { ...baseTx, type: TransactionType.Income, note: 'Monthly salary' },
      account: accCib,
      category: { id: 'cat_salary', name: 'Salary' } as Category,
    });
    expect(out.title).toBe('Monthly salary');
    expect(out.subtitle).toBe('CIB Savings · 2:30 PM');
  });
});

describe('formatTransactionTitle — transfer', () => {
  const transferTx: Transaction = {
    ...baseTx,
    type: TransactionType.Transfer,
    category_id: null,
    to_account_id: 'acc-vf',
  };

  it('uses note when present and shows source → target · time', () => {
    const out = formatTransactionTitle({
      tx: { ...transferTx, note: 'Move spending money' },
      account: accCib,
      toAccount: accVf,
    });
    expect(out.title).toBe('Move spending money');
    expect(out.subtitle).toBe('CIB Savings → Vodafone Cash · 2:30 PM');
  });

  it('falls back to "Transfer" title when no note', () => {
    const out = formatTransactionTitle({
      tx: transferTx,
      account: accCib,
      toAccount: accVf,
    });
    expect(out.title).toBe(Strings.transferTitle);
  });

  it('uses "Unknown account" for a missing target', () => {
    const out = formatTransactionTitle({
      tx: transferTx,
      account: accCib,
    });
    expect(out.subtitle).toBe('CIB Savings → Unknown account · 2:30 PM');
  });
});

describe('formatTransactionTitle — cc_payment', () => {
  const ccPaymentTx: Transaction = {
    ...baseTx,
    type: TransactionType.CCPayment,
    category_id: null,
    to_account_id: 'acc-cc',
  };
  const accCc: Account = { id: 'acc-cc', name: 'CIB Credit' } as Account;

  it('uses note when present', () => {
    const out = formatTransactionTitle({
      tx: { ...ccPaymentTx, note: 'April statement' },
      account: accCib,
      toAccount: accCc,
    });
    expect(out.title).toBe('April statement');
    expect(out.subtitle).toBe('CIB Savings → CIB Credit · 2:30 PM');
  });

  it('falls back to "Credit Card Payment" title', () => {
    const out = formatTransactionTitle({
      tx: ccPaymentTx,
      account: accCib,
      toAccount: accCc,
    });
    expect(out.title).toBe(Strings.ccPaymentTitle);
  });
});
