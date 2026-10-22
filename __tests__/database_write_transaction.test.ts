import { performance } from 'node:perf_hooks';

import type { SQLiteDatabase } from 'expo-sqlite';

import {
  getDb,
  withExclusiveWriteTransactionAsync,
  withWriteTransactionAsync,
} from '@/database/client';
import { makeTestPayment } from '@/test_helpers/commitment';
import { asSQLiteDatabase } from '@/test_helpers/sqlite';
import {
  bridgeSQLiteConnections,
  type BridgedConnection,
  type SQLiteConnections,
} from '@/test_helpers/sqlite_connections';

jest.mock('@/database/write_lock', () => ({ WRITE_LOCK_WAIT_MS: 1100 }));

const WAIT_MS = 1100;
const HOLD_WITHIN_BOUND_MS = 100;
const HOLD_PAST_BOUND_MS = 2100;

let connections: SQLiteConnections;
let db: SQLiteDatabase;

beforeAll(async () => {
  connections = bridgeSQLiteConnections();
  connections.inspect.exec('CREATE TABLE lock_probe (id TEXT PRIMARY KEY)');
  db = await getDb();
});

beforeEach(() => {
  connections.inspect.exec(
    'DELETE FROM lock_probe; DELETE FROM lock_holder; DELETE FROM commitment_payments;',
  );
});

afterEach(async () => {
  await connections.settle();
});

afterAll(() => {
  connections.dispose();
});

function committedProbeIds(): string[] {
  return connections.inspect
    .prepare('SELECT id FROM lock_probe ORDER BY id')
    .pluck()
    .all()
    .map(String);
}

async function settingsOf(connection: SQLiteDatabase) {
  return {
    busyTimeout: await connection.getFirstAsync('PRAGMA busy_timeout'),
    foreignKeys: await connection.getFirstAsync('PRAGMA foreign_keys'),
  };
}

function openedSince(count: number): BridgedConnection[] {
  return connections.opened.slice(count);
}

const insertProbe = (connection: SQLiteDatabase, id: string) =>
  connection.runAsync('INSERT INTO lock_probe (id) VALUES (?)', id);

describe('connection settings', () => {
  it('opens the main connection with the one wait bound and foreign keys on', async () => {
    await expect(settingsOf(db)).resolves.toEqual({
      busyTimeout: { timeout: WAIT_MS },
      foreignKeys: { foreign_keys: 1 },
    });
  });

  it('gives an exclusive task a connection with the same wait bound and foreign keys on', async () => {
    let seen: Awaited<ReturnType<typeof settingsOf>> | undefined;

    await withExclusiveWriteTransactionAsync(async (txn) => {
      seen = await settingsOf(txn);
    });

    expect(seen).toEqual({ busyTimeout: { timeout: WAIT_MS }, foreignKeys: { foreign_keys: 1 } });
  });
});

describe('withWriteTransactionAsync', () => {
  it('waits for the lock, then reads the row the holder committed and commits its own write', async () => {
    const lock = await connections.holdWriteLock(HOLD_WITHIN_BOUND_MS);
    let holderRows: unknown;

    await withWriteTransactionAsync(db, async () => {
      holderRows = await db.getAllAsync('SELECT held_ms FROM lock_holder');
      await insertProbe(db, 'after-read');
    });
    await lock.released;

    expect(holderRows).toEqual([{ held_ms: HOLD_WITHIN_BOUND_MS }]);
    expect(committedProbeIds()).toEqual(['after-read']);
  });

  it('rejects with SQLITE_BUSY past the bound, runs no task and writes nothing', async () => {
    const lock = await connections.holdWriteLock(HOLD_PAST_BOUND_MS);
    const task = jest.fn(() => insertProbe(db, 'blocked').then(() => undefined));

    await expect(withWriteTransactionAsync(db, task)).rejects.toMatchObject({
      code: 'SQLITE_BUSY',
    });
    await lock.released;

    expect(task).not.toHaveBeenCalled();
    expect(committedProbeIds()).toEqual([]);
    await insertProbe(db, 'next-write');
    expect(committedProbeIds()).toEqual(['next-write']);
  });

  it('rolls back every write of a task that throws, as its own connection reads it', async () => {
    const failure = new Error('task failed');

    await expect(
      withWriteTransactionAsync(db, async () => {
        await insertProbe(db, 'rolled-back');
        throw failure;
      }),
    ).rejects.toBe(failure);

    await expect(db.getAllAsync('SELECT id FROM lock_probe')).resolves.toEqual([]);
  });

  it('rejects with the task error when SQLite already rolled the transaction back', async () => {
    const failure = new Error('task failed');

    await expect(
      withWriteTransactionAsync(db, async () => {
        await insertProbe(db, 'rolled-back');
        await db.execAsync('ROLLBACK');
        throw failure;
      }),
    ).rejects.toBe(failure);

    expect(committedProbeIds()).toEqual([]);
  });

  it('rejects with the rollback failure when ROLLBACK fails and the transaction stays open', async () => {
    const failure = new Error('task failed');
    const rollbackFailure = new Error('rollback failed');
    const failingRollback = asSQLiteDatabase({
      execAsync: (source: string) =>
        source === 'ROLLBACK' ? Promise.reject(rollbackFailure) : db.execAsync(source),
      isInTransactionAsync: () => db.isInTransactionAsync(),
    });

    try {
      const rejection = withWriteTransactionAsync(failingRollback, async () => {
        await insertProbe(db, 'left-open');
        throw failure;
      });

      await expect(rejection).rejects.not.toBe(failure);
      await expect(rejection).rejects.toMatchObject({ cause: rollbackFailure });
      await expect(db.isInTransactionAsync()).resolves.toBe(true);
    } finally {
      await db.execAsync('ROLLBACK');
    }
    expect(committedProbeIds()).toEqual([]);
  });
});

describe("while another caller's read is open on the main connection", () => {
  const openReads: [string, (connection: SQLiteDatabase) => Promise<unknown>, unknown][] = [
    [
      'getAllAsync',
      (connection) => connection.getAllAsync('SELECT id FROM lock_probe'),
      [{ id: 'seeded' }],
    ],
    [
      'getFirstAsync',
      (connection) => connection.getFirstAsync('SELECT id FROM lock_probe'),
      { id: 'seeded' },
    ],
  ];

  beforeEach(() => {
    connections.inspect.prepare('INSERT INTO lock_probe (id) VALUES (?)').run('seeded');
  });

  it.each(openReads)(
    'a write transaction behind an open %s waits for the lock and commits',
    async (_read, read, seen) => {
      const lock = await connections.holdWriteLock(HOLD_WITHIN_BOUND_MS);
      const reading = read(db);

      await withWriteTransactionAsync(db, () => insertProbe(db, 'written').then(() => undefined));
      await lock.released;

      await expect(reading).resolves.toEqual(seen);
      expect(committedProbeIds()).toEqual(['seeded', 'written']);
    },
  );

  it.each(openReads)(
    'an autocommit write behind an open %s waits for the lock and commits',
    async (_read, read, seen) => {
      const lock = await connections.holdWriteLock(HOLD_WITHIN_BOUND_MS);
      const reading = read(db);

      await insertProbe(db, 'written');
      await lock.released;

      await expect(reading).resolves.toEqual(seen);
      expect(committedProbeIds()).toEqual(['seeded', 'written']);
    },
  );

  it('a rejected call does not hold back the next one', async () => {
    const failing = db.runAsync('INSERT INTO no_such_table (id) VALUES (1)');
    const next = db.getFirstAsync('SELECT 1 AS one');

    await expect(failing).rejects.toThrow('no such table');
    await expect(next).resolves.toEqual({ one: 1 });
  });
});

describe('an autocommit write on the main connection', () => {
  it('waits the bound, then rejects with SQLITE_BUSY and writes nothing', async () => {
    const lock = await connections.holdWriteLock(HOLD_PAST_BOUND_MS);
    const started = performance.now();

    await expect(insertProbe(db, 'autocommit')).rejects.toMatchObject({ code: 'SQLITE_BUSY' });
    const waited = performance.now() - started;
    await lock.released;

    expect(waited).toBeGreaterThanOrEqual(WAIT_MS - 50);
    expect(committedProbeIds()).toEqual([]);
  });
});

describe('withExclusiveWriteTransactionAsync', () => {
  it('rejects with SQLITE_BUSY past the bound, writes nothing and closes its connection once', async () => {
    const before = connections.opened.length;
    const lock = await connections.holdWriteLock(HOLD_PAST_BOUND_MS);
    const task = jest.fn((txn: SQLiteDatabase) =>
      insertProbe(txn, 'blocked').then(() => undefined),
    );

    await expect(withExclusiveWriteTransactionAsync(task)).rejects.toMatchObject({
      code: 'SQLITE_BUSY',
    });
    await lock.released;

    expect(task).not.toHaveBeenCalled();
    expect(committedProbeIds()).toEqual([]);
    const exclusive = openedSince(before);
    expect(exclusive.map((connection) => connection.options)).toEqual([
      expect.objectContaining({ useNewConnection: true }),
    ]);
    expect(exclusive[0].closeAsync).toHaveBeenCalledTimes(1);
  });

  it('rolls back every write of a task that throws and closes its connection', async () => {
    const before = connections.opened.length;
    const failure = new Error('task failed');

    await expect(
      withExclusiveWriteTransactionAsync(async (txn) => {
        await insertProbe(txn, 'rolled-back');
        throw failure;
      }),
    ).rejects.toBe(failure);

    expect(committedProbeIds()).toEqual([]);
    const exclusive = openedSince(before);
    expect(exclusive).toHaveLength(1);
    expect(exclusive[0].closeAsync).toHaveBeenCalledTimes(1);
  });

  it('fails on a broken foreign key and writes nothing, as the main connection does', async () => {
    const orphan = makeTestPayment({ id: 'orphan', commitment_id: 'no-such-commitment' });
    const columns = Object.keys(orphan);
    const insertOrphan = (connection: SQLiteDatabase) =>
      connection.runAsync(
        `INSERT INTO commitment_payments (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`,
        Object.values(orphan),
      );

    await expect(insertOrphan(db)).rejects.toMatchObject({ code: 'SQLITE_CONSTRAINT_FOREIGNKEY' });
    await expect(
      withExclusiveWriteTransactionAsync(async (txn) => {
        await insertOrphan(txn);
      }),
    ).rejects.toMatchObject({ code: 'SQLITE_CONSTRAINT_FOREIGNKEY' });

    expect(
      connections.inspect.prepare('SELECT COUNT(*) FROM commitment_payments').pluck().get(),
    ).toBe(0);
  });
});
