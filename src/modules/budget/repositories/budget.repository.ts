import type { SQLiteDatabase } from 'expo-sqlite';
import uuid from 'react-native-uuid';

import { BudgetGroup, CategoryType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { getDb } from '@/database/client';
import {
  copyBudgetMonthCategoryGroups,
  getBudgetMonthCategoryGroups,
  getBudgetMonthIncome,
  setBudgetMonthCategoryGroup,
  setBudgetMonthIncome,
  snapshotBudgetMonthCategoryGroups,
} from '@/modules/budget/database/budget_month_profiles';
import {
  getBudgetSpendByMonth,
  getCategorySpendByMonth,
  getSpendingPlanSpend,
  getTrailingIncomeSuggestion,
} from '@/modules/budget/database/budget_stats';
import {
  deleteBudgetRow,
  getBudgetRowById,
  getBudgetRows,
  getBudgetRowsForCategoryMonth,
  getBudgetRowsForMonths,
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
  BudgetMonthGroupMap,
  SpendingPlan,
  SpendingPlanCategory,
  SpendingPlanWithCategories,
} from '@/modules/budget/entities/budget.entity';
import { getCategoriesByType, setCategoryGroup } from '@/modules/categories/database/categories';
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
  getMonthSnapshot(anchorMonth: string, historyMonths?: number): Promise<BudgetMonthSnapshot>;
  getCopyPreview(sourceMonth: string, targetMonth: string): Promise<Budget[]>;
  getById(id: string): Promise<Budget | undefined>;
  getBudgetsForCategoryMonth(categoryId: string, yearMonth: string): Promise<Budget[]>;
  getExpectedIncome(yearMonth: string): Promise<number | null>;
  getCategoryGroups(yearMonth: string): Promise<BudgetMonthGroupMap>;
  setExpectedIncome(yearMonth: string, amount: number): Promise<void>;
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
  categoryGroup?: BudgetGroup;
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

export interface BudgetMonthSnapshot {
  loadedMonth: string;
  rows: Budget[];
  spendByMonth: Record<string, Record<string, number>>;
  spendByBudgetId: Record<string, number>;
  expectedIncome: number | null;
  budgetGroupByCategoryId: BudgetMonthGroupMap;
  spendingPlans: SpendingPlanWithCategories[];
  spendingPlanSpendById: Record<string, Record<string, number>>;
  incomeSuggestion: number | null;
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

type BudgetCopyMode = 'budgets' | 'limits';

function buildBudgetCopyWrites({
  rows,
  sourceMonth,
  targetMonth,
  selectedIds,
  copyMode,
  now,
}: {
  rows: Budget[];
  sourceMonth: string;
  targetMonth: string;
  selectedIds: ReadonlySet<string>;
  copyMode: BudgetCopyMode;
  now: string;
}): { sourceRows: Budget[]; writes: Budget[] } {
  const sourceRows =
    copyMode === 'budgets'
      ? [...selectedIds]
          .map((budgetId) =>
            rows.find((row) => row.id === budgetId && row.effective_from === sourceMonth),
          )
          .filter((row): row is Budget => row !== undefined)
      : rows.filter(
          (row) => row.effective_from === sourceMonth && selectedIds.has(row.category_id),
        );

  return {
    sourceRows,
    writes: sourceRows.map((source) => {
      const target = rows.find(
        (row) =>
          row.category_id === source.category_id &&
          row.effective_from === targetMonth &&
          sameBudgetName(row.name, source.name),
      );
      return {
        id: target?.id ?? String(uuid.v4()),
        category_id: source.category_id,
        name: source.name,
        limit_amount: source.limit_amount,
        effective_from: targetMonth,
        created_at: target?.created_at ?? now,
        updated_at: now,
      };
    }),
  };
}

async function copyRowsInExclusiveTransaction(
  db: SQLiteDatabase,
  sourceMonth: string,
  targetMonth: string,
  selectedIds: ReadonlySet<string>,
  copyMode: BudgetCopyMode,
  now: string,
): Promise<void> {
  await db.withExclusiveTransactionAsync(async (transactionDb) => {
    const rows = await getBudgetRowsForMonths(transactionDb, [sourceMonth, targetMonth]);
    const { sourceRows, writes } = buildBudgetCopyWrites({
      rows,
      sourceMonth,
      targetMonth,
      selectedIds,
      copyMode,
      now,
    });

    for (const write of writes) {
      await setBudgetRow(transactionDb, write);
    }

    if (copyMode === 'budgets') {
      await copyBudgetMonthCategoryGroups(transactionDb, sourceMonth, targetMonth, [
        ...new Set(sourceRows.map((row) => row.category_id)),
      ]);
    }
  });
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

  async getMonthSnapshot(anchorMonth: string, historyMonths = 12): Promise<BudgetMonthSnapshot> {
    const db = await getDb();
    const months = lastMonths(anchorMonth, historyMonths);
    const [
      rows,
      spendByMonth,
      spendByBudgetId,
      expectedIncome,
      budgetGroupByCategoryId,
      spendingPlanRows,
      incomeSuggestion,
    ] = await Promise.all([
      getBudgetRowsForMonths(db, months),
      getCategorySpendByMonth(db, months),
      getBudgetSpendByMonth(db, months),
      getBudgetMonthIncome(db, anchorMonth),
      getBudgetMonthCategoryGroups(db, anchorMonth),
      getSpendingPlanRows(db, anchorMonth),
      getTrailingIncomeSuggestion(db, anchorMonth),
    ]);
    const spendingPlanIds = spendingPlanRows.map((plan) => plan.id);
    const [spendingPlanCategories, spendingPlanSpendById] = await Promise.all([
      getSpendingPlanCategoryRows(db, spendingPlanIds),
      getSpendingPlanSpend(db, spendingPlanIds),
    ]);

    return {
      loadedMonth: anchorMonth,
      rows,
      spendByMonth,
      spendByBudgetId,
      expectedIncome,
      budgetGroupByCategoryId,
      spendingPlans: hydrateSpendingPlans(spendingPlanRows, spendingPlanCategories),
      spendingPlanSpendById,
      incomeSuggestion,
    };
  }

  async getCopyPreview(sourceMonth: string, targetMonth: string): Promise<Budget[]> {
    const db = await getDb();
    return getBudgetRowsForMonths(db, [sourceMonth, targetMonth]);
  }

  async getById(id: string): Promise<Budget | undefined> {
    const db = await getDb();
    return (await getBudgetRowById(db, id)) ?? undefined;
  }

  async getBudgetsForCategoryMonth(categoryId: string, yearMonth: string): Promise<Budget[]> {
    const db = await getDb();
    return getBudgetRowsForCategoryMonth(db, categoryId, yearMonth);
  }

  async getExpectedIncome(yearMonth: string): Promise<number | null> {
    const db = await getDb();
    return getBudgetMonthIncome(db, yearMonth);
  }

  async getCategoryGroups(yearMonth: string): Promise<BudgetMonthGroupMap> {
    const db = await getDb();
    return getBudgetMonthCategoryGroups(db, yearMonth);
  }

  async setExpectedIncome(yearMonth: string, amount: number): Promise<void> {
    const db = await getDb();
    await db.withExclusiveTransactionAsync(async (tx) => {
      await setBudgetMonthIncome(tx, yearMonth, amount);
      await snapshotBudgetMonthCategoryGroups(tx, yearMonth);
    });
  }

  async setBudget(input: SetBudgetInput): Promise<void> {
    const db = await getDb();
    const now = new Date().toISOString();
    const yearMonth = input.yearMonth ?? currentYearMonth();
    const id = input.id ?? String(uuid.v4());

    await db.withExclusiveTransactionAsync(async (tx) => {
      const existing = input.id ? await getBudgetRowById(tx, input.id) : undefined;
      await setBudgetRow(tx, {
        id,
        category_id: input.categoryId,
        name: normalizeBudgetName(input.name),
        limit_amount: input.limit,
        effective_from: yearMonth,
        created_at: existing?.created_at ?? now,
        updated_at: now,
      });
      if (input.categoryGroup !== undefined) {
        await setBudgetMonthCategoryGroup(tx, yearMonth, input.categoryId, input.categoryGroup);
        await setCategoryGroup(tx, input.categoryId, input.categoryGroup);
      }
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
    const now = new Date().toISOString();
    await copyRowsInExclusiveTransaction(
      db,
      sourceMonth,
      targetMonth,
      new Set(budgetIds),
      'budgets',
      now,
    );
  }

  async copyLimitsToMonth(
    sourceMonth: string,
    targetMonth: string,
    categoryIds: string[],
  ): Promise<void> {
    const db = await getDb();
    const now = new Date().toISOString();
    await copyRowsInExclusiveTransaction(
      db,
      sourceMonth,
      targetMonth,
      new Set(categoryIds),
      'limits',
      now,
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
