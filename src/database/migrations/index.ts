import { migration001 } from './001_create_accounts';
import { migration002 } from './002_create_app_settings';
import { migration003 } from './003_create_categories';
import { migration004 } from './004_create_transactions';
import { migration005 } from './005_add_transaction_native_amounts';
import { migration006 } from './006_create_commitments';
import { migration007 } from './007_create_commitment_payments';
import { migration008 } from './008_add_commitment_payment_id';
import { migration009 } from './009_add_other_income_category';
import { migration010 } from './010_add_installment_id';
import { migration011 } from './011_create_budgets';
import { migration012 } from './012_add_budget_group';
import { migration013 } from './013_named_monthly_budgets';
import { migration014 } from './014_create_spending_plans';
import { migration015 } from './015_add_budget_id_to_transactions';
import { migration016 } from './016_create_budget_month_profiles';
import { migration017 } from './017_add_account_balance_review';

export interface Migration {
  version: number;
  up: string;
}

export const MIGRATIONS: Migration[] = [
  migration001,
  migration002,
  migration003,
  migration004,
  migration005,
  migration006,
  migration007,
  migration008,
  migration009,
  migration010,
  migration011,
  migration012,
  migration013,
  migration014,
  migration015,
  migration016,
  migration017,
];
