import { useEffect, useMemo } from 'react';
import { z } from 'zod';

import { AccountType, Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';
import { useCurrencyStore } from '@/store/currency.store';
import { useTransactionStore } from '@/store/transaction.store';
import { useZodForm } from '@/utils/use_zod_form.hook';
import type { Account } from '@/database/entities/account.entity';
import type { Category } from '@/database/entities/category.entity';
import { useAddTransactionStore } from './add_transaction.store';

export type AddTransactionFormValues = {
  amount: number;
  accountId: string;
  toAccountId: string;
  categoryId: string;
  note: string;
  date: string;
  time: string;
  exchangeRate: string;
};

function createSchema(type: TransactionType, accounts: Account[]) {
  const isTransferOrCC = type === TransactionType.Transfer || type === TransactionType.CCPayment;

  return z
    .object({
      amount: z
        .number({ error: Strings.addTxErrAmountRequired })
        .refine((v) => v > 0, Strings.addTxErrAmountZero),
      accountId: z
        .string()
        .min(1, isTransferOrCC ? Strings.addTxErrFromRequired : Strings.addTxErrAccountRequired),
      toAccountId: z.string(),
      categoryId: z.string(),
      note: z.string(),
      date: z.string().min(1),
      time: z.string().min(1),
      exchangeRate: z.string(),
    })
    .superRefine((data, ctx) => {
      if (isTransferOrCC) {
        if (!data.toAccountId) {
          ctx.addIssue({
            code: 'custom',
            message: Strings.addTxErrToRequired,
            path: ['toAccountId'],
          });
        } else if (data.accountId && data.accountId === data.toAccountId) {
          ctx.addIssue({
            code: 'custom',
            message: Strings.addTxErrSameAccount,
            path: ['toAccountId'],
          });
        }
      } else if (!data.categoryId) {
        ctx.addIssue({
          code: 'custom',
          message: Strings.addTxErrCategoryRequired,
          path: ['categoryId'],
        });
      }
      const account = accounts.find((a) => a.id === data.accountId);
      if (type === TransactionType.CCPayment) {
        if (account && account.type === AccountType.CreditCard) {
          ctx.addIssue({
            code: 'custom',
            message: Strings.addTxErrCcPaymentSourceMustBeAsset,
            path: ['accountId'],
          });
        }
        const toAccount = accounts.find((a) => a.id === data.toAccountId);
        if (toAccount && toAccount.type !== AccountType.CreditCard) {
          ctx.addIssue({
            code: 'custom',
            message: Strings.addTxErrCcPaymentTargetMustBeCC,
            path: ['toAccountId'],
          });
        }
      }
      if (type === TransactionType.Transfer) {
        // Transfers move money between asset accounts. Anything involving a
        // credit card belongs in a CC Payment instead — keep the two flows
        // separate so the resulting transaction type accurately reflects the
        // operation (and so the CC revolving/installment math is correct).
        if (account && account.type === AccountType.CreditCard) {
          ctx.addIssue({
            code: 'custom',
            message: Strings.addTxErrTransferNoCc,
            path: ['accountId'],
          });
        }
        const toAccount = accounts.find((a) => a.id === data.toAccountId);
        if (toAccount && toAccount.type === AccountType.CreditCard) {
          ctx.addIssue({
            code: 'custom',
            message: Strings.addTxErrTransferNoCc,
            path: ['toAccountId'],
          });
        }
      }
      if (account?.currency === Currency.USD) {
        if (!data.exchangeRate) {
          ctx.addIssue({
            code: 'custom',
            message: Strings.addTxErrRateRequired,
            path: ['exchangeRate'],
          });
        } else {
          const rate = parseFloat(data.exchangeRate);
          if (isNaN(rate) || rate <= 0) {
            ctx.addIssue({
              code: 'custom',
              message: Strings.addTxErrRateInvalid,
              path: ['exchangeRate'],
            });
          }
        }
      }
    });
}

function buildDefaults(currentRate: number): AddTransactionFormValues {
  const now = new Date().toISOString();
  return {
    amount: 0,
    accountId: '',
    toAccountId: '',
    categoryId: '',
    note: '',
    date: now.slice(0, 10),
    time: now.slice(11, 19),
    exchangeRate: String(currentRate),
  };
}

export function useAddTransaction(onClose: () => void) {
  const accounts = useAccountStore((s) => s.accounts);
  const categories = useCategoryStore((s) => s.categories);
  const currentRate = useCurrencyStore((s) => s.rate);
  const addTransaction = useTransactionStore((s) => s.addTransaction);
  const loadAccounts = useAccountStore((s) => s.loadAccounts);

  const {
    type,
    amountStr,
    visible,
    saving,
    setSaving,
    showAccountPicker,
    setShowAccountPicker,
    showToPicker,
    setShowToPicker,
    showCategoryPicker,
    setShowCategoryPicker,
    setType,
    handleNumpad,
  } = useAddTransactionStore();

  const schema = useMemo(() => createSchema(type, accounts), [type, accounts]);

  const form = useZodForm(schema, {
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: buildDefaults(currentRate),
  });

  const accountId = form.watch('accountId');
  const toAccountId = form.watch('toAccountId');
  const categoryId = form.watch('categoryId');
  const note = form.watch('note');
  const exchangeRate = form.watch('exchangeRate');

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === accountId) ?? null,
    [accounts, accountId],
  );
  const isUSD = selectedAccount?.currency === Currency.USD;

  const selectedToAccount = useMemo(
    () => accounts.find((a) => a.id === toAccountId) ?? null,
    [accounts, toAccountId],
  );
  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId) ?? null,
    [categories, categoryId],
  );
  const visibleCategories = useMemo(
    () =>
      categories.filter((c) => c.type === (type === TransactionType.Income ? 'income' : 'expense')),
    [categories, type],
  );

  // Picker eligibility:
  //   CC payment: source = non-CC asset, target = CC.
  //   Transfer:   neither side may be a CC (CC moves go through cc_payment).
  //   Expense / Income: any account.
  const accountsForFrom = useMemo(() => {
    if (type === TransactionType.CCPayment || type === TransactionType.Transfer) {
      return accounts.filter((a) => a.type !== AccountType.CreditCard);
    }
    return accounts;
  }, [accounts, type]);
  const accountsForTo = useMemo(() => {
    if (type === TransactionType.CCPayment) {
      return accounts.filter((a) => a.type === AccountType.CreditCard);
    }
    if (type === TransactionType.Transfer) {
      return accounts.filter((a) => a.type !== AccountType.CreditCard);
    }
    return accounts;
  }, [accounts, type]);

  const errors = {
    amount: form.formState.errors.amount?.message,
    account: form.formState.errors.accountId?.message,
    toAccount: form.formState.errors.toAccountId?.message,
    category: form.formState.errors.categoryId?.message,
    rate: form.formState.errors.exchangeRate?.message,
  };

  // Sync numpad display string → RHF amount field
  useEffect(() => {
    const parsed = parseFloat(amountStr);
    form.setValue('amount', isNaN(parsed) ? 0 : parsed);
  }, [amountStr]);

  // Clear only the type-dependent fields when type changes; preserve note/date/time/exchangeRate.
  // (store already resets amountStr in setType)
  useEffect(() => {
    form.setValue('toAccountId', '');
    form.setValue('categoryId', '');
  }, [type]);

  // When the sheet closes, reset the form so the next open starts clean.
  useEffect(() => {
    if (!visible) {
      form.reset(buildDefaults(currentRate));
    }
  }, [visible]);

  const isTransferOrCC = type === TransactionType.Transfer || type === TransactionType.CCPayment;

  async function onValid(data: AddTransactionFormValues) {
    setSaving(true);
    try {
      const rate = isUSD && data.exchangeRate ? parseFloat(data.exchangeRate) : undefined;
      const egp_amount = isUSD && rate ? data.amount * rate : data.amount;

      await addTransaction({
        type,
        amount: data.amount,
        currency: selectedAccount?.currency ?? Currency.EGP,
        egp_amount,
        exchange_rate: rate,
        account_id: data.accountId,
        to_account_id: isTransferOrCC ? data.toAccountId : undefined,
        category_id: !isTransferOrCC ? data.categoryId : undefined,
        note: data.note.trim() || undefined,
        transaction_date: data.date,
        transaction_time: data.time,
      });
      await loadAccounts();
      onClose();
    } catch {
      // error logged by store
    } finally {
      setSaving(false);
    }
  }

  function selectAccount(account: Account) {
    form.setValue('accountId', account.id);
    if (account.currency === Currency.USD) {
      form.setValue('exchangeRate', String(currentRate));
    }
    setShowAccountPicker(false);
  }

  function selectToAccount(account: Account) {
    form.setValue('toAccountId', account.id);
    setShowToPicker(false);
  }

  function selectCategory(category: Category) {
    form.setValue('categoryId', category.id);
    setShowCategoryPicker(false);
  }

  return {
    form,
    type,
    setType,
    amountStr,
    handleNumpad,
    accountId,
    selectedAccount,
    toAccountId,
    selectedToAccount,
    categoryId,
    selectedCategory,
    note,
    setNote: (v: string) => form.setValue('note', v),
    exchangeRate,
    setExchangeRate: (v: string) => form.setValue('exchangeRate', v),
    isUSD,
    errors,
    saving,
    accounts,
    accountsForFrom,
    accountsForTo,
    visibleCategories,
    showAccountPicker,
    setShowAccountPicker,
    showToPicker,
    setShowToPicker,
    showCategoryPicker,
    setShowCategoryPicker,
    selectAccount,
    selectToAccount,
    selectCategory,
    handleSave: form.handleSubmit(onValid),
  };
}
