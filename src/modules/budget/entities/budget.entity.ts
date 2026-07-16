import type { BudgetGroup } from '@/constants/enums';

export interface Budget {
  id: string;
  category_id: string;
  name: string;
  limit_amount: number;
  effective_from: string; // 'YYYY-MM'
  created_at: string;
  updated_at: string;
}

export interface BudgetMonthSetting {
  year_month: string;
  expected_income: number;
  created_at: string;
  updated_at: string;
}

export interface BudgetMonthCategoryGroup {
  year_month: string;
  category_id: string;
  budget_group: BudgetGroup;
  created_at: string;
  updated_at: string;
}

export type BudgetMonthGroupMap = Partial<Record<string, BudgetGroup>>;

export interface SpendingPlan {
  id: string;
  name: string;
  start_date: string; // 'YYYY-MM-DD'
  end_date: string; // 'YYYY-MM-DD'
  total_amount: number;
  created_at: string;
  updated_at: string;
}

export interface SpendingPlanCategory {
  plan_id: string;
  category_id: string;
  allocated_amount: number | null;
}

export interface SpendingPlanWithCategories extends SpendingPlan {
  categories: SpendingPlanCategory[];
}
