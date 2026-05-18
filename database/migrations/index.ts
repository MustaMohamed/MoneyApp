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
];
