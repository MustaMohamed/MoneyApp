import Database from 'better-sqlite3';

import { MIGRATIONS, type Migration } from '@/database/migrations';
import { registerOpenDbsDrain } from '@/test_helpers/sqlite_drain';
import { stripNameEdges } from '@/utils/strip_name_edges';

const openDbs = registerOpenDbsDrain();

const CREATED = '2026-09-01T00:00:00.000Z';
const UPDATED = '2026-09-02T00:00:00.000Z';

interface CategoryRow {
  id: string;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
  updated_at: string;
}

function migration020(): Migration {
  const migration = MIGRATIONS.find(({ version }) => version === 20);
  expect(migration).toBeDefined();
  if (!migration) throw new Error('Expected migration 020');
  return migration;
}

function createDatabaseThrough019(): Database.Database {
  const db = new Database(':memory:');
  openDbs.push(db);
  db.pragma('foreign_keys = ON');
  db.exec(
    MIGRATIONS.filter(({ version }) => version <= 19)
      .map(({ up }) => up)
      .join('\n'),
  );
  return db;
}

function insertCategory(db: Database.Database, id: string, name: string): void {
  db.prepare(
    `INSERT INTO categories
       (id, name, type, icon, color, is_default, sort_order, created_at, updated_at)
     VALUES (?, ?, 'expense', 'star', '#185FA5', 0, 40, ?, ?)`,
  ).run(id, name, CREATED, UPDATED);
}

function insertCommitment(db: Database.Database, id: string, name: string): void {
  db.prepare(
    `INSERT INTO commitments
       (id, name, amount_type, amount, currency, category_id, recurrence_every,
        recurrence_period, start_date, duration_type, is_active, created_at, updated_at)
     VALUES (?, ?, 'fixed', 5000, 'EGP', 'cat_groceries', 1, 'months', '2026-09-01', 'forever', 1, ?, ?)`,
  ).run(id, name, CREATED, UPDATED);
}

function categoryName(db: Database.Database, id: string): string {
  return (db.prepare('SELECT name FROM categories WHERE id = ?').get(id) as { name: string }).name;
}

function commitmentRow(
  db: Database.Database,
  id: string,
): { name: string; amount: number; updated_at: string } {
  return db.prepare('SELECT name, amount, updated_at FROM commitments WHERE id = ?').get(id) as {
    name: string;
    amount: number;
    updated_at: string;
  };
}

describe('migration020 — strip stored category and commitment names', () => {
  it('strips surrounding spaces, tabs, carriage returns and newlines from a category name', () => {
    const db = createDatabaseThrough019();
    insertCategory(db, 'padded', ' Food ');
    insertCategory(db, 'mixed', '\t Trip \n');
    insertCategory(db, 'carriage', '\r Bills \r');

    db.exec(migration020().up);

    expect(categoryName(db, 'padded')).toBe('Food');
    expect(categoryName(db, 'mixed')).toBe('Trip');
    expect(categoryName(db, 'carriage')).toBe('Bills');
  });

  it('stores every seeded name as stripNameEdges reads it, on both tables', () => {
    const db = createDatabaseThrough019();
    const names = [
      ' Food ',
      '\t Trip \n',
      '\r Bills \r',
      ' \r\n\tPets\t\n\r ',
      ' \r\n\t',
      'a  b',
      ' Gym ',
      '',
    ];
    names.forEach((name, i) => {
      insertCategory(db, `category_${i}`, name);
      insertCommitment(db, `commitment_${i}`, name);
    });

    db.exec(migration020().up);

    names.forEach((name, i) => {
      expect(categoryName(db, `category_${i}`)).toBe(stripNameEdges(name));
      expect(commitmentRow(db, `commitment_${i}`).name).toBe(stripNameEdges(name));
    });
  });

  it('leaves a category name of only whitespace empty', () => {
    const db = createDatabaseThrough019();
    insertCategory(db, 'blank', '   ');

    db.exec(migration020().up);

    expect(categoryName(db, 'blank')).toBe('');
  });

  it('keeps both same-type categories whose stripped names match', () => {
    const db = createDatabaseThrough019();
    insertCategory(db, 'rent_clean', 'Rent');
    insertCategory(db, 'rent_padded', ' Rent ');

    db.exec(migration020().up);

    const count = db
      .prepare("SELECT COUNT(*) AS count FROM categories WHERE name = 'Rent' AND type = 'expense'")
      .get() as { count: number };
    expect(count.count).toBe(2);
  });

  it('keeps a category name of non-breaking spaces as stored', () => {
    const db = createDatabaseThrough019();
    insertCategory(db, 'nbsp', '  ');

    db.exec(migration020().up);

    expect(categoryName(db, 'nbsp')).toBe('  ');
  });

  it('changes nothing on a padded category but its name', () => {
    const db = createDatabaseThrough019();
    insertCategory(db, 'padded', ' Food ');
    const select = 'SELECT icon, color, sort_order, updated_at FROM categories WHERE id = ?';
    const before = db.prepare(select).get('padded') as Omit<CategoryRow, 'id' | 'name'>;

    db.exec(migration020().up);

    expect(db.prepare(select).get('padded')).toEqual(before);
  });

  it('strips a commitment name and changes nothing else on the row', () => {
    const db = createDatabaseThrough019();
    insertCommitment(db, 'rent', ' Rent ');

    db.exec(migration020().up);

    expect(commitmentRow(db, 'rent')).toEqual({ name: 'Rent', amount: 5000, updated_at: UPDATED });
  });

  it('leaves a commitment name of only whitespace empty', () => {
    const db = createDatabaseThrough019();
    insertCommitment(db, 'blank', '   ');

    db.exec(migration020().up);

    expect(commitmentRow(db, 'blank').name).toBe('');
  });

  it('reads the seeded category names the same before and after', () => {
    const db = createDatabaseThrough019();
    const select = 'SELECT id, name FROM categories ORDER BY id';
    const before = db.prepare(select).all() as Pick<CategoryRow, 'id' | 'name'>[];

    db.exec(migration020().up);

    expect(before).toHaveLength(29);
    expect(db.prepare(select).all()).toEqual(before);
  });
});
