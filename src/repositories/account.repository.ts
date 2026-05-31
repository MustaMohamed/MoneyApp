// backward-compat re-export — remove when all consumers are migrated to @/modules/accounts
export {
  accountRepository,
  AccountRepository,
} from '@/modules/accounts/repositories/account.repository';
export type {
  IAccountRepository,
  NewAccountInput,
  UpdateAccountInput,
} from '@/modules/accounts/repositories/account.repository';
