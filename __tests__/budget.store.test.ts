import type { Budget } from '@/modules/budget/entities/budget.entity';
import { useBudgetStore } from '@/modules/budget/store/budget.store';

beforeEach(() => useBudgetStore().reset());

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
    const s = useBudgetStore().state;
    expect(s.rows.value).toEqual([]);
    expect(s.spendByMonth.value).toEqual({});
    expect(s.loaded.value).toBe(false);
    expect(s.expectedIncome.value).toBeNull();
  });

  it('setData stores rows + spend and flips loaded', () => {
    useBudgetStore().setData([r], { a: { '2026-05': 2400 } }, null);
    const s = useBudgetStore().state;
    expect(s.rows.value).toEqual([r]);
    expect(s.spendByMonth.value.a['2026-05']).toBe(2400);
    expect(s.loaded.value).toBe(true);
  });

  it('reset returns to initial', () => {
    useBudgetStore().setData([r], { a: { '2026-05': 2400 } }, null);
    useBudgetStore().reset();
    expect(useBudgetStore().state.loaded.value).toBe(false);
  });

  it('removeBudget exists and is a function on the store', () => {
    const { removeBudget } = useBudgetStore();
    expect(typeof removeBudget).toBe('function');
  });
});
