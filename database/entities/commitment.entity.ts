import type { AmountType, Currency, DurationType, RecurrencePeriod } from '@/constants/enums';

export interface Commitment {
  id: string;
  name: string;
  amount_type: AmountType;
  amount: number | null;
  currency: Currency;
  category_id: string;
  recurrence_every: number;
  recurrence_period: RecurrencePeriod;
  start_date: string;
  account_id: string | null;
  notes: string | null;
  duration_type: DurationType;
  end_date: string | null;
  end_after_count: number | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}
