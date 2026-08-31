// Backward-compat re-export; remove when all consumers use `@/modules/accounts`.
export {
  createAccountStore,
  EMPTY_ACCOUNTS,
  useAccountStore,
} from '@/modules/accounts/store/account.store';
export type {
  Account,
  AccountStore,
  NewAccountInput,
  UpdateAccountInput,
} from '@/modules/accounts/store/account.store';
