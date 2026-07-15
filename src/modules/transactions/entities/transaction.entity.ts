// modules/transactions/entities/transaction.entity.ts
import type { Currency, TransactionType } from '@/constants/enums';

export interface Transaction {
  id: string;
  type: TransactionType;
  /** Face-value amount in the FROM account's own currency. Used for FROM-account balance mutations. */
  amount: number;
  currency: Currency;
  /** Always stored in EGP for net-worth / analytics calculations. */
  egp_amount: number;
  /**
   * Rate captured at save time; set whenever a USD↔EGP conversion is involved.
   *
   * For USD → USD transfers this is still required: `to_amount = amount` (same-
   * currency branch), but `egp_amount = amount × rate` is needed for net-worth
   * tracking — so the rate is captured solely for the egp_amount calculation.
   */
  exchange_rate: number | null;
  /**
   * Amount received by the TO account in the TO account's native currency.
   * Populated for transfer and cc_payment types; null for expense and income.
   *
   * Computation rules:
   *   EGP → EGP transfer:  to_amount = amount
   *   USD → EGP transfer:  to_amount = egp_amount   (EGP received)
   *   EGP → USD transfer:  to_amount = amount / rate (USD received)
   *   USD → USD transfer:  to_amount = amount
   *   cc_payment (any):    to_amount = egp_amount    (CC debt is always EGP-denominated)
   */
  to_amount: number | null;
  /**
   * Snapshot of the CC account's minimum_payment at the time of a cc_payment transaction.
   * Used during reversal so that changes to minimum_payment after the fact do not corrupt
   * the revolving_balance calculation.
   * null for non-cc_payment types.
   */
  minimum_payment_snapshot: number | null;
  /** Primary account: debit source for expense/transfer/cc_payment, credit target for income. */
  account_id: string;
  /** Transfer destination or CC account being paid. */
  to_account_id: string | null;
  /** null for transfer and cc_payment types. */
  category_id: string | null;
  /** Nullable named monthly budget assignment; expense transactions only. */
  budget_id: string | null;
  note: string | null;
  /** ISO date string, e.g. '2026-05-01'. */
  transaction_date: string;
  /** HH:MM:SS, e.g. '14:30:00'. */
  transaction_time: string;
  /** FK to commitment_payments.id; set when this transaction fulfils a commitment payment. */
  commitment_payment_id: string | null;
  /**
   * FK to installments.id; set when this transaction is part of an installment plan.
   * Reserved by §7; populated by §8 once the installments table ships.
   */
  installment_id: string | null;
  created_at: string;
  updated_at: string;
}
