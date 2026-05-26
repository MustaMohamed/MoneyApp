import type { IAppSettingsRepository } from '@/repositories/app_settings.repository';
import { createBudgetStore } from '@/store/budget.store';

function makeRepo(seed: Record<string, string> = {}): IAppSettingsRepository {
  const db: Record<string, string> = { ...seed };
  return {
    get: jest.fn(async (key: string) => db[key] ?? null),
    set: jest.fn(async (key: string, value: string) => {
      db[key] = value;
    }),
  };
}

describe('useBudgetStore — 50/30/20 extensions', () => {
  it('initialises expectedIncome as null', () => {
    const store = createBudgetStore(makeRepo());
    expect(store.getState().state.expectedIncome).toBeNull();
  });

  it('setExpectedIncomeLocal updates state without persisting', () => {
    const repo = makeRepo();
    const store = createBudgetStore(repo);
    store.getState().setExpectedIncomeLocal(15000);
    expect(store.getState().state.expectedIncome).toBe(15000);
    expect(repo.set).not.toHaveBeenCalled();
  });

  it('reset clears expectedIncome back to null', () => {
    const store = createBudgetStore(makeRepo());
    store.getState().setExpectedIncomeLocal(15000);
    store.getState().reset();
    expect(store.getState().state.expectedIncome).toBeNull();
  });

  it('reset also resets loaded to false and clears rows/spendByMonth', () => {
    const store = createBudgetStore(makeRepo());
    store.getState().setData([], {}, 5000);
    store.getState().reset();
    const s = store.getState().state;
    expect(s.loaded).toBe(false);
    expect(s.rows).toEqual([]);
    expect(s.spendByMonth).toEqual({});
    expect(s.expectedIncome).toBeNull();
  });
});
