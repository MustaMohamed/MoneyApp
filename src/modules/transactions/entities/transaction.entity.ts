import type { Currency, TransactionType } from '@/constants/enums';

export interface Transaction {
  id: string;
  type: TransactionType;
  /** Face value in the FROM account's own currency; drives that account's balance mutation. */
  amount: number;
  currency: Currency;
  /** Always stored in EGP for net-worth / analytics calculations. */
  egp_amount: number;
  /** Rate at save time; set even for USD to USD, where only `egp_amount` needs it. */
  exchange_rate: number | null;
  /** Received in the TO account's currency; null for expense/income, EGP for `cc_payment`. */
  to_amount: number | null;
  /** Snapshotted so a later `minimum_payment` edit cannot corrupt reversal; null otherwise. */
  minimum_payment_snapshot: number | null;
  /** Stored for `cc_payment` reversal; the original cap cannot be reconstructed later. */
  revolving_balance_delta: number | null;
  /** Primary account: debit source for expense/transfer/cc_payment, credit target for income. */
  account_id: string;
  /** Transfer destination or CC account being paid. */
  to_account_id: string | null;
  /** null for transfer and cc_payment types. */
  category_id: string | null;
  /** Nullable named monthly budget assignment; expenses and derived Card credits only. */
  budget_id: string | null;
  note: string | null;
  /** ISO date string, e.g. '2026-05-01'. */
  transaction_date: string;
  /** HH:MM:SS, e.g. '14:30:00'. */
  transaction_time: string;
  /** FK to commitment_payments.id; set when this transaction fulfils a commitment payment. */
  commitment_payment_id: string | null;
  /** FK to installments.id; set when this transaction is part of an installment plan. */
  installment_id: string | null;
  created_at: string;
  updated_at: string;
}
