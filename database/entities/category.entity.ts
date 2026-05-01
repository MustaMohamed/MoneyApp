import type { CategoryType } from '@/constants/enums';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  is_default: 0 | 1;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
