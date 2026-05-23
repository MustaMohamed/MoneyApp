import Database from 'better-sqlite3';

import { migration003 } from '@/database/migrations/003_create_categories';

let db: ReturnType<typeof Database>;

beforeEach(() => {
  db = new Database(':memory:');
  db.exec(migration003.up);
});

afterEach(() => db.close());

describe('migration003 — categories table', () => {
  it('creates the categories table', () => {
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='categories'")
      .get();
    expect(row).toBeDefined();
  });

  it('seeds exactly 27 default rows', () => {
    const count = (db.prepare('SELECT COUNT(*) as n FROM categories').get() as { n: number }).n;
    expect(count).toBe(27);
  });

  it('seeds exactly 22 expense defaults', () => {
    const count = (
      db.prepare("SELECT COUNT(*) as n FROM categories WHERE type = 'expense'").get() as {
        n: number;
      }
    ).n;
    expect(count).toBe(22);
  });

  it('seeds exactly 5 income defaults', () => {
    const count = (
      db.prepare("SELECT COUNT(*) as n FROM categories WHERE type = 'income'").get() as {
        n: number;
      }
    ).n;
    expect(count).toBe(5);
  });

  it('marks all seeded rows as is_default = 1', () => {
    const nonDefault = (
      db.prepare('SELECT COUNT(*) as n FROM categories WHERE is_default != 1').get() as {
        n: number;
      }
    ).n;
    expect(nonDefault).toBe(0);
  });

  it('is idempotent — running migration twice does not duplicate rows', () => {
    db.exec(migration003.up); // run again
    const count = (db.prepare('SELECT COUNT(*) as n FROM categories').get() as { n: number }).n;
    expect(count).toBe(27);
  });

  it('has version 3', () => {
    expect(migration003.version).toBe(3);
  });
});
