import { migration001 } from './001_create_accounts';
import { migration002 } from './002_create_app_settings';

export interface Migration {
  version: number;
  up: string;
}

export const MIGRATIONS: Migration[] = [migration001, migration002];
