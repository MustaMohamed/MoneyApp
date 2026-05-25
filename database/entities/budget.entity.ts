export interface Budget {
  id: string;
  category_id: string;
  limit_amount: number | null; // null = removed (tombstone) from effective_from onward
  effective_from: string; // 'YYYY-MM'
  created_at: string;
  updated_at: string;
}
