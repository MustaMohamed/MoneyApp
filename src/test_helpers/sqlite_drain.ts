import type Database from 'better-sqlite3';

type SqliteHandle = ReturnType<typeof Database>;

/**
 * Shared registry + drain for suites that open raw better-sqlite3 handles.
 *
 * Call once at suite module scope and push every `new Database(':memory:')`
 * onto the returned array. The installed hook is afterEach, not afterAll:
 * a test that throws mid-body still drains its handle here.
 */
export function registerOpenDbsDrain(): SqliteHandle[] {
  const openDbs: SqliteHandle[] = [];

  afterEach(() => {
    const drained = openDbs.splice(0);
    const closeFailures: unknown[] = [];
    for (const db of drained) {
      try {
        db.close();
      } catch (err) {
        closeFailures.push(err);
      }
    }
    // The throws below are unreachable on green; they preserve stack fidelity when it fails.
    const stranded = drained.flatMap((db, i) => (db.open ? [i] : []));
    expect({ stranded, closeErrors: closeFailures.map(String) }).toEqual({
      stranded: [],
      closeErrors: [],
    });
    if (closeFailures.length === 1) throw closeFailures[0];
    if (closeFailures.length > 1) throw new AggregateError(closeFailures);
  });

  return openDbs;
}
