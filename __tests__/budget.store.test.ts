import type { Budget } from '@/database/entities/budget.entity';
import { createBudgetStore } from '@/store/budget.store';

function makeRepo() {
  return {
    get: jest.fn(async (_key: string) => null as string | null),
    set: jest.fn(async (_key: string, _value: string) => {}),
  };
}

const useBudgetStore = createBudgetStore(makeRepo());

beforeEach(() => useBudgetStore.getState().reset());

const NOW = '2026-05-01T00:00:00.000Z';
const r: Budget = {
  id: 'b1',
  category_id: 'a',
  limit_amount: 3000,
  effective_from: '2026-05',
  created_at: NOW,
  updated_at: NOW,
};

describe('useBudgetStore', () => {
  it('starts empty and not loaded', () => {
    const s = useBudgetStore.getState().state;
    expect(s.rows).toEqual([]);
    expect(s.spendByMonth).toEqual({});
    expect(s.loaded).toBe(false);
  });

  it('setData stores rows + spend and flips loaded', () => {
    useBudgetStore.getState().setData([r], { a: { '2026-05': 2400 } }, null);
    const s = useBudgetStore.getState().state;
    expect(s.rows).toEqual([r]);
    expect(s.spendByMonth.a['2026-05']).toBe(2400);
    expect(s.loaded).toBe(true);
  });

  it('reset returns to initial', () => {
    useBudgetStore.getState().setData([r], { a: { '2026-05': 2400 } }, null);
    useBudgetStore.getState().reset();
    expect(useBudgetStore.getState().state.loaded).toBe(false);
  });
});
