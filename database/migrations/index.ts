import { migration001 } from './001_create_accounts';
import { migration002 } from './002_create_app_settings';
import { migration003 } from './003_create_categories';
import { migration004 } from './004_create_transactions';

export interface Migration {
  version: number;
  up: string;
}

export const MIGRATIONS: Migration[] = [migration001, migration002, migration003, migration004];
