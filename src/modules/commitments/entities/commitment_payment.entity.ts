import type { CommitmentPaymentStatus, Currency } from '@/constants/enums';

export interface CommitmentPayment {
  id: string;
  commitment_id: string;
  due_date: string;
  paid_date: string | null;
  skipped_date: string | null;
  amount_due: number | null;
  amount_paid: number | null;
  currency: Currency;
  exchange_rate_snapshot: number | null;
  account_id: string | null;
  transaction_id: string | null;
  status: CommitmentPaymentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
