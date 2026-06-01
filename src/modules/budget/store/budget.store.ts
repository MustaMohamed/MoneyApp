import { batch, signal, type ReadonlySignal } from '@preact/signals-react';

import type { Budget } from '@/modules/budget/entities/budget.entity';
import {
  budgetRepository,
  currentYearMonth,
  lastMonths,
} from '@/modules/budget/repositories/budget.repository';
import {
  AppSettingsRepository,
  type IAppSettingsRepository,
} from '@/repositories/app_settings.repository';

const HISTORY_MONTHS = 12;
const EXPECTED_INCOME_KEY = 'expected_monthly_income';

type SpendByMonth = Record<string, Record<string, number>>;

type BudgetSignalState = {
  rows: ReadonlySignal<Budget[]>;
  spendByMonth: ReadonlySignal<SpendByMonth>;
  loaded: ReadonlySignal<boolean>;
  /** Expected monthly income in EGP. null = not yet set by the user. */
  expectedIncome: ReadonlySignal<number | null>;
};

const INITIAL_ROWS: Budget[] = [];
Object.freeze(INITIAL_ROWS);
const INITIAL_SPEND_BY_MONTH: SpendByMonth = {};
Object.freeze(INITIAL_SPEND_BY_MONTH);

export class BudgetStore {
  private readonly rows = signal(INITIAL_ROWS);
  private readonly spendByMonth = signal(INITIAL_SPEND_BY_MONTH);
  private readonly loaded = signal(false);
  private readonly expectedIncome = signal<number | null>(null);

  readonly state: BudgetSignalState = {
    rows: this.rows,
    spendByMonth: this.spendByMonth,
    loaded: this.loaded,
    expectedIncome: this.expectedIncome,
  };

  private loadRequestId = 0;

  constructor(private readonly appSettingsRepository: IAppSettingsRepository) {}

  setData = (rows: Budget[], spendByMonth: SpendByMonth, expectedIncome: number | null): void => {
    batch(() => {
      this.rows.value = rows;
      this.spendByMonth.value = spendByMonth;
      this.expectedIncome.value = expectedIncome;
      this.loaded.value = true;
    });
  };

  load = async (): Promise<void> => {
    const requestId = ++this.loadRequestId;
    const months = lastMonths(currentYearMonth(), HISTORY_MONTHS);
    const [rows, spendByMonth, rawIncome] = await Promise.all([
      budgetRepository.getRows(),
      budgetRepository.getSpendByMonth(months),
      this.appSettingsRepository.get(EXPECTED_INCOME_KEY),
    ]);
    const expectedIncome = rawIncome !== null ? Number(rawIncome) : null;

    if (requestId === this.loadRequestId) {
      this.setData(rows, spendByMonth, expectedIncome);
    }
  };

  setLimit = async (categoryId: string, limit: number): Promise<void> => {
    await budgetRepository.setLimit(categoryId, limit);
    await this.load();
  };

  removeBudget = async (categoryId: string): Promise<void> => {
    await budgetRepository.removeBudget(categoryId);
    await this.load();
  };

  setExpectedIncome = async (amount: number): Promise<void> => {
    await this.appSettingsRepository.set(EXPECTED_INCOME_KEY, String(amount));
    await this.load();
  };

  /** Synchronous setter for tests — does not persist. */
  setExpectedIncomeLocal = (amount: number | null): void => {
    this.expectedIncome.value = amount;
  };

  reset = (): void => {
    this.loadRequestId += 1;
    batch(() => {
      this.rows.value = INITIAL_ROWS;
      this.spendByMonth.value = INITIAL_SPEND_BY_MONTH;
      this.loaded.value = false;
      this.expectedIncome.value = null;
    });
  };
}

export function createBudgetStore(repo: IAppSettingsRepository): BudgetStore {
  return new BudgetStore(repo);
}

const budgetStore = createBudgetStore(new AppSettingsRepository());

export function useBudgetStore(): BudgetStore {
  return budgetStore;
}
