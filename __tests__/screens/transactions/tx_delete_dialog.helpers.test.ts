import { AccountType, Currency, TransactionType } from '@/constants/enums';
import { resolveTransactionDeleteBody } from '@/modules/transactions/screens/transactions/components/tx_delete_dialog.helpers';
import { makeTestAccount, makeTestTransaction } from '@/test_helpers/transaction';

const CIB = makeTestAccount({ id: 'acc-cib', name: 'CIB Current', type: AccountType.Bank });
const WALLET = makeTestAccount({ id: 'acc-wallet', name: 'Wallet' });
const DOLLARS = makeTestAccount({
  id: 'acc-usd',
  name: 'Dollar Savings',
  type: AccountType.Bank,
  currency: Currency.USD,
});
const VISA = makeTestAccount({
  id: 'acc-visa',
  name: 'Visa Platinum',
  type: AccountType.CreditCard,
});

describe('resolveTransactionDeleteBody', () => {
  it('an EGP expense returns to its account, with no decimals', () => {
    const tx = makeTestTransaction({ amount: 1240, egp_amount: 1240, account_id: CIB.id });

    expect(resolveTransactionDeleteBody(tx, CIB, undefined)).toBe(
      '1,240 EGP returns to CIB Current. This cannot be undone.',
    );
  });

  it('a USD income leaves its account, with two decimals', () => {
    const tx = makeTestTransaction({
      type: TransactionType.Income,
      amount: 12.5,
      currency: Currency.USD,
      egp_amount: 625,
      exchange_rate: 50,
      account_id: DOLLARS.id,
    });

    expect(resolveTransactionDeleteBody(tx, DOLLARS, undefined)).toBe(
      '12.50 USD leaves Dollar Savings. This cannot be undone.',
    );
  });

  it('a transfer moves back to the source, naming the source and then the destination', () => {
    const tx = makeTestTransaction({
      type: TransactionType.Transfer,
      amount: 500,
      egp_amount: 500,
      to_amount: 500,
      account_id: CIB.id,
      to_account_id: WALLET.id,
      category_id: null,
    });

    expect(resolveTransactionDeleteBody(tx, CIB, WALLET)).toBe(
      '500 EGP moves back to CIB Current from Wallet. This cannot be undone.',
    );
  });

  it('a card payment moves back to the source and is owed on the card again', () => {
    const tx = makeTestTransaction({
      type: TransactionType.CCPayment,
      amount: 2000,
      egp_amount: 2000,
      to_amount: 2000,
      account_id: CIB.id,
      to_account_id: VISA.id,
      category_id: null,
    });

    expect(resolveTransactionDeleteBody(tx, CIB, VISA)).toBe(
      '2,000 EGP moves back to CIB Current and is owed on Visa Platinum again. This cannot be undone.',
    );
  });

  it('an income on a credit card is owed on the card again, not the income sentence', () => {
    const tx = makeTestTransaction({
      type: TransactionType.Income,
      amount: 300,
      egp_amount: 300,
      account_id: VISA.id,
    });

    expect(resolveTransactionDeleteBody(tx, VISA, undefined)).toBe(
      '300 EGP is owed on Visa Platinum again. This cannot be undone.',
    );
  });

  it('names a deleted account Deleted Account', () => {
    const tx = makeTestTransaction({ amount: 1240, egp_amount: 1240, account_id: 'acc-gone' });
    const deleted = makeTestAccount({ id: 'acc-gone', name: '', is_deleted: 1 });

    expect(resolveTransactionDeleteBody(tx, deleted, undefined)).toBe(
      '1,240 EGP returns to Deleted Account. This cannot be undone.',
    );
  });

  it('names an account the lookup has not resolved Unknown account, never Deleted Account', () => {
    const tx = makeTestTransaction({ amount: 1240, egp_amount: 1240, account_id: 'acc-pending' });

    expect(resolveTransactionDeleteBody(tx, undefined, undefined)).toBe(
      '1,240 EGP returns to Unknown account. This cannot be undone.',
    );
  });

  it('names an unresolved transfer destination Unknown account beside the resolved source', () => {
    const tx = makeTestTransaction({
      type: TransactionType.Transfer,
      amount: 500,
      egp_amount: 500,
      to_amount: 500,
      account_id: CIB.id,
      to_account_id: 'acc-pending',
      category_id: null,
    });

    expect(resolveTransactionDeleteBody(tx, CIB, undefined)).toBe(
      '500 EGP moves back to CIB Current from Unknown account. This cannot be undone.',
    );
  });

  it('prints an EGP amount under one pound as the row does, 0.40 and never 0', () => {
    const tx = makeTestTransaction({ amount: 0.4, egp_amount: 0.4, account_id: CIB.id });

    expect(resolveTransactionDeleteBody(tx, CIB, undefined)).toBe(
      '0.40 EGP returns to CIB Current. This cannot be undone.',
    );
  });
});
