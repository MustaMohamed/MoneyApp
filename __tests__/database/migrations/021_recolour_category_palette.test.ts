import Database from 'better-sqlite3';

import { MIGRATIONS, type Migration } from '@/database/migrations';
import { registerOpenDbsDrain } from '@/test_helpers/sqlite_drain';

const openDbs = registerOpenDbsDrain();

const CREATED = '2026-09-01T00:00:00.000Z';
const UPDATED = '2026-09-02T00:00:00.000Z';

// Old hex to new tone, the ticket's mapping at relative luminance 0.215.
const RECOLOUR: readonly (readonly [string, string])[] = [
  ['#1B2B4B', '#5C7FC4'],
  ['#C9973A', '#A2792C'],
  ['#3D7A5F', '#478D6E'],
  ['#C0442A', '#D5583E'],
  ['#4A2545', '#B264A7'],
  ['#185FA5', '#2381DF'],
  ['#D4830A', '#B67009'],
  ['#2D7D6E', '#338D7D'],
  ['#7B3F8C', '#A866BA'],
  ['#C45C2A', '#CC602C'],
  ['#4A6FA5', '#5D81B6'],
  ['#7A8B3C', '#76873A'],
  ['#4CAF82', '#3E8F6A'],
];

const SEEDED_AFTER: Record<string, string> = {
  cat_bank_fees: '#B264A7',
  cat_bills: '#5C7FC4',
  cat_car: '#5D81B6',
  cat_charity: '#478D6E',
  cat_clothes: '#76873A',
  cat_debt_payment: '#D5583E',
  cat_dining_out: '#B67009',
  cat_education: '#2381DF',
  cat_entertainment: '#CC602C',
  cat_family: '#338D7D',
  cat_food: '#A2792C',
  cat_freelance: '#A2792C',
  cat_gift_income: '#A866BA',
  cat_gifts: '#A2792C',
  cat_groceries: '#478D6E',
  cat_health: '#D5583E',
  cat_housing: '#5C7FC4',
  cat_money_transfer: '#5D81B6',
  cat_other_expense: '#6B7F99',
  cat_other_income: '#6B7F99',
  cat_phone_internet: '#A866BA',
  cat_returns: '#2381DF',
  cat_salary: '#3E8F6A',
  cat_savings: '#3E8F6A',
  cat_shopping: '#CC602C',
  cat_subscriptions: '#B264A7',
  cat_transfer_in: '#478D6E',
  cat_transport: '#2381DF',
  cat_utilities: '#338D7D',
};

function migration021(): Migration {
  const migration = MIGRATIONS.find(({ version }) => version === 21);
  expect(migration).toBeDefined();
  if (!migration) throw new Error('Expected migration 021');
  return migration;
}

function createDatabaseThrough020(): Database.Database {
  const db = new Database(':memory:');
  openDbs.push(db);
  db.pragma('foreign_keys = ON');
  db.exec(
    MIGRATIONS.filter(({ version }) => version <= 20)
      .map(({ up }) => up)
      .join('\n'),
  );
  return db;
}

function insertUserCategory(db: Database.Database, id: string, color: string): void {
  db.prepare(
    `INSERT INTO categories
       (id, name, type, icon, color, is_default, sort_order, created_at, updated_at)
     VALUES (?, ?, 'expense', 'star', ?, 0, 40, ?, ?)`,
  ).run(id, `User ${id}`, color, CREATED, UPDATED);
}

function colourOf(db: Database.Database, id: string): string {
  return (db.prepare('SELECT color FROM categories WHERE id = ?').get(id) as { color: string })
    .color;
}

function everyColumnButColour(db: Database.Database): unknown[] {
  const columns = (db.prepare('PRAGMA table_info(categories)').all() as { name: string }[])
    .map(({ name }) => name)
    .filter((name) => name !== 'color');
  return db.prepare(`SELECT ${columns.join(', ')} FROM categories ORDER BY id`).all();
}

describe('migration021 — recolour the category palette by value', () => {
  it('moves every seeded category to its new tone and leaves Other and Other Income on #6B7F99', () => {
    const db = createDatabaseThrough020();

    db.exec(migration021().up);

    const rows = db
      .prepare('SELECT id, color FROM categories WHERE is_default = 1 ORDER BY id')
      .all() as { id: string; color: string }[];
    expect(rows).toHaveLength(29);
    expect(Object.fromEntries(rows.map(({ id, color }) => [id, color]))).toEqual(SEEDED_AFTER);
  });

  it.each(RECOLOUR)('moves a user category on %s to %s', (oldHex, newHex) => {
    const db = createDatabaseThrough020();
    insertUserCategory(db, 'user', oldHex);

    db.exec(migration021().up);

    expect(colourOf(db, 'user')).toBe(newHex);
  });

  it.each(['#ABCDEF', '#6B7F99', '#1b2b4b'])(
    'leaves a user category on %s, outside the old list, unchanged',
    (hex) => {
      const db = createDatabaseThrough020();
      insertUserCategory(db, 'user', hex);

      db.exec(migration021().up);

      expect(colourOf(db, 'user')).toBe(hex);
    },
  );

  it('leaves a seeded category the user moved to a hex of their own unchanged', () => {
    const db = createDatabaseThrough020();
    db.prepare("UPDATE categories SET color = '#ABCDEF' WHERE id = 'cat_housing'").run();

    db.exec(migration021().up);

    expect(colourOf(db, 'cat_housing')).toBe('#ABCDEF');
  });

  it('changes no column but color on any row, updated_at included', () => {
    const db = createDatabaseThrough020();
    insertUserCategory(db, 'user_old', '#185FA5');
    insertUserCategory(db, 'user_own', '#ABCDEF');
    const before = everyColumnButColour(db);

    db.exec(migration021().up);

    expect(colourOf(db, 'user_old')).toBe('#2381DF');
    expect(everyColumnButColour(db)).toEqual(before);
  });

  it('changes nothing when it runs a second time', () => {
    const db = createDatabaseThrough020();
    insertUserCategory(db, 'user_old', '#4A2545');
    insertUserCategory(db, 'user_own', '#ABCDEF');
    db.exec(migration021().up);
    const once = db.prepare('SELECT * FROM categories ORDER BY id').all();

    db.exec(migration021().up);

    expect(colourOf(db, 'user_old')).toBe('#B264A7');
    expect(db.prepare('SELECT * FROM categories ORDER BY id').all()).toEqual(once);
  });
});
