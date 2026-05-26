import uuid from 'react-native-uuid';

import { getCategorySpendByMonth } from '@/modules/budget/database/budget_stats';
import { getBudgetRows, setBudgetRow } from '@/modules/budget/database/budgets';
import { getDb } from '@/database/client';
import type { Budget } from '@/modules/budget/entities/budget.entity';

export function currentYearMonth(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// The last N calendar months ending at `end` (inclusive), oldest first.
export function lastMonths(end: string, n: number): string[] {
  const [y, m] = end.split('-').map(Number);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const total = y * 12 + (m - 1) - i;
    const yy = Math.floor(total / 12);
    const mm = (total % 12) + 1;
    out.push(`${yy}-${String(mm).padStart(2, '0')}`);
  }
  return out;
}

export interface IBudgetRepository {
  getRows(): Promise<Budget[]>;
  setLimit(categoryId: string, limit: number): Promise<void>;
  removeBudget(categoryId: string): Promise<void>;
  getSpendByMonth(yearMonths: string[]): Promise<Record<string, Record<string, number>>>;
}

export class BudgetRepository implements IBudgetRepository {
  async getRows(): Promise<Budget[]> {
    const db = await getDb();
    return getBudgetRows(db);
  }

  async setLimit(categoryId: string, limit: number): Promise<void> {
    const db = await getDb();
    const now = new Date().toISOString();
    await setBudgetRow(db, {
      id: String(uuid.v4()),
      category_id: categoryId,
      limit_amount: limit,
      effective_from: currentYearMonth(),
      created_at: now,
      updated_at: now,
    });
  }

  async removeBudget(categoryId: string): Promise<void> {
    const db = await getDb();
    const now = new Date().toISOString();
    await setBudgetRow(db, {
      id: String(uuid.v4()),
      category_id: categoryId,
      limit_amount: null,
      effective_from: currentYearMonth(),
      created_at: now,
      updated_at: now,
    });
  }

  async getSpendByMonth(yearMonths: string[]): Promise<Record<string, Record<string, number>>> {
    const db = await getDb();
    return getCategorySpendByMonth(db, yearMonths);
  }
}

export const budgetRepository = new BudgetRepository();
