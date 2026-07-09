export interface Budget {
  id: string;
  category_id: string;
  name: string;
  limit_amount: number;
  effective_from: string; // 'YYYY-MM'
  created_at: string;
  updated_at: string;
}
