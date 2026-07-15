import uuid from 'react-native-uuid';

import { CategoryType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { getDb } from '@/database/client';
import {
  getBudgetSpendByMonth,
  getCategorySpendByMonth,
  getSpendingPlanSpend,
} from '@/modules/budget/database/budget_stats';
import {
  deleteBudgetRow,
  getBudgetRowById,
  getBudgetRows,
  getBudgetRowsForCategoryMonth,
  setBudgetRow,
} from '@/modules/budget/database/budgets';
import {
  getSpendingPlanCategoryRows,
  replaceSpendingPlanCategoryRows,
} from '@/modules/budget/database/spending_plan_categories';
import {
  deleteSpendingPlan,
  getSpendingPlanById,
  getSpendingPlanRows,
  getSpendingPlanRowsForRange,
  setSpendingPlanRow,
} from '@/modules/budget/database/spending_plans';
import type {
  Budget,
  SpendingPlan,
  SpendingPlanCategory,
  SpendingPlanWithCategories,
} from '@/modules/budget/entities/budget.entity';
import { getCategoriesByType } from '@/modules/categories/database/categories';
import { spendingPlanInputSchema, type SpendingPlanInput } from '@/utils/schemas/budget.schema';

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
  getById(id: string): Promise<Budget | undefined>;
  getBudgetsForCategoryMonth(categoryId: string, yearMonth: string): Promise<Budget[]>;
  setBudget(input: SetBudgetInput): Promise<void>;
  setLimit(categoryId: string, limit: number, yearMonth?: string): Promise<void>;
  removeBudget(id: string, yearMonth?: string): Promise<void>;
  copyBudgetsToMonth(sourceMonth: string, targetMonth: string, budgetIds: string[]): Promise<void>;
  copyLimitsToMonth(sourceMonth: string, targetMonth: string, categoryIds: string[]): Promise<void>;
  getSpendByMonth(yearMonths: string[]): Promise<Record<string, Record<string, number>>>;
  getSpendByBudget(yearMonths: string[]): Promise<Record<string, number>>;
  getSpendingPlansForMonth(yearMonth: string): Promise<SpendingPlansForMonthResult>;
  getSpendingPlanDetails(id: string): Promise<SpendingPlanDetailsResult | undefined>;
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

export type SetSpendingPlanInput = SpendingPlanInput;

export interface SpendingPlansForMonthResult {
  plans: SpendingPlanWithCategories[];
  spendByPlanId: Record<string, Record<string, number>>;
}

export interface SpendingPlanDetailsResult {
  plan: SpendingPlanWithCategories;
  spend: Record<string, number>;
}

export class SpendingPlanValidationError extends Error {}

function hydrateSpendingPlans(
  plans: SpendingPlan[],
  categories: SpendingPlanCategory[],
): SpendingPlanWithCategories[] {
  const categoriesByPlan = new Map<string, SpendingPlanCategory[]>();
  for (const category of categories) {
    const rows = categoriesByPlan.get(category.plan_id) ?? [];
    rows.push(category);
    categoriesByPlan.set(category.plan_id, rows);
  }
  return plans.map((plan) => ({ ...plan, categories: categoriesByPlan.get(plan.id) ?? [] }));
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
  const result = spendingPlanInputSchema.safeParse(input);
  if (!result.success) {
    throw new SpendingPlanValidationError(
      result.error.issues[0]?.message ?? Strings.budgetPlanSaveError,
    );
  }
}

export class BudgetRepository implements IBudgetRepository {
  async getRows(): Promise<Budget[]> {
    const db = await getDb();
    return getBudgetRows(db);
  }

  async getById(id: string): Promise<Budget | undefined> {
    const db = await getDb();
    return (await getBudgetRowById(db, id)) ?? undefined;
  }

  async getBudgetsForCategoryMonth(categoryId: string, yearMonth: string): Promise<Budget[]> {
    const db = await getDb();
    return getBudgetRowsForCategoryMonth(db, categoryId, yearMonth);
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

  async getSpendByBudget(yearMonths: string[]): Promise<Record<string, number>> {
    const db = await getDb();
    return getBudgetSpendByMonth(db, yearMonths);
  }

  async getSpendingPlansForMonth(yearMonth: string): Promise<SpendingPlansForMonthResult> {
    const db = await getDb();
    const planRows = await getSpendingPlanRows(db, yearMonth);
    const planIds = planRows.map((plan) => plan.id);
    const [categoryRows, spendByPlanId] = await Promise.all([
      getSpendingPlanCategoryRows(db, planIds),
      getSpendingPlanSpend(db, planIds),
    ]);
    return { plans: hydrateSpendingPlans(planRows, categoryRows), spendByPlanId };
  }

  async getSpendingPlanDetails(id: string): Promise<SpendingPlanDetailsResult | undefined> {
    const db = await getDb();
    const plan = await getSpendingPlanById(db, id);
    if (!plan) return undefined;
    const [categories, spendByPlanId] = await Promise.all([
      getSpendingPlanCategoryRows(db, [id]),
      getSpendingPlanSpend(db, [id]),
    ]);
    return {
      plan: { ...plan, categories },
      spend: spendByPlanId[id] ?? {},
    };
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
      if (invalidCategory) {
        throw new SpendingPlanValidationError(Strings.budgetPlanExpenseCategoriesOnly);
      }

      const existingPlanRows = await getSpendingPlanRowsForRange(tx, {
        startDate: input.startDate,
        endDate: input.endDate,
      });
      const existingPlanCategories = await getSpendingPlanCategoryRows(
        tx,
        existingPlanRows.map((plan) => plan.id),
      );
      const existingPlans = hydrateSpendingPlans(existingPlanRows, existingPlanCategories);
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
        throw new SpendingPlanValidationError(
          Strings.budgetPlanOverlapError(categoryName, conflict.name),
        );
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

      await setSpendingPlanRow(tx, plan);
      await replaceSpendingPlanCategoryRows(
        tx,
        planId,
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
