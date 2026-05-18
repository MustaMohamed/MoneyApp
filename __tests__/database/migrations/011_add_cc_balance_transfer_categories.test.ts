import Database from 'better-sqlite3';
import { migration003 } from '@/database/migrations/003_create_categories';
import { migration011 } from '@/database/migrations/011_add_cc_balance_transfer_categories';

describe('migration011 — seed CC Balance Transfer In/Out categories', () => {
  function freshDb() {
    const db = new Database(':memory:');
    db.exec(migration003.up);
    return db;
  }

  it('inserts the CC Balance Transfer In category as income', () => {
    const db = freshDb();
    db.exec(migration011.up);
    const row = db
      .prepare(
        "SELECT id, name, type, icon, color FROM categories WHERE id = 'cc-balance-transfer-in'",
      )
      .get() as { id: string; name: string; type: string; icon: string; color: string } | undefined;
    expect(row).toEqual({
      id: 'cc-balance-transfer-in',
      name: 'CC Balance Transfer In',
      type: 'income',
      icon: 'swap-horizontal',
      color: '#9B73D4',
    });
    db.close();
  });

  it('inserts the CC Balance Transfer Out category as expense', () => {
    const db = freshDb();
    db.exec(migration011.up);
    const row = db
      .prepare(
        "SELECT id, name, type, icon, color FROM categories WHERE id = 'cc-balance-transfer-out'",
      )
      .get() as { id: string; name: string; type: string; icon: string; color: string } | undefined;
    expect(row).toEqual({
      id: 'cc-balance-transfer-out',
      name: 'CC Balance Transfer Out',
      type: 'expense',
      icon: 'swap-horizontal',
      color: '#9B73D4',
    });
    db.close();
  });

  it('is idempotent — re-running does not duplicate or throw', () => {
    const db = freshDb();
    db.exec(migration011.up);
    expect(() => db.exec(migration011.up)).not.toThrow();
    const rows = db
      .prepare("SELECT id FROM categories WHERE id LIKE 'cc-balance-transfer-%'")
      .all() as { id: string }[];
    expect(rows).toHaveLength(2);
    db.close();
  });
});
