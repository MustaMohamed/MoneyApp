import type { BudgetGroup, CategoryType } from '@/constants/enums';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  is_default: 0 | 1;
  sort_order: number;
  budget_group: BudgetGroup | null;
  created_at: string;
  updated_at: string;
}
