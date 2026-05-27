// modules/budget/index.ts
// Public API — store and shared types only.
// BudgetRepository and database helpers are internal;
// access budget data through the store.
export { useBudgetStore, createBudgetStore } from './store/budget.store';
export type { Budget } from './entities/budget.entity';
