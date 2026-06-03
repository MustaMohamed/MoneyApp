import type { Budget } from '@/modules/budget/entities/budget.entity';
import { BudgetStore } from '@/modules/budget/store/budget.store';
import type { IAppSettingsRepository } from '@/repositories/app_settings.repository';

const NOW = '2026-05-01T00:00:00.000Z';
const r: Budget = {
  id: 'b1',
  category_id: 'a',
  limit_amount: 3000,
  effective_from: '2026-05',
  created_at: NOW,
  updated_at: NOW,
};

function makeRepo(): IAppSettingsRepository {
  return {
    get: jest.fn(async () => null),
    set: jest.fn(async () => undefined),
  };
}

describe('BudgetStore', () => {
  it('starts empty and not loaded', () => {
    const store = new BudgetStore(makeRepo());

    expect(store.rows).toEqual([]);
    expect(store.spendByMonth).toEqual({});
    expect(store.loaded).toBe(false);
    expect(store.expectedIncome).toBeNull();
  });

  it('setData stores rows, spend, expected income and flips loaded', () => {
    const store = new BudgetStore(makeRepo());

    store.setData([r], { a: { '2026-05': 2400 } }, 12000);

    expect(store.rows).toEqual([r]);
    expect(store.spendByMonth.a['2026-05']).toBe(2400);
    expect(store.expectedIncome).toBe(12000);
    expect(store.loaded).toBe(true);
  });

  it('reset returns to initial', () => {
    const store = new BudgetStore(makeRepo());

    store.setData([r], { a: { '2026-05': 2400 } }, 12000);
    store.reset();

    expect(store.rows).toEqual([]);
    expect(store.spendByMonth).toEqual({});
    expect(store.loaded).toBe(false);
    expect(store.expectedIncome).toBeNull();
  });
});
