import { TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { makeTestAccount, makeTestCategory, makeTestTransaction } from '@/test_helpers/transaction';
import { formatTransactionTitle } from '@/utils/format_transaction_title';

const baseTx = makeTestTransaction({
  id: 'tx-1',
  amount: 50,
  egp_amount: 50,
  account_id: 'acc-cib',
  category_id: 'cat_food',
  transaction_date: '2026-05-01',
  transaction_time: '14:30:00',
  created_at: '2026-05-01T14:30:00.000Z',
  updated_at: '2026-05-01T14:30:00.000Z',
});

const accCib = makeTestAccount({ id: 'acc-cib', name: 'CIB Savings' });
const accVf = makeTestAccount({ id: 'acc-vf', name: 'Vodafone Cash' });
const catFood = makeTestCategory({ id: 'cat_food', name: 'Food & Dining' });

describe('formatTransactionTitle — expense / income', () => {
  it('uses note when present', () => {
    const out = formatTransactionTitle({
      tx: { ...baseTx, note: 'Lunch with team' },
      account: accCib,
      category: catFood,
    });
    expect(out.title).toBe('Lunch with team');
    expect(out.subtitle).toBe('CIB Savings');
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
    expect(out.subtitle).toBe('Unknown account');
  });

  it('income behaves like expense', () => {
    const out = formatTransactionTitle({
      tx: { ...baseTx, type: TransactionType.Income, note: 'Monthly salary' },
      account: accCib,
      category: makeTestCategory({ id: 'cat_salary', name: 'Salary' }),
    });
    expect(out.title).toBe('Monthly salary');
    expect(out.subtitle).toBe('CIB Savings');
  });
});

describe('formatTransactionTitle — transfer', () => {
  const transferTx = makeTestTransaction({
    ...baseTx,
    type: TransactionType.Transfer,
    category_id: null,
    to_account_id: 'acc-vf',
  });

  it('uses note when present and shows source → target', () => {
    const out = formatTransactionTitle({
      tx: { ...transferTx, note: 'Move spending money' },
      account: accCib,
      toAccount: accVf,
    });
    expect(out.title).toBe('Move spending money');
    expect(out.subtitle).toBe('CIB Savings → Vodafone Cash');
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
    expect(out.subtitle).toBe('CIB Savings → Unknown account');
  });
});

describe('formatTransactionTitle — cc_payment', () => {
  const ccPaymentTx = makeTestTransaction({
    ...baseTx,
    type: TransactionType.CCPayment,
    category_id: null,
    to_account_id: 'acc-cc',
  });
  const accCc = makeTestAccount({ id: 'acc-cc', name: 'CIB Credit' });

  it('uses note when present', () => {
    const out = formatTransactionTitle({
      tx: { ...ccPaymentTx, note: 'April statement' },
      account: accCib,
      toAccount: accCc,
    });
    expect(out.title).toBe('April statement');
    expect(out.subtitle).toBe('CIB Savings → CIB Credit');
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
