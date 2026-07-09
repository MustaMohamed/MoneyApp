import uuid from 'react-native-uuid';

import { CategoryType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { getDb } from '@/database/client';
import { getCategorySpendByMonth } from '@/modules/budget/database/budget_stats';
import { deleteBudgetRow, getBudgetRows, setBudgetRow } from '@/modules/budget/database/budgets';
import {
  deleteSpendingPlan,
  getPlanCategorySpend,
  getSpendingPlanById,
  getSpendingPlanRows,
  getSpendingPlanRowsForRange,
  setSpendingPlan as setSpendingPlanRow,
  type SpendingPlanWithCategories,
} from '@/modules/budget/database/spending_plans';
import type { Budget, SpendingPlan } from '@/modules/budget/entities/budget.entity';
import { getCategoriesByType } from '@/modules/categories/database/categories';

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
  getSpendingPlansForMonth(yearMonth: string): Promise<SpendingPlansForMonthResult>;
  setSpendingPlan(input: SetSpendingPlanInput): Promise<void>;
  removeSpendingPlan(id: string): Promise<void>;
}

export interface SetBudgetInput {
  id?: string;
  categoryId: string;
  name: string;
  limit: number;
  yearMonth?: string;
}

export interface SpendingPlanCategoryInput {
  categoryId: string;
  allocatedAmount?: number;
}

export interface SetSpendingPlanInput {
  id?: string;
  name: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  categories: SpendingPlanCategoryInput[];
}

export interface SpendingPlansForMonthResult {
  plans: SpendingPlanWithCategories[];
  spendByPlanId: Record<string, Record<string, number>>;
}

function normalizeBudgetName(name: string): string {
  return name.trim();
}

function sameBudgetName(left: string, right: string): boolean {
  return normalizeBudgetName(left).toLowerCase() === normalizeBudgetName(right).toLowerCase();
}

function normalizePlanName(name: string): string {
  return name.trim();
}

function rangesOverlap(
  left: { startDate: string; endDate: string },
  right: { startDate: string; endDate: string },
): boolean {
  return left.startDate <= right.endDate && left.endDate >= right.startDate;
}

function validateSpendingPlanInput(input: SetSpendingPlanInput): void {
  if (normalizePlanName(input.name).length === 0) throw new Error(Strings.budgetPlanNameRequired);
  if (input.endDate < input.startDate) throw new Error(Strings.budgetPlanDateInvalid);
  if (!Number.isFinite(input.totalAmount) || input.totalAmount <= 0) {
    throw new Error(Strings.budgetPlanAmountInvalid);
  }
  const unique = new Set(input.categories.map((category) => category.categoryId));
  if (unique.size === 0) throw new Error(Strings.budgetPlanCategoryRequired);
  if (unique.size !== input.categories.length) throw new Error('Duplicate plan category');
  for (const category of input.categories) {
    if (
      category.allocatedAmount !== undefined &&
      (!Number.isFinite(category.allocatedAmount) || category.allocatedAmount < 0)
    ) {
      throw new Error(Strings.budgetPlanAllocationInvalid);
    }
  }
  const allocated = input.categories.reduce(
    (total, category) => total + (category.allocatedAmount ?? 0),
    0,
  );
  if (allocated > input.totalAmount) throw new Error(Strings.budgetPlanAllocationOver);
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

  async getSpendingPlansForMonth(yearMonth: string): Promise<SpendingPlansForMonthResult> {
    const db = await getDb();
    const plans = await getSpendingPlanRows(db, yearMonth);
    const spendEntries = await Promise.all(
      plans.map(async (plan) => {
        const categoryIds = plan.categories.map((category) => category.category_id);
        const spend = await getPlanCategorySpend(db, {
          startDate: plan.start_date,
          endDate: plan.end_date,
          categoryIds,
        });
        return [plan.id, spend] as const;
      }),
    );
    return { plans, spendByPlanId: Object.fromEntries(spendEntries) };
  }

  async setSpendingPlan(input: SetSpendingPlanInput): Promise<void> {
    validateSpendingPlanInput(input);
    const db = await getDb();
    const now = new Date().toISOString();
    await db.withExclusiveTransactionAsync(async (tx) => {
      const expenseCategories = await getCategoriesByType(tx, CategoryType.Expense);
      const expenseCategoryById = new Map(
        expenseCategories.map((category) => [category.id, category]),
      );
      const invalidCategory = input.categories.find(
        (category) => !expenseCategoryById.has(category.categoryId),
      );
      if (invalidCategory) throw new Error(Strings.budgetPlanExpenseCategoriesOnly);

      const existingPlans = await getSpendingPlanRowsForRange(tx, {
        startDate: input.startDate,
        endDate: input.endDate,
      });
      const selectedCategoryIds = new Set(input.categories.map((category) => category.categoryId));
      const conflict = existingPlans
        .filter((plan) => plan.id !== input.id)
        .find(
          (plan) =>
            rangesOverlap(
              { startDate: input.startDate, endDate: input.endDate },
              { startDate: plan.start_date, endDate: plan.end_date },
            ) && plan.categories.some((category) => selectedCategoryIds.has(category.category_id)),
        );
      if (conflict) {
        const conflictCategoryId = conflict.categories.find((category) =>
          selectedCategoryIds.has(category.category_id),
        )?.category_id;
        const categoryName =
          (conflictCategoryId ? expenseCategoryById.get(conflictCategoryId)?.name : undefined) ??
          conflictCategoryId ??
          Strings.budgetPlanCategories;
        throw new Error(Strings.budgetPlanOverlapError(categoryName, conflict.name));
      }

      const existing = input.id ? await getSpendingPlanById(tx, input.id) : null;
      const planId = input.id ?? String(uuid.v4());
      const plan: SpendingPlan = {
        id: planId,
        name: normalizePlanName(input.name),
        start_date: input.startDate,
        end_date: input.endDate,
        total_amount: input.totalAmount,
        created_at: existing?.created_at ?? now,
        updated_at: now,
      };

      await setSpendingPlanRow(
        tx,
        plan,
        input.categories.map((category) => ({
          plan_id: planId,
          category_id: category.categoryId,
          allocated_amount: category.allocatedAmount ?? null,
        })),
      );
    });
  }

  async removeSpendingPlan(id: string): Promise<void> {
    const db = await getDb();
    await deleteSpendingPlan(db, id);
  }
}

export const budgetRepository = new BudgetRepository();
