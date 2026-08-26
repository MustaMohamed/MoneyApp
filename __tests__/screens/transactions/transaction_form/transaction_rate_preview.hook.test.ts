/**
 * transaction_rate_preview.hook.test.ts
 *
 * The `≈ … EGP` figure under the transaction form's rate row. It used to be
 * `roundMoney(amount * rate)` inside `ExchangeRateRow`, which is the wrong
 * operation whenever the typed amount is ALREADY EGP: a 5,000 EGP transfer
 * into a USD account previewed 245,300 EGP. W1B moved the derivation to
 * `resolveTransactionAmounts` and the subscription to this hook.
 *
 * Logic-only, real stores: `useTransactionAmount` reads the add/edit stores
 * directly, and mocking them would mock the thing under test.
 */

import { renderHook } from '@testing-library/react-native';

import { Currency, TransactionType } from '@/constants/enums';
import { useAddTransactionStore } from '@/modules/transactions/screens/transactions/transaction_form/add_transaction.store';
import { useTransactionRatePreview } from '@/modules/transactions/screens/transactions/transaction_form/components/transaction_rate_preview.hook';
import { useEditTransactionStore } from '@/modules/transactions/screens/transactions/transaction_form/edit_transaction.store';

const RATE = '49.06';

beforeEach(() => {
  useAddTransactionStore.getState().reset();
  useEditTransactionStore.getState().reset();
});

async function preview(input: {
  amount: string;
  type?: TransactionType;
  sourceCurrency?: Currency;
  destinationCurrency?: Currency;
  exchangeRate?: string;
}) {
  useAddTransactionStore.getState().setAmountStr(input.amount);
  const { result } = await renderHook(() =>
    useTransactionRatePreview({
      mode: 'add',
      type: input.type ?? TransactionType.Expense,
      sourceCurrency: input.sourceCurrency ?? Currency.USD,
      destinationCurrency: input.destinationCurrency,
      exchangeRate: input.exchangeRate ?? RATE,
    }),
  );
  return result.current;
}

describe('useTransactionRatePreview', () => {
  // The case the ticket exists for. The amount is already EGP, so its EGP
  // value is itself — the rate converts the DESTINATION leg, not this figure.
  it('renders the identity amount for an EGP source paid into a USD account', async () => {
    expect(
      await preview({
        amount: '5000',
        type: TransactionType.Transfer,
        sourceCurrency: Currency.EGP,
        destinationCurrency: Currency.USD,
      }),
    ).toBe(5000);
  });

  it.each([
    ['an expense from a USD account', TransactionType.Expense, undefined],
    ['a transfer out of a USD account', TransactionType.Transfer, Currency.EGP],
  ] as const)('multiplies for %s', async (_label, type, destinationCurrency) => {
    expect(
      await preview({ amount: '100', type, sourceCurrency: Currency.USD, destinationCurrency }),
    ).toBe(4906);
  });

  it('needs no rate when neither side is USD', async () => {
    expect(await preview({ amount: '250', sourceCurrency: Currency.EGP, exchangeRate: '' })).toBe(
      250,
    );
  });

  // Each row is one of the resolver's throw conditions, guarded rather than
  // caught: reaching the resolver with any of them throws inside a render.
  it.each([
    ['nothing typed yet', { amount: '' }],
    ['an amount the parser cannot read', { amount: '1,23' }],
    ['an amount under the money floor', { amount: '0.004' }],
    ['a rate the parser cannot read', { amount: '100', exchangeRate: '49.' }],
    ['no rate at all with a USD side', { amount: '100', exchangeRate: '' }],
    [
      'a transfer with no destination picked',
      { amount: '100', type: TransactionType.Transfer, destinationCurrency: undefined },
    ],
  ] as const)('has no preview for %s', async (_label, input) => {
    expect(await preview(input)).toBeUndefined();
  });

  it('has no preview before an account is picked', async () => {
    useAddTransactionStore.getState().setAmountStr('100');
    const { result } = await renderHook(() =>
      useTransactionRatePreview({
        mode: 'add',
        type: TransactionType.Expense,
        sourceCurrency: undefined,
        destinationCurrency: undefined,
        exchangeRate: RATE,
      }),
    );

    expect(result.current).toBeUndefined();
  });

  // `mode` picks the store, and the edit form's amount lives in its own.
  // Reading the add store in edit mode would preview a stale or empty amount.
  it('reads the edit store in edit mode', async () => {
    useAddTransactionStore.getState().setAmountStr('999');
    useEditTransactionStore.getState().setAmountStr('100');
    const { result } = await renderHook(() =>
      useTransactionRatePreview({
        mode: 'edit',
        type: TransactionType.Expense,
        sourceCurrency: Currency.USD,
        destinationCurrency: undefined,
        exchangeRate: RATE,
      }),
    );

    expect(result.current).toBe(4906);
  });
});
