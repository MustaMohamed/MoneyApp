import type { Currency, TransactionType } from '@/constants/enums';

export interface Transaction {
  id: string;
  type: TransactionType;
  /** Face-value amount in the account's own currency. */
  amount: number;
  currency: Currency;
  /** Always stored in EGP for net-worth / analytics calculations. */
  egp_amount: number;
  /** Rate captured at save time; only set when currency = USD. */
  exchange_rate: number | null;
  /** Primary account: debit source for expense/transfer/cc_payment, credit target for income. */
  account_id: string;
  /** Transfer destination or CC account being paid. */
  to_account_id: string | null;
  /** null for transfer and cc_payment types. */
  category_id: string | null;
  note: string | null;
  /** ISO date string, e.g. '2026-05-01'. */
  transaction_date: string;
  /** HH:MM:SS, e.g. '14:30:00'. */
  transaction_time: string;
  created_at: string;
  updated_at: string;
}
