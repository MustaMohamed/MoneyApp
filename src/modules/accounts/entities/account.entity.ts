import { AccountType, Currency } from '@/constants/enums';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: Currency;
  opening_balance: number;
  current_balance: number;
  color: string | null;
  credit_limit: number | null;
  revolving_balance: number | null;
  minimum_payment: number | null;
  statement_due_day: number | null;
  interest_tracking: 0 | 1;
  apr: number | null;
  is_archived: 0 | 1;
  balance_review_required: 0 | 1;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
