import { makeAutoObservable } from 'mobx';

import type { Budget } from '@/modules/budget/entities/budget.entity';
import {
  budgetRepository,
  currentYearMonth,
  type IBudgetRepository,
  lastMonths,
} from '@/modules/budget/repositories/budget.repository';
import {
  appSettingsRepository,
  type IAppSettingsRepository,
} from '@/repositories/app_settings.repository';

const HISTORY_MONTHS = 12;
const EXPECTED_INCOME_KEY = 'expected_monthly_income';

interface BudgetStoreState {
  rows: Budget[];
  // spend keyed { [categoryId]: { [yearMonth]: number } } over the loaded window
  spendByMonth: Record<string, Record<string, number>>;
  loaded: boolean;
  /** Expected monthly income in EGP. null = not yet set by the user. */
  expectedIncome: number | null;
}

const INITIAL_STATE: BudgetStoreState = {
  rows: [],
  spendByMonth: {},
  loaded: false,
  expectedIncome: null,
};

export class BudgetStore {
  rows: Budget[] = INITIAL_STATE.rows;
  spendByMonth: Record<string, Record<string, number>> = INITIAL_STATE.spendByMonth;
  loaded = INITIAL_STATE.loaded;
  expectedIncome: number | null = INITIAL_STATE.expectedIncome;

  constructor(
    private readonly settingsRepository: IAppSettingsRepository = appSettingsRepository,
    private readonly repo: IBudgetRepository = budgetRepository,
  ) {
    makeAutoObservable<BudgetStore, 'settingsRepository' | 'repo'>(
      this,
      {
        settingsRepository: false,
        repo: false,
      },
      { autoBind: true },
    );
  }

  setData(
    rows: Budget[],
    spendByMonth: Record<string, Record<string, number>>,
    expectedIncome: number | null,
  ) {
    this.rows = rows;
    this.spendByMonth = spendByMonth;
    this.expectedIncome = expectedIncome;
    this.loaded = true;
  }

  async load(): Promise<void> {
    const months = lastMonths(currentYearMonth(), HISTORY_MONTHS);
    const [rows, spendByMonth, rawIncome] = await Promise.all([
      this.repo.getRows(),
      this.repo.getSpendByMonth(months),
      this.settingsRepository.get(EXPECTED_INCOME_KEY),
    ]);
    const expectedIncome = rawIncome !== null ? Number(rawIncome) : null;
    this.setData(rows, spendByMonth, expectedIncome);
  }

  async setLimit(categoryId: string, limit: number): Promise<void> {
    await this.repo.setLimit(categoryId, limit);
    await this.load();
  }

  async removeBudget(categoryId: string): Promise<void> {
    await this.repo.removeBudget(categoryId);
    await this.load();
  }

  async setExpectedIncome(amount: number): Promise<void> {
    await this.settingsRepository.set(EXPECTED_INCOME_KEY, String(amount));
    await this.load();
  }

  /** Synchronous setter for tests — does not persist. */
  setExpectedIncomeLocal(amount: number | null) {
    this.expectedIncome = amount;
  }

  reset() {
    this.rows = INITIAL_STATE.rows;
    this.spendByMonth = INITIAL_STATE.spendByMonth;
    this.loaded = INITIAL_STATE.loaded;
    this.expectedIncome = INITIAL_STATE.expectedIncome;
  }
}

export function createBudgetStore(repo: IAppSettingsRepository) {
  return new BudgetStore(repo);
}

export const budgetStore = new BudgetStore(appSettingsRepository);

export function useBudgetStore(): BudgetStore {
  return budgetStore;
}
