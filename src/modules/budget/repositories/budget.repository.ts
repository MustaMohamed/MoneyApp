import uuid from 'react-native-uuid';

import { getDb } from '@/database/client';
import { getCategorySpendByMonth } from '@/modules/budget/database/budget_stats';
import { deleteBudgetRow, getBudgetRows, setBudgetRow } from '@/modules/budget/database/budgets';
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
  setBudget(input: SetBudgetInput): Promise<void>;
  setLimit(categoryId: string, limit: number, yearMonth?: string): Promise<void>;
  removeBudget(id: string, yearMonth?: string): Promise<void>;
  copyBudgetsToMonth(sourceMonth: string, targetMonth: string, budgetIds: string[]): Promise<void>;
  copyLimitsToMonth(sourceMonth: string, targetMonth: string, categoryIds: string[]): Promise<void>;
  getSpendByMonth(yearMonths: string[]): Promise<Record<string, Record<string, number>>>;
}

export interface SetBudgetInput {
  id?: string;
  categoryId: string;
  name: string;
  limit: number;
  yearMonth?: string;
}

function normalizeBudgetName(name: string): string {
  return name.trim();
}

function sameBudgetName(left: string, right: string): boolean {
  return normalizeBudgetName(left).toLowerCase() === normalizeBudgetName(right).toLowerCase();
}

export class BudgetRepository implements IBudgetRepository {
  async getRows(): Promise<Budget[]> {
    const db = await getDb();
    return getBudgetRows(db);
  }

  async setBudget(input: SetBudgetInput): Promise<void> {
    const db = await getDb();
    const now = new Date().toISOString();
    const yearMonth = input.yearMonth ?? currentYearMonth();
    const existing = input.id
      ? (await getBudgetRows(db)).find((row) => row.id === input.id)
      : undefined;

    await setBudgetRow(db, {
      id: input.id ?? String(uuid.v4()),
      category_id: input.categoryId,
      name: normalizeBudgetName(input.name),
      limit_amount: input.limit,
      effective_from: yearMonth,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    });
  }

  async setLimit(categoryId: string, limit: number, yearMonth = currentYearMonth()): Promise<void> {
    await this.setBudget({ categoryId, name: 'Budget', limit, yearMonth });
  }

  async removeBudget(id: string, _yearMonth = currentYearMonth()): Promise<void> {
    const db = await getDb();
    await deleteBudgetRow(db, id);
  }

  async copyBudgetsToMonth(
    sourceMonth: string,
    targetMonth: string,
    budgetIds: string[],
  ): Promise<void> {
    const db = await getDb();
    const rows = await getBudgetRows(db);
    const now = new Date().toISOString();
    const uniqueBudgetIds = Array.from(new Set(budgetIds));

    await Promise.all(
      uniqueBudgetIds.map(async (budgetId) => {
        const source = rows.find(
          (row) => row.id === budgetId && row.effective_from === sourceMonth,
        );
        if (!source) return;

        const target = rows.find(
          (row) =>
            row.category_id === source.category_id &&
            row.effective_from === targetMonth &&
            sameBudgetName(row.name, source.name),
        );

        await setBudgetRow(db, {
          id: target?.id ?? String(uuid.v4()),
          category_id: source.category_id,
          name: source.name,
          limit_amount: source.limit_amount,
          effective_from: targetMonth,
          created_at: target?.created_at ?? now,
          updated_at: now,
        });
      }),
    );
  }

  async copyLimitsToMonth(
    sourceMonth: string,
    targetMonth: string,
    categoryIds: string[],
  ): Promise<void> {
    const db = await getDb();
    const rows = await getBudgetRows(db);
    const now = new Date().toISOString();
    const uniqueCategoryIds = Array.from(new Set(categoryIds));

    await Promise.all(
      uniqueCategoryIds.map(async (categoryId) => {
        const sourceRows = rows.filter(
          (row) => row.category_id === categoryId && row.effective_from === sourceMonth,
        );

        await Promise.all(
          sourceRows.map(async (source) => {
            const target = rows.find(
              (row) =>
                row.category_id === source.category_id &&
                row.effective_from === targetMonth &&
                sameBudgetName(row.name, source.name),
            );

            await setBudgetRow(db, {
              id: target?.id ?? String(uuid.v4()),
              category_id: categoryId,
              name: source.name,
              limit_amount: source.limit_amount,
              effective_from: targetMonth,
              created_at: target?.created_at ?? now,
              updated_at: now,
            });
          }),
        );
      }),
    );
  }

  async getSpendByMonth(yearMonths: string[]): Promise<Record<string, Record<string, number>>> {
    const db = await getDb();
    return getCategorySpendByMonth(db, yearMonths);
  }
}

export const budgetRepository = new BudgetRepository();
