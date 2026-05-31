// backward-compat re-export — remove when all consumers are migrated to @/modules/accounts
export {
  AccountStore,
  EMPTY_ACCOUNTS,
  useAccountStore,
} from '@/modules/accounts/store/account.store';
export type {
  Account,
  NewAccountInput,
  UpdateAccountInput,
} from '@/modules/accounts/store/account.store';
